import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireClubAdmin } from "@/lib/server/auth";
import { body, route } from "@/lib/server/route";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(3000).default(""),
  date: z.string().refine((s) => !isNaN(Date.parse(s)), "Invalid date"),
  city: z.string().trim().min(2).max(60),
  mode: z.enum(["offline", "online", "hybrid"]),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10).default([]),
  collabId: z.string().optional(),
});

/** Create an event hosted by my club (and by all clubs of the collaboration, if linked). */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const input = await body(req, schema);
  const db = adminDb();
  let hostClubIds = [club.id];
  if (input.collabId) {
    const collab = (await db.collection("collaborations").doc(input.collabId).get()).data();
    if (collab?.clubIds?.includes(club.id)) hostClubIds = collab.clubIds;
  }
  const ref = db.collection("events").doc();
  await ref.set({
    ...input,
    collabId: input.collabId ?? null,
    date: new Date(input.date),
    hostClubIds,
    rsvpCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
});
