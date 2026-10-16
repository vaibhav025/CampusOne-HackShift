import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { renderEmail, sendEmail } from "@/lib/server/email";
import { notify } from "@/lib/server/notify";
import { body, route } from "@/lib/server/route";
import type { Club, CompilerRequest, Match } from "@/lib/types";

/** Writes the request + notification, then emails the partner (email never blocks). */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const input = await body(
    req,
    z.object({
      reqId: z.string(),
      matchId: z.string(),
      subject: z.string().trim().min(3).max(150).optional(),
      message: z.string().trim().min(10).max(2000),
    }),
  );
  const db = adminDb();
  const reqRef = db.collection("compilerRequests").doc(input.reqId);
  const [reqSnap, matchSnap] = await Promise.all([reqRef.get(), reqRef.collection("matches").doc(input.matchId).get()]);
  const request = reqSnap.data() as CompilerRequest | undefined;
  const match = matchSnap.data() as Match | undefined;
  if (!request || request.clubId !== club.id || !match) throw new HttpError(404, "Match not found");

  // One open invite per partner per need.
  const dupes = await db
    .collection("collabRequests")
    .where("compilerRequestId", "==", input.reqId)
    .where("toClubId", "==", match.clubId)
    .get();
  if (dupes.docs.some((d) => d.data().needId === match.needId && d.data().status !== "declined")) {
    throw new HttpError(409, "You've already invited this club for this need");
  }

  const partner = (await db.collection("clubs").doc(match.clubId).get()).data() as Club | undefined;
  if (!partner) throw new HttpError(404, "Partner club not found");
  const need = request.parsed.needs.find((n) => n.id === match.needId);
  const subject = input.subject || `Collaboration invite: ${request.parsed.eventTitle}`;

  const ref = db.collection("collabRequests").doc();
  const batch = db.batch();
  batch.set(ref, {
    fromClubId: club.id,
    toClubId: match.clubId,
    compilerRequestId: input.reqId,
    needId: match.needId,
    needType: need?.type ?? null,
    capabilityId: match.capabilityId,
    matchId: input.matchId,
    subject,
    message: input.message,
    status: "pending",
    eventTitle: request.parsed.eventTitle,
    eventDate: request.parsed.date,
    createdAt: FieldValue.serverTimestamp(),
  });
  notify(match.clubId, "collab_request", `${club.name} invited you to collaborate on ${request.parsed.eventTitle}`, "/requests", batch);
  batch.update(reqRef, { status: "invites_sent" });
  await batch.commit();

  const email = await sendEmail({
    to: partner.contactEmail,
    subject,
    text: `${input.message}\n\nRespond on CampusOne: /requests`,
    html: renderEmail({
      heading: `${club.name} wants to collaborate`,
      paragraphs: [input.message],
      buttonText: "View request",
      buttonPath: "/requests",
    }),
  });
  return { requestId: ref.id, emailSent: email.sent };
});
