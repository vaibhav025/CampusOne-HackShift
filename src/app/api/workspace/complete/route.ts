import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { requireCollabMember } from "@/lib/server/collab";
import { renderEmail, sendEmail } from "@/lib/server/email";
import { notify } from "@/lib/server/notify";
import { body, route } from "@/lib/server/route";
import type { Club } from "@/lib/types";

/** Host marks the collaboration complete; every club is asked for feedback (in-app + email). */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const { collabId } = await body(req, z.object({ collabId: z.string().min(1) }));
  const { ref, collab } = await requireCollabMember(collabId, club.id);
  if (collab.hostClubId !== club.id) throw new HttpError(403, "Only the host club can finish a collaboration");
  if (collab.status !== "ongoing") throw new HttpError(409, `Already ${collab.status}`);

  const db = adminDb();
  const batch = db.batch();
  batch.update(ref, { status: "completed", endedAt: FieldValue.serverTimestamp() });
  for (const id of collab.clubIds) {
    notify(id, "feedback_requested", `How was ${collab.title}? Leave feedback for your partners`, `/workspaces/${collabId}/feedback`, batch);
  }
  await batch.commit();

  const clubs = await Promise.all(collab.clubIds.map(async (id) => (await db.collection("clubs").doc(id).get()).data() as Club));
  await sendEmail({
    to: clubs.map((c) => c?.contactEmail).filter(Boolean),
    subject: `${collab.title} is done. How did it go?`,
    text: `${collab.title} was marked complete. Leave feedback for your partner clubs: /workspaces/${collabId}/feedback`,
    html: renderEmail({
      heading: `${collab.title} is done`,
      paragraphs: ["Thanks for working together. Two minutes of feedback helps every club's Trust Passport stay honest."],
      buttonText: "Leave feedback",
      buttonPath: `/workspaces/${collabId}/feedback`,
    }),
  });
  return { ok: true };
});
