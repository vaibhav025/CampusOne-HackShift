import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { requireCollabMember } from "@/lib/server/collab";
import { body, route } from "@/lib/server/route";

const schema = z.object({
  collabId: z.string().min(1),
  entries: z
    .array(
      z.object({
        toClubId: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(1000).default(""),
        wouldCollabAgain: z.boolean(),
      }),
    )
    .min(1),
});

/** Post-collaboration feedback. One doc per (collab, from, to), so resubmitting edits it. */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const { collabId, entries } = await body(req, schema);
  const { collab } = await requireCollabMember(collabId, club.id);
  if (collab.status !== "completed") throw new HttpError(409, "Feedback opens once the collaboration is finished");

  const db = adminDb();
  const batch = db.batch();
  for (const e of entries) {
    if (e.toClubId === club.id || !collab.clubIds.includes(e.toClubId)) throw new HttpError(400, "You can only rate partner clubs");
    batch.set(db.collection("feedback").doc(`${collabId}--${club.id}--${e.toClubId}`), {
      collabId,
      fromClubId: club.id,
      ...e,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return { ok: true };
});
