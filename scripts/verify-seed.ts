/**
 * Offline check (no Firestore needed): builds the seed in memory and runs the
 * Passport computation for the three demo archetypes.  npm run verify:seed
 */
import { buildSeed } from "../src/lib/demo/seed-data";
import { computePassport } from "../src/lib/passport";
import type { Collaboration, CollabRequest, Feedback, Task } from "../src/lib/types";

const now = new Date();
const seed = buildSeed({ now });
const withId = <T>(docs: { id: string; data: Record<string, unknown> }[]) => docs.map((d) => ({ id: d.id, ...d.data }) as T);
const collaborations = withId<Collaboration>(seed.collaborations);
const tasks = withId<Task>(seed.tasks);
const feedback = withId<Feedback>(seed.feedback);
const requests = withId<CollabRequest>(seed.collabRequests);
const clubNames = Object.fromEntries(seed.clubs.map((c) => [c.id, c.data.name]));

let failures = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "✓" : "✗"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}

function passport(clubId: string) {
  const c = seed.clubs.find((x) => x.id === clubId)!;
  return computePassport({
    club: { id: c.id, ...c.data },
    collaborations,
    tasks,
    feedback,
    incomingRequests: requests,
    clubNames,
    now,
  });
}

console.log(`Clubs: ${seed.clubs.length}`);
expect("club count", seed.clubs.length, 18);
expect("every club has >= 2 capabilities", seed.clubs.every((c) => seed.capabilities.filter((x) => x.data.clubId === c.id).length >= 2), true);

console.log("\nPerfect partner: CyberSec Society");
const cs = passport("cybersec-society-nitd");
expect("completed/abandoned", [cs.metrics.collaborations.completed, cs.metrics.collaborations.abandoned], [6, 0]);
expect("on time", [cs.metrics.onTime.onTime, cs.metrics.onTime.total], [21, 24]);
expect("rating", cs.metrics.rating.average, 4.6);
expect("repeat partners", cs.metrics.repeatPartners.count, 3);
expect("badges", cs.badges.map((b) => b.id), ["verified", "reliable", "fast", "repeat"]);

console.log("\nNew club: ByteForge");
const bf = passport("byteforge-iiitd");
expect("completed", bf.metrics.collaborations.completed, 0);
expect("reliability (neutral)", bf.metrics.reliability, 0.5);
expect("badges", bf.badges.map((b) => b.id), ["verified", "new"]);

console.log("\nRisky club: TechNova Club");
const tn = passport("technova-sample");
expect("completed/abandoned", [tn.metrics.collaborations.completed, tn.metrics.collaborations.abandoned], [3, 2]);
expect("on-time rate", Math.round((tn.metrics.onTime.rate ?? 0) * 100), 55);
expect("caution", tn.metrics.caution, true);
expect("badges", tn.badges.map((b) => b.id), ["verified", "caution"]);

console.log("\nVictim of abandonment is not penalised: GreenEarth Club");
const ge = passport("greenearth-amity");
expect("abandoned", ge.metrics.collaborations.abandoned, 0);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll seed checks passed");
process.exit(failures ? 1 : 0);
