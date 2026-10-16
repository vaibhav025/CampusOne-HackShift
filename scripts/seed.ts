/**
 * Seeds (or resets) the demo dataset.
 *   npm run seed           -> upsert demo data
 *   npm run seed -- --reset -> wipe demo collections first, then seed (restores the demo in one command)
 */
import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { buildSeed } from "../src/lib/demo/seed-data";

config({ path: ".env.local" });

const RESET_COLLECTIONS = [
  "users",
  "clubs",
  "capabilities",
  "events",
  "compilerRequests",
  "collabRequests",
  "collaborations",
  "tasks",
  "feedback",
  "notifications",
];

function db(): Firestore {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (process.env.FIRESTORE_EMULATOR_HOST && projectId) {
    initializeApp({ projectId }); // emulator: no credentials needed
    return getFirestore();
  }
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing Firebase Admin env vars. Fill .env.local (see .env.example).");
    process.exit(1);
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore();
}

async function writeAll(firestore: Firestore, collection: string, docs: { id: string; data: Record<string, unknown> }[]) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = firestore.batch();
    for (const d of docs.slice(i, i + 400)) batch.set(firestore.collection(collection).doc(d.id), d.data);
    await batch.commit();
  }
  console.log(`  ${collection.padEnd(16)} ${docs.length}`);
}

async function main() {
  const reset = process.argv.includes("--reset");
  const firestore = db();

  if (reset) {
    console.log("Resetting demo collections…");
    for (const name of RESET_COLLECTIONS) await firestore.recursiveDelete(firestore.collection(name));
    // clubSecrets (Calendar tokens) are kept so the demo host stays connected.
  }

  const seed = buildSeed({
    now: new Date(),
    hostEmail: process.env.DEMO_HOST_EMAIL?.toLowerCase().trim() || undefined,
    partnerEmail: process.env.DEMO_PARTNER_EMAIL?.toLowerCase().trim() || undefined,
  });

  // Keep calendar connection flags for clubs that still have a stored token.
  const secrets = await firestore.collection("clubSecrets").get();
  const connected = new Set(secrets.docs.filter((d) => d.data().refreshToken).map((d) => d.id));
  for (const c of seed.clubs) (c.data as Record<string, unknown>).calendarConnected = connected.has(c.id);

  console.log("Seeding…");
  await writeAll(firestore, "clubs", seed.clubs);
  await writeAll(firestore, "capabilities", seed.capabilities);
  await writeAll(firestore, "collaborations", seed.collaborations);
  await writeAll(firestore, "tasks", seed.tasks);
  await writeAll(firestore, "feedback", seed.feedback);
  await writeAll(firestore, "collabRequests", seed.collabRequests);
  await writeAll(firestore, "events", seed.events.map(({ id, data }) => ({ id, data })));
  let rsvpCount = 0;
  for (const e of seed.events) {
    await writeAll(
      firestore,
      `events/${e.id}/rsvps`,
      e.rsvps.map((r) => ({ id: r.uid, data: r })),
    ).catch((err) => console.error(err));
    rsvpCount += e.rsvps.length;
  }
  console.log(`Done. ${seed.clubs.length} clubs, ${rsvpCount} RSVPs.`);
  const admin = (id: string) => (seed.clubs.find((c) => c.id === id)!.data.adminEmails as string[])[0];
  console.log(`Demo admins: Coding Club → ${admin("coding-club-ggsipu")}, CyberSec Society → ${admin("cybersec-society-nitd")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
