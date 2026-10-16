import { NextResponse } from "next/server";
import { oauthClient, readState, storeRefreshToken } from "@/lib/server/calendar";
import { appUrl } from "@/lib/server/email";

/** OAuth callback: exchanges the code and stores the refresh token server-side in clubSecrets/{clubId}. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const done = (status: string) => NextResponse.redirect(appUrl(`/capabilities?calendar=${status}`));
  if (params.get("error")) return done("denied");

  const state = readState(params.get("state") ?? "");
  const code = params.get("code");
  if (!state || !code) return done("invalid");

  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) return done("no_refresh_token");
    let email: string | null = null;
    if (tokens.id_token) {
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
      email = ticket.getPayload()?.email ?? null;
    }
    await storeRefreshToken(state.clubId, tokens.refresh_token, email);
    return done("connected");
  } catch (e) {
    console.error("[calendar/callback]", e);
    return done("error");
  }
}
