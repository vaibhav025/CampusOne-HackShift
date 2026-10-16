import { NextResponse } from "next/server";
import { requireClubAdmin } from "@/lib/server/auth";
import { CALENDAR_SCOPE, calendarConfigured, makeState, oauthClient } from "@/lib/server/calendar";
import { appUrl } from "@/lib/server/email";
import { route } from "@/lib/server/route";

/**
 * Starts Google OAuth for the club's calendar. Browser redirects can't carry a
 * Bearer header, so the Firebase ID token arrives as `?token=` and is verified the same way.
 */
export const GET = route(async (req) => {
  if (!calendarConfigured()) return NextResponse.redirect(appUrl("/capabilities?calendar=not_configured"));
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const { club, user } = await requireClubAdmin(new Request(req.url, { headers: { authorization: `Bearer ${token}` } }));
  const url = oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always return a refresh token
    scope: [CALENDAR_SCOPE, "openid", "email"],
    state: makeState(club.id, user.uid),
    login_hint: user.email,
  });
  return NextResponse.redirect(url);
});
