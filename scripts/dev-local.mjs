/**
 * npm run dev:local
 * Starts Firebase Auth + Firestore emulators, seeds the demo data, and runs the
 * app against them. No Firebase account or keys needed. LLM / Gmail / Calendar
 * keys from .env.local are still used if present.
 *   App:          http://localhost:3000
 *   Emulator UI:  http://127.0.0.1:4000  (browse Firestore, see sign-ins)
 */
import { spawn, spawnSync } from "node:child_process";
import { localEnv, PROJECT_ID, waitFor } from "./local-env.mjs";

const port = process.env.PORT ?? "3000";
const env = localEnv({ NEXT_PUBLIC_APP_URL: `http://localhost:${port}` });
const children = [];

function run(cmd, args, label) {
  const child = spawn(cmd, args, { env, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" });
  const tag = (line) => `[${label}] ${line}`;
  child.stdout.on("data", (d) => String(d).split("\n").filter(Boolean).forEach((l) => console.log(tag(l))));
  child.stderr.on("data", (d) => String(d).split("\n").filter(Boolean).forEach((l) => console.error(tag(l))));
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const c of children) {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(c.pid), "/t", "/f"], { stdio: "ignore" });
    else c.kill("SIGINT");
  }
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting Firebase emulators…");
run("npx", ["firebase", "emulators:start", "--project", PROJECT_ID, "--only", "auth,firestore"], "firebase");
await waitFor("http://127.0.0.1:8080", "Firestore emulator");
await waitFor("http://127.0.0.1:9099", "Auth emulator");

console.log("Seeding demo data…");
const seed = spawnSync("npx", ["tsx", "scripts/seed.ts", "--reset"], { env, stdio: "inherit", shell: process.platform === "win32" });
if (seed.status !== 0) shutdown(1);

console.log(`Starting app on http://localhost:${port}`);
console.log("Sign in with Google → the emulator lets you type any email.");
console.log("Use vaibhav.04816401525@std.ggsipu.ac.in (Coding Club) or rohan.01916401525@std.ggsipu.ac.in (CyberSec Society).");
const app = run("npx", ["next", "dev", "-p", port], "app");
app.on("exit", (code) => shutdown(code ?? 0));
