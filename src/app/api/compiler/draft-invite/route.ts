import { z } from "zod";
import { INVITE_PROMPT } from "@/lib/compiler/prompts";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { llmJSON, LLMError } from "@/lib/server/llm";
import { body, route } from "@/lib/server/route";
import { formatDate } from "@/lib/utils";
import { CAPABILITY_LABELS, type CompilerRequest, type Match } from "@/lib/types";

const inviteSchema = z.object({ subject: z.string().min(3).max(150), message: z.string().min(20).max(1500) });

/** LLM call #3: drafts a personalised invite for one match. Organizer edits before sending. */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const { reqId, matchId } = await body(req, z.object({ reqId: z.string(), matchId: z.string() }));
  const db = adminDb();
  const reqRef = db.collection("compilerRequests").doc(reqId);
  const [reqSnap, matchSnap] = await Promise.all([reqRef.get(), reqRef.collection("matches").doc(matchId).get()]);
  const request = reqSnap.data() as CompilerRequest | undefined;
  const match = matchSnap.data() as Match | undefined;
  if (!request || request.clubId !== club.id || !match) throw new HttpError(404, "Match not found");

  const p = request.parsed;
  const need = p.needs.find((n) => n.id === match.needId);
  if (!need) throw new HttpError(404, "Need no longer exists; re-run matching");
  const partner = match.snapshot;
  const when = p.date ? formatDate(p.date) : "a date to be confirmed";

  try {
    return await llmJSON({
      system: INVITE_PROMPT,
      user: `From: ${club.name}, ${club.college}
To: ${partner.clubName}, ${partner.college}
Event: ${p.eventTitle} (${p.eventType}) on ${when}${p.city ? ` in ${p.city}` : ""}${p.expectedSize ? `, ${p.expectedSize} participants` : ""}
Needed from them: ${CAPABILITY_LABELS[need.type]} — ${need.detail} (they offer: "${partner.capabilityTitle}")
Why they were chosen (these are facts about ${partner.clubName}, the RECIPIENT, not about ${club.name}): ${match.reasons.join(" ")}
Write from ${club.name}'s point of view. When mentioning the facts above, attribute them to the recipient ("your …"), never to the sender ("our …").`,
      schema: inviteSchema,
    });
  } catch (e) {
    if (!(e instanceof LLMError)) throw e;
    return {
      subject: `Collaboration invite: ${p.eventTitle}`,
      message: `Hi ${partner.clubName} team,

${club.name} from ${club.college} is organising ${p.eventTitle} on ${when}${p.expectedSize ? ` for ${p.expectedSize} participants` : ""}. We're looking for ${need.detail.toLowerCase()} and your "${partner.capabilityTitle}" looks like a great fit. ${match.reasons[0] ?? ""}

Would you be open to partnering with us? If yes, accept this request on CampusOne and we'll set up a quick call.

Thanks,
${club.name}`,
      generatedBy: "fallback",
    };
  }
});
