import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { google } from "googleapis";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { isPlaceholderEmail } from "@/lib/emails";

// Google Calendar + Meet auto-scheduling (spec Section 11).

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function calendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

export function oauthClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}

// OAuth `state` carries the club id, signed so the callback can't be pointed at another club.
const sign = (payload: string) => createHmac("sha256", process.env.GOOGLE_CLIENT_SECRET ?? "dev").update(payload).digest("base64url");

export function makeState(clubId: string, uid: string) {
  const payload = Buffer.from(JSON.stringify({ clubId, uid, t: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readState(state: string): { clubId: string; uid: string } | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (Date.now() - data.t > 15 * 60_000) return null; // 15-minute window
  return data;
}

export async function storeRefreshToken(clubId: string, refreshToken: string, connectedEmail: string | null) {
  const db = adminDb();
  await db.collection("clubSecrets").doc(clubId).set({ refreshToken, connectedEmail, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("clubs").doc(clubId).update({ calendarConnected: true });
}

export { nextSlot, templateLink } from "@/lib/calendar-link";
import { nextSlot, templateLink } from "@/lib/calendar-link";

export interface MeetResult {
  meetLink: string;
  calendarEventId: string | null;
  isFallback: boolean;
  start: Date;
  end: Date;
}

/**
 * Creates a Calendar event with a Meet link on the host club's calendar.
 * Falls back to a template link if the host hasn't connected Calendar or the API fails.
 */
export async function createMeet({
  hostClubId,
  title,
  description,
  attendeeEmails,
}: {
  hostClubId: string;
  title: string;
  description: string;
  attendeeEmails: string[];
}): Promise<MeetResult> {
  const { start, end } = nextSlot();
  const emails = [...new Set(attendeeEmails.filter((e) => !isPlaceholderEmail(e)))];
  const fallback = (): MeetResult => ({
    meetLink: templateLink({ title, details: description, start, end, emails }),
    calendarEventId: null,
    isFallback: true,
    start,
    end,
  });

  if (!calendarConfigured()) return fallback();
  const secret = (await adminDb().collection("clubSecrets").doc(hostClubId).get()).data();
  if (!secret?.refreshToken) return fallback();

  try {
    const auth = oauthClient();
    auth.setCredentials({ refresh_token: secret.refreshToken });
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: title,
        description,
        start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
        end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
        attendees: emails.map((email) => ({ email })),
        conferenceData: {
          createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
        },
      },
    });
    const meetLink =
      res.data.hangoutLink ?? res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
    if (!meetLink) return { ...fallback(), calendarEventId: res.data.id ?? null };
    return { meetLink, calendarEventId: res.data.id ?? null, isFallback: false, start, end };
  } catch (e) {
    console.error("[calendar] events.insert failed, using template link", e);
    return fallback();
  }
}
