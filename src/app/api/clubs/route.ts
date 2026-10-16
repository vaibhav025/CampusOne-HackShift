import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { domainMatches, HttpError, requireClubAdmin, requireUser } from "@/lib/server/auth";
import { body, route } from "@/lib/server/route";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  college: z.string().trim().min(2).max(120),
  collegeDomain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((s) => s.replace(/^@/, ""))
    .pipe(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a domain like std.ggsipu.ac.in")),
  city: z.string().trim().min(2).max(60),
  domains: z.array(z.string().trim().toLowerCase().min(1)).max(10),
  description: z.string().trim().max(1000).default(""),
  contactEmail: z.string().trim().email(),
  logoURL: z.string().trim().url().or(z.literal("")).default(""),
});

/** Create a club (onboarding). The creator becomes its admin. */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const input = await body(req, createSchema);
  const db = adminDb();
  const userRef = db.collection("users").doc(user.uid);
  const profile = (await userRef.get()).data();
  if (profile?.clubId) throw new HttpError(409, "You already belong to a club");

  const verified = domainMatches(user.email, input.collegeDomain);
  const clubRef = db.collection("clubs").doc();
  await clubRef.set({
    ...input,
    adminUids: [user.uid],
    adminEmails: [user.email],
    verified,
    verifiedAt: verified ? FieldValue.serverTimestamp() : null,
    verifiedEmailDomain: verified ? user.email.split("@")[1] : null,
    openToInstantMeets: true,
    memberCount: 1,
    createdAt: FieldValue.serverTimestamp(),
  });
  await userRef.update({ clubId: clubRef.id, role: "admin" });
  return { clubId: clubRef.id, verified };
});

const updateSchema = createSchema
  .omit({ collegeDomain: true })
  .partial()
  .extend({ openToInstantMeets: z.boolean().optional() });

/** Update my club's profile (admins only). */
export const PATCH = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const input = await body(req, updateSchema);
  await adminDb().collection("clubs").doc(club.id).update(input);
  return { ok: true };
});
