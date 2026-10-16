import { z } from "zod";
import { RERANK_PROMPT } from "@/lib/compiler/prompts";
import { adminDb } from "@/lib/firebase/admin";
import { factReasons, needText, scoreCandidates, type ScoredCandidate } from "@/lib/matching";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { capabilityText, embedTexts, llmJSON, LLMError } from "@/lib/server/llm";
import { getPassports } from "@/lib/server/passport";
import { body, route } from "@/lib/server/route";
import type { Capability, Club, CompilerRequest, Need, ParsedRequest } from "@/lib/types";

const rerankSchema = z.object({
  ranked: z.array(z.object({ capabilityId: z.string(), reasons: z.array(z.string().min(1)).min(1).max(3) })).min(1),
});

/** Step 5: LLM rerank of the top 5 into the best 3 with fact-based reasons; deterministic fallback. */
async function rerank(need: Need, parsed: ParsedRequest, top: ScoredCandidate[], pastEvents: Record<string, string[]>) {
  const fallback = () => ({
    picked: top.slice(0, 3).map((c) => ({ candidate: c, reasons: factReasons(c, parsed) })),
    rankedBy: "score" as const,
  });
  if (top.length === 0) return fallback();

  const candidates = top.map((c) => ({
    capabilityId: c.capability.id,
    club: c.club.name,
    college: c.club.college,
    city: c.capability.city,
    offering: c.capability.title,
    description: c.capability.description,
    capacity: c.capability.capacity ?? null,
    scores: c.scores,
    passport: {
      verified: c.club.verified,
      completedCollaborations: c.passport.collaborations.completed,
      abandonedCollaborations: c.passport.collaborations.abandoned,
      onTimeTaskRate: c.passport.onTime.rate == null ? null : Math.round(c.passport.onTime.rate * 100) + "%",
      partnerRating: c.passport.rating.average,
    },
    pastEvents: (pastEvents[c.club.id] ?? []).slice(0, 4),
  }));
  try {
    const res = await llmJSON({
      system: RERANK_PROMPT,
      user: `Event: ${parsed.eventTitle} (${parsed.eventType}), ${parsed.date ?? "date TBD"}, ${parsed.city ?? ""}, ${parsed.expectedSize ?? "?"} people, ${parsed.mode ?? ""}
Need: ${need.type} — ${need.detail}
Candidates (with computed scores and passport metrics): ${JSON.stringify(candidates)}`,
      schema: rerankSchema,
    });
    const byCap = new Map(top.map((c) => [c.capability.id, c]));
    const seen = new Set<string>();
    const picked = res.ranked
      .filter((r) => byCap.has(r.capabilityId) && !seen.has(r.capabilityId) && seen.add(r.capabilityId))
      .slice(0, 3)
      .map((r) => ({ candidate: byCap.get(r.capabilityId)!, reasons: r.reasons.slice(0, 2).map((s) => s.trim()) }));
    // Top up from the scored list if the model returned fewer than 3 valid ids.
    for (const c of top) {
      if (picked.length >= 3) break;
      if (!seen.has(c.capability.id)) picked.push({ candidate: c, reasons: factReasons(c, parsed) });
    }
    return { picked, rankedBy: "llm" as const };
  } catch (e) {
    if (!(e instanceof LLMError)) throw e;
    console.warn("[compiler/match] rerank fallback:", e.message);
    return fallback();
  }
}

