/**
 * End-to-end test of the backend, driving the full demo flow through the HTTP
 * API as real signed-in users.
 *
 *   Emulators:      npm run dev:local   then  npm run test:e2e
 *   Real Firebase:  npm run test:e2e:real   (starts nothing; run `npm run dev` first)
 *
 * Real mode signs in throwaway users (…@campusone.test) via custom tokens, so it
 * never creates accounts for real people. Seed with them as demo admins first;
 * the npm script does that and restores the normal seed afterwards.
 */
import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const REAL = process.env.E2E_TARGET === "real";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMULATOR_AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

if (REAL) {
  config({ path: ".env.local", quiet: true });
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
} else {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  initializeApp({ projectId: "demo-campusone" });
}
const db = getFirestore();

const HOST = REAL
  ? { email: "e2e.host@campusone.test", name: "E2E Host" }
  : { email: "vaibhav.04816401525@std.ggsipu.ac.in", name: "Vaibhav Singla" };
const PARTNER = REAL
  ? { email: "e2e.partner@campusone.test", name: "E2E Partner" }
  : { email: "rohan.01916401525@std.ggsipu.ac.in", name: "Rohan Garg" };
const OUTSIDER = REAL ? { email: "e2e.outsider@campusone.test", name: "E2E Outsider" } : { email: "someone.else@std.ggsipu.ac.in", name: "Outsider" };
const createdUids: string[] = [];

let passed = 0;
let failed = 0;
function check(label: string, ok: unknown, detail?: unknown) {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✓" : "✗"} ${label}${!ok && detail !== undefined ? `  → ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
}

async function signIn(u: { email: string; name: string }) {
  if (REAL) {
    // Real Firebase Auth: create a throwaway user, mint a custom token, exchange it for an ID token.
    const auth = getAuth();
    const user = await auth.getUserByEmail(u.email).catch(() => auth.createUser({ email: u.email, displayName: u.name, emailVerified: true }));
    createdUids.push(user.uid);
    const token = await auth.createCustomToken(user.uid);
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, returnSecureToken: true }),
    });
    const data = await res.json();
    if (!data.idToken) throw new Error(`Sign-in failed for ${u.email}: ${JSON.stringify(data)}`);
    return data.idToken as string;
  }
  const body = { email: u.email, password: "campusone-demo", returnSecureToken: true };
  let res = await fetch(`${EMULATOR_AUTH}/accounts:signUp?key=demo-api-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) res = await fetch(`${EMULATOR_AUTH}/accounts:signInWithPassword?key=demo-api-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!data.idToken) throw new Error(`Sign-in failed for ${u.email}: ${JSON.stringify(data)}`);
  return data.idToken as string;
}

function client(token: string | null) {
  return async <T = Record<string, unknown>>(path: string, opts: { method?: string; body?: unknown } = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return { status: res.status, data };
  };
}

