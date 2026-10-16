import "server-only";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Club, UserDoc } from "@/lib/types";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface AuthedUser {
  uid: string;
  email: string;
  name: string;
  picture: string;
}

/** Verifies the Firebase ID token from the `Authorization: Bearer` header. */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Missing auth token");
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: (decoded.email ?? "").toLowerCase(),
      name: decoded.name ?? decoded.email ?? "Student",
      picture: decoded.picture ?? "",
    };
  } catch {
    throw new HttpError(401, "Invalid or expired auth token");
  }
}

/** Requires a signed-in user who belongs to a club. Returns user doc and club. */
export async function requireClubMember(req: Request) {
  const user = await requireUser(req);
  const userSnap = await adminDb().collection("users").doc(user.uid).get();
  const profile = userSnap.data() as UserDoc | undefined;
  if (!profile?.clubId) throw new HttpError(403, "Join or create a club first");
  const clubSnap = await adminDb().collection("clubs").doc(profile.clubId).get();
  if (!clubSnap.exists) throw new HttpError(404, "Club not found");
  const club = { id: clubSnap.id, ...clubSnap.data() } as Club;
  return { user, profile, club, isAdmin: club.adminUids.includes(user.uid) };
}

/** Requires the user to be an admin of their club. */
export async function requireClubAdmin(req: Request) {
  const ctx = await requireClubMember(req);
  if (!ctx.isAdmin) throw new HttpError(403, "Only club admins can do this");
  return ctx;
}

export function emailDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

/** True when the email's domain equals the college domain or is a subdomain of it. */
export function domainMatches(email: string, collegeDomain: string) {
  const d = emailDomain(email);
  const c = collegeDomain.toLowerCase().replace(/^@/, "").trim();
  return Boolean(c) && (d === c || d.endsWith(`.${c}`));
}
