/**
 * Offline check of the matching engine on the seed data with the demo sentence
 * (fallback parser + tag-overlap semantics, i.e. the no-API-key path).  npm run verify:matching
 */
import { buildSeed } from "../src/lib/demo/seed-data";
import { fallbackParse } from "../src/lib/compiler/fallback-parser";
import { computePassport, type PassportMetrics } from "../src/lib/passport";
import { factReasons, scoreCandidates } from "../src/lib/matching";
import type { Capability, Club, Collaboration, CollabRequest, Feedback, Task } from "../src/lib/types";

const now = new Date();
const seed = buildSeed({ now });
const withId = <T>(docs: { id: string; data: Record<string, unknown> }[]) => docs.map((d) => ({ id: d.id, ...d.data }) as T);
const clubs = Object.fromEntries(withId<Club>(seed.clubs).map((c) => [c.id, c]));
const capabilities = withId<Capability>(seed.capabilities);
const collaborations = withId<Collaboration>(seed.collaborations);
const tasks = withId<Task>(seed.tasks);
const feedback = withId<Feedback>(seed.feedback);
const requests = withId<CollabRequest>(seed.collabRequests);
const clubNames = Object.fromEntries(Object.values(clubs).map((c) => [c.id, c.name]));

const passports: Record<string, PassportMetrics> = {};
for (const c of Object.values(clubs)) {
  passports[c.id] = computePassport({ club: c, collaborations, tasks, feedback, incomingRequests: requests, clubNames, now }).metrics;
}

// Use a date inside the seeded availability windows.
const demoDate = new Date(now.getTime() + 31 * 86400000);
const sentence = `24-hour cybersecurity hackathon on ${demoDate.getDate()} ${demoDate.toLocaleString("en", { month: "short" })}, 200 participants, need sponsors, mentors and a venue.`;
const parsed = fallbackParse(sentence, { today: now, clubCity: "Delhi" });
console.log(sentence);
console.log(`Parsed needs: ${parsed.needs.map((n) => n.type).join(", ")} | date ${parsed.date} | size ${parsed.expectedSize}\n`);

let failures = 0;
const check = (label: string, ok: boolean) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
};

const topByNeed: Record<string, string[]> = {};
for (const need of parsed.needs) {
  const top = scoreCandidates({ need, parsed, requestingClubId: "coding-club-ggsipu", capabilities, clubs, passports });
  topByNeed[need.type] = top.map((t) => t.club.id);
  console.log(`${need.type.toUpperCase()}: ${need.detail}`);
  for (const t of top) {
    const s = t.scores;
    console.log(
      `  ${String(Math.round(s.final * 100)).padStart(3)}%  ${t.club.name.padEnd(24)} sem ${s.semantic.toFixed(2)} · log ${s.logistics.toFixed(2)} · rel ${s.reliability.toFixed(2)}${t.risk ? "  ⚠️" : ""}`,
    );
    console.log(`        ${factReasons(t, parsed).join(" | ")}`);
  }
  console.log();
}

console.log("Checkpoint");
check("3+ ranked clubs for every need", Object.values(topByNeed).every((ids) => ids.length >= 3));
check("CyberSec Society is #1 for mentor", topByNeed.mentor?.[0] === "cybersec-society-nitd");
check("CyberSec Society is #1 for venue", topByNeed.venue?.[0] === "cybersec-society-nitd");
check("TechNova (risky) appears in the top 3 of some need", Object.values(topByNeed).some((ids) => ids.slice(0, 3).includes("technova-sample")));
check("ByteForge (new) appears for mentor with neutral reliability", topByNeed.mentor?.includes("byteforge-iiitd") ?? false);
check("Host club never matches itself", !Object.values(topByNeed).flat().includes("coding-club-ggsipu"));
check("AI Guild 80-seat lab excluded from 200-person venue", !topByNeed.venue?.includes("ai-guild-snu"));
check("Different needs can go to different clubs", new Set(Object.values(topByNeed).map((ids) => ids[0])).size > 1);
console.log(failures ? `\n${failures} check(s) failed` : "\nAll matching checks passed");
process.exit(failures ? 1 : 0);
