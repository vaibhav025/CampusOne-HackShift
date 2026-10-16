import { NextResponse } from "next/server";

/**
 * Deployment check: confirms the server is up and which services are configured.
 * Reports only true/false for each key, never the values.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const has = (k: string) => Boolean(process.env[k]?.trim());
  let firebaseAdmin: "ok" | string = "ok";
  try {
    // Loading this module is exactly what crashed on Vercel; prove it works here.
    await import("firebase-admin/auth");
  } catch (e) {
    firebaseAdmin = e instanceof Error ? e.message.slice(0, 200) : "failed";
  }
  return NextResponse.json({
    ok: firebaseAdmin === "ok",
    node: process.version,
    firebaseAdmin,
    configured: {
      firebaseWeb: has("NEXT_PUBLIC_FIREBASE_API_KEY") && has("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
      firebaseAdmin: has("FIREBASE_ADMIN_CLIENT_EMAIL") && has("FIREBASE_ADMIN_PRIVATE_KEY"),
      llm: has("GEMINI_API_KEY") || has("ANTHROPIC_API_KEY"),
      email: has("GMAIL_USER") && has("GMAIL_APP_PASSWORD"),
      calendar: has("GOOGLE_CLIENT_ID") && has("GOOGLE_CLIENT_SECRET"),
    },
  });
}
