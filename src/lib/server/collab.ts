import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/server/auth";
import type { Collaboration } from "@/lib/types";

/** Loads a collaboration and checks the caller's club is part of it. */
export async function requireCollabMember(collabId: string, clubId: string) {
  const ref = adminDb().collection("collaborations").doc(collabId);
  const snap = await ref.get();
  const collab = snap.exists ? ({ id: snap.id, ...snap.data() } as Collaboration) : null;
  if (!collab || !collab.clubIds.includes(clubId)) throw new HttpError(404, "Collaboration not found");
  return { ref, collab };
}
