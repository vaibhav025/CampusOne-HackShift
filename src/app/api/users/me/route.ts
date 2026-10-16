import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { route } from "@/lib/server/route";

/**
 * Upserts the signed-in user's profile. If the user has no club yet and a
 * club lists their email in `adminEmails` (seeded demo accounts), they are
 * attached to that club as admin.
 */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const db = adminDb();
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      uid: user.uid,
      name: user.name,
      email: user.email,
      photoURL: user.picture,
      clubId: null,
      role: "member",
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.update({ name: user.name, photoURL: user.picture });
  }

  const current = (await ref.get()).data()!;
  if (!current.clubId && user.email) {
    const match = await db.collection("clubs").where("adminEmails", "array-contains", user.email).limit(1).get();
    if (!match.empty) {
      const clubRef = match.docs[0].ref;
      await clubRef.update({ adminUids: FieldValue.arrayUnion(user.uid) });
      await ref.update({ clubId: clubRef.id, role: "admin" });
    }
  }
  return { ok: true };
});