/** Steps 1-5 of the Collaboration Compiler pipeline (spec Section 9). */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const { reqId } = await body(req, z.object({ reqId: z.string().min(1) }));
  const db = adminDb();
  const reqRef = db.collection("compilerRequests").doc(reqId);
  const request = (await reqRef.get()).data() as CompilerRequest | undefined;
  if (!request || request.clubId !== club.id) throw new HttpError(404, "Request not found");
  const parsed = request.parsed;
  if (!parsed.needs.length) throw new HttpError(400, "Add at least one need first");

  // Step 1 inputs: candidate capabilities of the needed types (filtered precisely in scoreCandidates).
  const types = [...new Set(parsed.needs.map((n) => n.type))];
  const [capSnap, clubSnap] = await Promise.all([
    db.collection("capabilities").where("type", "in", types).get(),
    db.collection("clubs").get(),
  ]);
  const capabilities = capSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Capability).filter((c) => c.active);
  const clubs = Object.fromEntries(clubSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Club]));

  // Reliability comes from the Trust Passport of every candidate club.
  const passports = await getPassports([...new Set(capabilities.map((c) => c.clubId))], clubs);
  const metrics = Object.fromEntries(Object.entries(passports).map(([id, p]) => [id, p.metrics]));
  const pastEvents = Object.fromEntries(
    Object.entries(passports).map(([id, p]) => [id, p.evidence.collaborations.filter((c) => c.status === "completed").map((c) => c.title)]),
  );

  // Semantic step: embed needs, and lazily embed any capability that lacks a vector.
  const missing = capabilities.filter((c) => !c.embedding?.length);
  const [needVectors, capVectors] = await Promise.all([
    embedTexts(parsed.needs.map((n) => needText(n, parsed))),
    missing.length ? embedTexts(missing.map((c) => capabilityText(c))) : Promise.resolve([] as number[][]),
  ]);
  if (needVectors && capVectors?.length) {
    const batch = db.batch();
    missing.forEach((c, i) => {
      c.embedding = capVectors[i];
      batch.update(db.collection("capabilities").doc(c.id), { embedding: capVectors[i] });
    });
    await batch.commit().catch((e) => console.warn("[compiler/match] could not cache embeddings", e));
  }

  // Steps 2-5 per need, in parallel.
  const results = await Promise.all(
    parsed.needs.map(async (need, i) => {
      const top = scoreCandidates({
        need,
        parsed,
        requestingClubId: club.id,
        capabilities,
        clubs,
        passports: metrics,
        needEmbedding: needVectors?.[i] ?? null,
      });
      const { picked, rankedBy } = await rerank(need, parsed, top, pastEvents);
      return { need, picked, rankedBy };
    }),
  );

  // Replace previous matches.
  const matchesCol = reqRef.collection("matches");
  const old = await matchesCol.get();
  const batch = db.batch();
  old.docs.forEach((d) => batch.delete(d.ref));
  for (const { need, picked, rankedBy } of results) {
    picked.forEach(({ candidate: c, reasons }, rank) => {
      batch.set(matchesCol.doc(`${need.id}--${c.capability.id}`), {
        needId: need.id,
        clubId: c.club.id,
        capabilityId: c.capability.id,
        scores: c.scores,
        reasons,
        rank: rank + 1,
        rankedBy,
        semanticMethod: c.semanticMethod,
        // Display snapshot taken at match time; the live Passport is one click away.
        snapshot: {
          clubName: c.club.name,
          college: c.club.college,
          verified: c.club.verified,
          capabilityTitle: c.capability.title,
          capabilityCity: c.capability.city,
          capacity: c.capability.capacity ?? null,
          completed: c.passport.collaborations.completed,
          abandoned: c.passport.collaborations.abandoned,
          onTimeRate: c.passport.onTime.rate,
          rating: c.passport.rating.average,
          risk: c.risk,
        },
      });
    });
  }
  batch.update(reqRef, { status: request.status === "invites_sent" ? "invites_sent" : "matched", matchedAt: new Date() });
  await batch.commit();

  return {
    matchesByNeed: Object.fromEntries(
      results.map(({ need, picked, rankedBy }) => [
        need.id,
        { rankedBy, matches: picked.map(({ candidate: c, reasons }) => ({ clubId: c.club.id, capabilityId: c.capability.id, scores: c.scores, reasons })) },
      ]),
    ),
  };
});
