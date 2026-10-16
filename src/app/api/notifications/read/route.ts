import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireClubMember } from "@/lib/server/auth";
import { body, route } from "@/lib/server/route";

/** Marks the given notifications (belonging to my club) as read. */
export const POST = route(async (req) => {
  const { club } = await requireClubMember(req);
  const { ids } = await body(req, z.object({ ids: z.array(z.string()).max(100) }));
  const db = adminDb();
  const snaps = await Promise.all(ids.map((id) => db.collection("notifications").doc(id).get()));
  const batch = db.batch();
  snaps.filter((s) => s.data()?.clubId === club.id).forEach((s) => batch.update(s.ref, { read: true }));
  await batch.commit();
  return { ok: true };
});
