// Environment for running CampusOne fully locally against the Firebase emulators.
// A "demo-" project id tells Firebase this project exists only in the emulators.
import { existsSync } from "node:fs";
import path from "node:path";

export const PROJECT_ID = "demo-campusone";

export function localEnv(extra = {}) {
  const env = {
    ...process.env,
    NEXT_PUBLIC_USE_EMULATORS: "true",
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    ...extra,
  };
  // Use the portable JDK in .tools/ when there's no suitable system Java.
  const jdk = path.resolve(".tools/jdk");
  if (existsSync(jdk)) {
    env.JAVA_HOME = jdk;
    const key = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "PATH";
    env[key] = `${path.join(jdk, "bin")}${path.delimiter}${env[key] ?? ""}`;
  }
  return env;
}

export async function waitFor(url, label, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`${label} did not start within ${timeoutMs / 1000}s`);
}
