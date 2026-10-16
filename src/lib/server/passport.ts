import "server-only";
import type { Query } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { computePassport, type Passport } from "@/lib/passport";
import type { Club, Collaboration, CollabRequest, Feedback, Task } from "@/lib/types";

const chunk = <T>(xs: T[], n = 30) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

async function fetchIn<T>(build: (ids: string[]) => Query, ids: string[]): Promise<T[]> {
  const snaps = await Promise.all(chunk(ids).map((c) => build(c).get()));
  const byId = new Map<string, T>();
  for (const s of snaps) for (const d of s.docs) byId.set(d.id, { id: d.id, ...d.data() } as T);
  return [...byId.values()];
}

/** Loads the evidence for several clubs in a handful of queries and computes their Passports. */
export async function getPassports(clubIds: string[], clubs?: Record<string, Club>): Promise<Record<string, Passport>> {
  const ids = [...new Set(clubIds)];
  if (!ids.length) return {};
  const db = adminDb();

  const allClubs =
    clubs ??
    Object.fromEntries((await db.collection("clubs").get()).docs.map((d) => [d.id, { id: d.id, ...d.data() } as Club]));

  const [collaborations, feedback, incomingRequests] = await Promise.all([
    fetchIn<Collaboration>((c) => db.collection("collaborations").where("clubIds", "array-contains-any", c), ids),
    fetchIn<Feedback>((c) => db.collection("feedback").where("toClubId", "in", c), ids),
    fetchIn<CollabRequest>((c) => db.collection("collabRequests").where("toClubId", "in", c), ids),
  ]);
  const collabIds = collaborations.map((c) => c.id);
  const tasks = collabIds.length ? await fetchIn<Task>((c) => db.collection("tasks").where("collabId", "in", c), collabIds) : [];

  const clubNames = Object.fromEntries(Object.values(allClubs).map((c) => [c.id, c.name]));
  const now = new Date();
  const out: Record<string, Passport> = {};
  for (const id of ids) {
    const club = allClubs[id];
    if (!club) continue;
    out[id] = computePassport({ club, collaborations, tasks, feedback, incomingRequests, clubNames, now });
  }
  return out;
}
