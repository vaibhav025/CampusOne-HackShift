import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { domainMatches, HttpError, requireUser } from "@/lib/server/auth";
import { body, route } from "@/lib/server/route";

/** Join an existing club as a member. Only allowed when the email domain matches the club's college. */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { clubId } = await body(req, z.object({ clubId: z.string().min(1) }));
  const db = adminDb();
  const userRef = db.collection("users").doc(user.uid);
  if ((await userRef.get()).data()?.clubId) throw new HttpError(409, "You already belong to a club");

  const clubRef = db.collection("clubs").doc(clubId);
  const club = (await clubRef.get()).data();
  if (!club) throw new HttpError(404, "Club not found");
  if (!domainMatches(user.email, club.collegeDomain)) {
    throw new HttpError(403, `Use your @${club.collegeDomain} email to join this club`);
  }
  await clubRef.update({ memberCount: FieldValue.increment(1) });
  await userRef.update({ clubId, role: "member" });
  return { ok: true };
});
