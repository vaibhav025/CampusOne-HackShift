import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireUser } from "@/lib/server/auth";
import { route } from "@/lib/server/route";

/** Toggles the signed-in user's RSVP. The RSVP records their college for "reached N colleges". */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  const db = adminDb();
  const eventRef = db.collection("events").doc(id);
  const rsvpRef = eventRef.collection("rsvps").doc(user.uid);

  const profile = (await db.collection("users").doc(user.uid).get()).data();
  const club = profile?.clubId ? (await db.collection("clubs").doc(profile.clubId).get()).data() : null;
  const college = club?.college ?? user.email.split("@")[1] ?? "Unknown";

  const going = await db.runTransaction(async (tx) => {
    const [event, rsvp] = await Promise.all([tx.get(eventRef), tx.get(rsvpRef)]);
    if (!event.exists) throw new HttpError(404, "Event not found");
    if (rsvp.exists) {
      tx.delete(rsvpRef);
      tx.update(eventRef, { rsvpCount: FieldValue.increment(-1) });
      return false;
    }
    tx.set(rsvpRef, { uid: user.uid, college, createdAt: FieldValue.serverTimestamp() });
    tx.update(eventRef, { rsvpCount: FieldValue.increment(1) });
    return true;
  });
  return { going };
});