async function main() {
  console.log(`Testing ${BASE}\n`);

  console.log("Auth & onboarding");
  const anon = client(null);
  check("API rejects requests without a token (401)", (await anon("/api/users/me", { method: "POST" })).status === 401);
  const host = client(await signIn(HOST));
  const partner = client(await signIn(PARTNER));
  const outsider = client(await signIn(OUTSIDER));
  for (const c of [host, partner, outsider]) await c("/api/users/me", { method: "POST" });
  const hostUser = (await db.collection("users").where("email", "==", HOST.email).get()).docs[0]?.data();
  const partnerUser = (await db.collection("users").where("email", "==", PARTNER.email).get()).docs[0]?.data();
  check(`${HOST.name} auto-attached as admin of Coding Club`, hostUser?.clubId === "coding-club-ggsipu" && hostUser?.role === "admin", hostUser);
  check(`${PARTNER.name} auto-attached as admin of CyberSec Society`, partnerUser?.clubId === "cybersec-society-nitd", partnerUser);
  const created = await outsider("/api/clubs", {
    body: { name: "E2E Robotics Club", college: "USICT, GGSIPU", collegeDomain: OUTSIDER.email.split("@")[1], city: "Delhi", domains: ["robotics"], contactEmail: OUTSIDER.email },
  });
  check("New user can create a club, verified by email domain", created.status === 200 && created.data.verified === true, created.data);

  console.log("\nCapabilities & events");
  const cap = await outsider("/api/capabilities", {
    body: { type: "venue", title: "Robotics lab, 60 seats", description: "Lab with benches", city: "Delhi", capacity: 60, tags: ["lab", "robotics"] },
  });
  check("Club admin can list a capability", cap.status === 200 && typeof cap.data.id === "string", cap.data);
  const badCap = await outsider("/api/capabilities", { body: { type: "spaceship", title: "x", city: "Delhi" } });
  check("Invalid capability is rejected with 400", badCap.status === 400);
  const ev = await host("/api/events", { body: { title: "E2E Meetup", description: "Test", date: new Date(Date.now() + 7 * 864e5).toISOString(), city: "Delhi", mode: "offline", tags: ["test"] } });
  check("Host can create an event", ev.status === 200, ev.data);
  const rsvp = await partner(`/api/events/${ev.data.id}/rsvp`, { method: "POST" });
  check("Another club's member can RSVP", rsvp.status === 200 && rsvp.data.going === true, rsvp.data);
  const evDoc = (await db.collection("events").doc(String(ev.data.id)).get()).data();
  check("RSVP count incremented in Firestore", evDoc?.rsvpCount === 1, evDoc?.rsvpCount);
  const desc = await host("/api/events/generate-description", { body: { bullets: "- 24 hour hackathon\n- prizes", title: "Hack Night" } });
  check("Description helper returns text (AI or fallback)", desc.status === 200 && String(desc.data.description).length > 20, desc.data);

  console.log("\nCollaboration Compiler");
  const sentence = "24-hour cybersecurity hackathon on 15 Nov, 200 participants, need sponsors, mentors and a venue.";
  const parsed = await host<{ reqId: string; parsed: { needs: { id: string; type: string }[] }; parsedBy: string }>("/api/compiler/parse", { body: { rawText: sentence } });
  const types = parsed.data.parsed?.needs.map((n) => n.type).sort();
  check(`Parse finds sponsor, mentor, venue (${parsed.data.parsedBy})`, JSON.stringify(types) === JSON.stringify(["mentor", "sponsor", "venue"]), types);
  const partnerParse = await partner("/api/compiler/parse", { body: { rawText: sentence, clubId: "coding-club-ggsipu" } });
  check("Can't compile on behalf of another club (403)", partnerParse.status === 403);
  const reqId = parsed.data.reqId;
  const match = await host<{ matchesByNeed: Record<string, { matches: { clubId: string; capabilityId: string }[] }> }>("/api/compiler/match", { body: { reqId } });
  check("Match returns results for every need", match.status === 200 && Object.keys(match.data.matchesByNeed ?? {}).length === 3, match.data);
  const mentorNeed = parsed.data.parsed.needs.find((n) => n.type === "mentor")!;
  const venueNeed = parsed.data.parsed.needs.find((n) => n.type === "venue")!;
  const mentorTop = match.data.matchesByNeed[mentorNeed.id]?.matches[0];
  const venueIds = match.data.matchesByNeed[venueNeed.id]?.matches.map((m) => m.clubId) ?? [];
  check("CyberSec Society is the top mentor match", mentorTop?.clubId === "cybersec-society-nitd", match.data.matchesByNeed[mentorNeed.id]);
  check("Risky TechNova appears among venue matches", venueIds.includes("technova-sample"), venueIds);
  check("Host never matches itself", !Object.values(match.data.matchesByNeed).flatMap((n) => n.matches.map((m) => m.clubId)).includes("coding-club-ggsipu"));
  const matchDocs = await db.collection("compilerRequests").doc(reqId).collection("matches").get();
  const risky = matchDocs.docs.find((d) => d.data().clubId === "technova-sample")?.data();
  check("Match docs stored with score breakdown and risk flag", matchDocs.size >= 9 && risky?.snapshot?.risk === true && risky?.scores?.final > 0, risky);

  console.log("\nInvite → accept → workspace");
  const mentorMatchId = `${mentorNeed.id}--${mentorTop!.capabilityId}`;
  const draft = await host<{ subject: string; message: string }>("/api/compiler/draft-invite", { body: { reqId, matchId: mentorMatchId } });
  check("Invite drafted (subject + message)", draft.status === 200 && draft.data.subject && draft.data.message.length > 40, draft.data);
  const sent = await host("/api/requests/send", { body: { reqId, matchId: mentorMatchId, subject: draft.data.subject, message: draft.data.message } });
  check("Invite sent", sent.status === 200 && typeof sent.data.requestId === "string", sent.data);
  const dupe = await host("/api/requests/send", { body: { reqId, matchId: mentorMatchId, message: draft.data.message } });
  check("Duplicate invite to the same club is blocked (409)", dupe.status === 409);
  const requestId = String(sent.data.requestId);
  const notif = await db.collection("notifications").where("clubId", "==", "cybersec-society-nitd").where("type", "==", "collab_request").get();
  check("Partner got an in-app notification", notif.size >= 1);
  const wrongResponder = await host(`/api/requests/${requestId}/respond`, { body: { action: "accept" } });
  check("Sender can't accept their own invite (404)", wrongResponder.status === 404);
  const accepted = await partner<{ collabId: string; meetLink: string }>(`/api/requests/${requestId}/respond`, { body: { action: "accept" } });
  check("Partner accepts → collaboration created", accepted.status === 200 && !!accepted.data.collabId, accepted.data);
  check("Kickoff link generated (Meet or Calendar fallback)", String(accepted.data.meetLink ?? "").startsWith("https://"), accepted.data.meetLink);
  const again = await partner(`/api/requests/${requestId}/respond`, { body: { action: "accept" } });
  check("Accepting twice is blocked (409)", again.status === 409);
  const collabId = accepted.data.collabId;
  const collab = (await db.collection("collaborations").doc(collabId).get()).data();
  check("Collaboration has both clubs and roles", collab?.clubIds?.length === 2 && collab?.roles?.["cybersec-society-nitd"] === "Mentor", collab);
  const tasks = (await db.collection("tasks").where("collabId", "==", collabId).get()).docs;
  const owners = new Set(tasks.map((t) => t.data().ownerClubId));
  check(`Task board generated (${tasks.length} tasks, owners: both clubs)`, tasks.length >= 4 && owners.size === 2, [...owners]);
  check("Every task has a future due date", tasks.every((t) => t.data().dueDate.toDate() > new Date()));

  console.log("\nWorkspace");
  const t0 = tasks[0];
  const moved = await partner("/api/workspace/tasks/update", { body: { taskId: t0.id, status: "done" } });
  const t0doc = (await t0.ref.get()).data();
  check("Partner can move a task to Done; completedAt recorded", moved.status === 200 && t0doc?.status === "done" && t0doc?.completedAt, t0doc);
  const outsiderMove = await outsider("/api/workspace/tasks/update", { body: { taskId: t0.id, status: "todo" } });
  check("Non-member can't move tasks (404)", outsiderMove.status === 404);
  const regen = await host<{ tasks: unknown[]; generatedBy: string }>("/api/workspace/generate-tasks", { body: { collabId } });
  const afterRegen = (await db.collection("tasks").where("collabId", "==", collabId).get()).docs;
  check(`Regenerate keeps started tasks (${regen.data.generatedBy})`, regen.status === 200 && afterRegen.some((t) => t.id === t0.id), regen.data);
  const partnerComplete = await partner("/api/workspace/complete", { body: { collabId } });
  check("Only the host can finish the collaboration (403)", partnerComplete.status === 403);
  const earlyFeedback = await partner("/api/feedback", { body: { collabId, entries: [{ toClubId: "coding-club-ggsipu", rating: 5, comment: "x", wouldCollabAgain: true }] } });
  check("Feedback is closed until the collaboration finishes (409)", earlyFeedback.status === 409);
  const before = (await partner<{ metrics: { collaborations: { completed: number } } }>("/api/passport/cybersec-society-nitd")).data.metrics.collaborations.completed;
  const done = await host("/api/workspace/complete", { body: { collabId } });
  check("Host marks the collaboration complete", done.status === 200, done.data);
  const fbNotifs = await db.collection("notifications").where("type", "==", "feedback_requested").get();
  check("Both clubs asked for feedback", fbNotifs.docs.filter((d) => d.data().link.includes(collabId)).length === 2);
  const fb = await partner("/api/feedback", { body: { collabId, entries: [{ toClubId: "coding-club-ggsipu", rating: 5, comment: "Great organisers", wouldCollabAgain: true }] } });
  const fb2 = await host("/api/feedback", { body: { collabId, entries: [{ toClubId: "cybersec-society-nitd", rating: 4, comment: "Solid mentors", wouldCollabAgain: true }] } });
  check("Both clubs leave feedback", fb.status === 200 && fb2.status === 200, [fb.data, fb2.data]);
  const selfRate = await host("/api/feedback", { body: { collabId, entries: [{ toClubId: "coding-club-ggsipu", rating: 5, comment: "", wouldCollabAgain: true }] } });
  check("A club can't rate itself (400)", selfRate.status === 400);

  console.log("\nTrust Passport");
  const pp = (await host<{ metrics: { collaborations: { completed: number }; rating: { count: number } }; badges: { id: string }[] }>("/api/passport/cybersec-society-nitd")).data;
  check(`CyberSec completed count went ${before} → ${pp.metrics.collaborations.completed}`, pp.metrics.collaborations.completed === before + 1);
  check("New rating counted (6 reviews now)", pp.metrics.rating.count === 6, pp.metrics.rating);
  const tn = (await host<{ badges: { id: string }[] }>("/api/passport/technova-sample")).data;
  check("TechNova still carries the Caution badge", tn.badges.some((b) => b.id === "caution"), tn.badges);
  const bf = (await host<{ badges: { id: string }[] }>("/api/passport/byteforge-iiitd")).data;
  check("ByteForge shows New but Verified", bf.badges.some((b) => b.id === "new"), bf.badges);

  console.log("\nMisc");
  const unread = (await db.collection("notifications").where("clubId", "==", "coding-club-ggsipu").where("read", "==", false).get()).docs.map((d) => d.id);
  const read = await host("/api/notifications/read", { body: { ids: unread } });
  const stillUnread = (await db.collection("notifications").where("clubId", "==", "coding-club-ggsipu").where("read", "==", false).get()).size;
  check(`Mark ${unread.length} notifications read`, read.status === 200 && stillUnread === 0);
  const toggle = await partner("/api/clubs", { method: "PATCH", body: { openToInstantMeets: false } });
  const cs = (await db.collection("clubs").doc("cybersec-society-nitd").get()).data();
  check("Club admin can toggle instant meets", toggle.status === 200 && cs?.openToInstantMeets === false);
  await partner("/api/clubs", { method: "PATCH", body: { openToInstantMeets: true } });

  console.log(`\n${passed} passed, ${failed} failed`);
}

/** Real mode: remove the throwaway Auth users. Data is restored by re-seeding (see e2e-real.mjs). */
async function cleanup() {
  if (!REAL || !createdUids.length) return;
  await getAuth().deleteUsers([...new Set(createdUids)]);
  console.log(`Removed ${new Set(createdUids).size} throwaway test users from Firebase Auth.`);
}

main()
  .catch((e) => {
    console.error(e);
    failed++;
  })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup failed", e));
    process.exit(failed ? 1 : 0);
  });
