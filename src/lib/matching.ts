// Explainable matching engine (spec Section 9). Pure functions so the scoring
// can be unit-tested against the seed data without Firestore or an LLM.
import { toDate } from "@/lib/utils";
import type { Capability, Club, Need, ParsedRequest } from "@/lib/types";
import type { PassportMetrics } from "@/lib/passport";

export const WEIGHTS = { semantic: 0.55, logistics: 0.25, reliability: 0.2 } as const;

const STOPWORDS = new Set(
  "a an and are as at be by for from has have in is it of on or our that the their this to we with need needs needed hour hours day days participants people students event events club clubs".split(" "),
);

export function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .map((w) => w.replace(/(ies)$/, "y").replace(/(?<=[a-z]{3})s$/, ""))
      .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Text that describes one need in context, used for both embedding and tag overlap. */
export function needText(need: Need, parsed: ParsedRequest) {
  return `${need.type.replace("_", " ")}: ${need.detail}. Event: ${parsed.eventTitle} (${parsed.eventType}).`;
}

/**
 * Semantic score in 0..1.
 * - Embeddings: cosine is rescaled from the typical 0.2..0.9 band so differences are visible.
 * - Fallback: Jaccard overlap of capability tags+title with need+event words, square-root
 *   rescaled so a few shared keywords aren't crushed toward zero.
 */
export function semanticScore(
  need: Need,
  parsed: ParsedRequest,
  cap: Pick<Capability, "title" | "description" | "tags" | "embedding">,
  needEmbedding?: number[] | null,
): { value: number; method: "embedding" | "tags" } {
  if (needEmbedding && cap.embedding?.length) {
    return { value: round2(clamp01((cosine(needEmbedding, cap.embedding) - 0.2) / 0.7)), method: "embedding" };
  }
  const needWords = tokens(`${needText(need, parsed)}`);
  const capWords = tokens(`${cap.tags.join(" ")} ${cap.title}`);
  return { value: round2(clamp01(Math.sqrt(jaccard(needWords, capWords)) * 1.15)), method: "tags" };
}

/** Logistics: 0.5 for same city (always for online events) + 0.5 if the date fits the availability window. */
export function logisticsScore(cap: Pick<Capability, "city" | "availableFrom" | "availableTo">, parsed: ParsedRequest) {
  const sameCity = parsed.mode === "online" || !parsed.city || cap.city.toLowerCase() === parsed.city.toLowerCase();
  const from = toDate(cap.availableFrom);
  const to = toDate(cap.availableTo);
  const event = parsed.date ? new Date(`${parsed.date}T12:00:00`) : null;
  const inWindow = (!from && !to) || !event || ((!from || from <= event) && (!to || to >= event));
  return (sameCity ? 0.5 : 0) + (inWindow ? 0.5 : 0);
}

/** Step 1 hard filters. Returns a reason string when excluded (useful for debugging), else null. */
export function hardFilter(cap: Capability, need: Need, parsed: ParsedRequest, requestingClubId: string): string | null {
  if (cap.type !== need.type) return "type";
  if (!cap.active) return "inactive";
  if (cap.clubId === requestingClubId) return "own club";
  const from = toDate(cap.availableFrom);
  const to = toDate(cap.availableTo);
  if (parsed.date && from && to) {
    const event = new Date(`${parsed.date}T12:00:00`);
    if (to < event || from > event) return "unavailable on event date";
  }
  if (cap.type === "venue" && parsed.expectedSize && cap.capacity && cap.capacity < parsed.expectedSize) return "capacity too small";
  return null;
}

export function finalScore(s: { semantic: number; logistics: number; reliability: number }) {
  return round2(WEIGHTS.semantic * s.semantic + WEIGHTS.logistics * s.logistics + WEIGHTS.reliability * s.reliability);
}

export interface ScoredCandidate {
  capability: Capability;
  club: Club;
  passport: PassportMetrics;
  scores: { semantic: number; logistics: number; reliability: number; final: number };
  semanticMethod: "embedding" | "tags";
  risk: boolean;
}

/** Steps 1-4 (before LLM rerank): filter, score and keep the top `limit` per need. */
export function scoreCandidates({
  need,
  parsed,
  requestingClubId,
  capabilities,
  clubs,
  passports,
  needEmbedding,
  limit = 5,
}: {
  need: Need;
  parsed: ParsedRequest;
  requestingClubId: string;
  capabilities: Capability[];
  clubs: Record<string, Club>;
  passports: Record<string, PassportMetrics>;
  needEmbedding?: number[] | null;
  limit?: number;
}): ScoredCandidate[] {
  const scored = capabilities
    .filter((c) => clubs[c.clubId] && passports[c.clubId] && !hardFilter(c, need, parsed, requestingClubId))
    .map((c) => {
      const sem = semanticScore(need, parsed, c, needEmbedding);
      const passport = passports[c.clubId];
      const parts = { semantic: sem.value, logistics: logisticsScore(c, parsed), reliability: round2(passport.reliability) };
      return {
        capability: c,
        club: clubs[c.clubId],
        passport,
        scores: { ...parts, final: finalScore(parts) },
        semanticMethod: sem.method,
        risk: passport.caution,
      };
    })
    .sort((a, b) => b.scores.final - a.scores.final);

  // One capability per club per need: keep each club's best offering.
  const seen = new Set<string>();
  return scored.filter((s) => !seen.has(s.club.id) && seen.add(s.club.id)).slice(0, limit);
}

/** Deterministic, fact-based reasons used when the LLM rerank is unavailable. */
// The offering and track record are shown next to these reasons, so reasons say something new:
// which listed tags matched, whether it fits the size, and where it is.
export function factReasons(c: ScoredCandidate, parsed: ParsedRequest): string[] {
  const reasons: string[] = [];
  const needWords = tokens(`${parsed.eventTitle} ${parsed.eventType} ${parsed.needs.map((n) => n.detail).join(" ")}`);
  const shared = c.capability.tags.filter((t) => [...tokens(t)].some((w) => needWords.has(w)));
  if (c.capability.capacity && parsed.expectedSize) {
    reasons.push(`Seats ${c.capability.capacity}, room for your ${parsed.expectedSize} with ${c.capability.capacity - parsed.expectedSize} to spare.`);
  }
  if (shared.length) reasons.push(`Listed for ${shared.slice(0, 3).join(", ")}.`);
  if (parsed.city && c.capability.city.toLowerCase() === parsed.city.toLowerCase()) reasons.push(`Also in ${c.capability.city}, so no travel for either team.`);
  else if (parsed.mode === "online") reasons.push("Your event is online, so distance doesn't matter.");
  if (reasons.length < 2 && c.passport.collaborations.completed === 0 && c.club.verified) reasons.push("Verified and new, so they get a neutral track-record score.");
  return reasons.slice(0, 2);
}
