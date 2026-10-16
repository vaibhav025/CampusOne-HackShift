/**
 * npm run test:e2e:real
 * Runs the e2e flow against your REAL Firebase project (app must be running: npm run dev).
 * 1. Re-seeds with throwaway admin emails, 2. runs the test, 3. always restores the normal seed.
 */
import { spawnSync } from "node:child_process";

const sh = process.platform === "win32";
const base = { ...process.env };
delete base.FIRESTORE_EMULATOR_HOST;
delete base.FIREBASE_AUTH_EMULATOR_HOST;
const run = (args, env = {}) => spawnSync("npx", args, { stdio: "inherit", shell: sh, env: { ...base, ...env } }).status ?? 1;

console.log("Seeding real Firestore with throwaway test admins…");
if (run(["tsx", "scripts/seed.ts", "--reset"], { DEMO_HOST_EMAIL: "e2e.host@campusone.test", DEMO_PARTNER_EMAIL: "e2e.partner@campusone.test" })) process.exit(1);
const status = run(["tsx", "scripts/e2e-local.ts"], { E2E_TARGET: "real" });
console.log("\nRestoring the normal demo data…");
run(["tsx", "scripts/seed.ts", "--reset"]);
process.exit(status);
