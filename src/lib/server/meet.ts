import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { createMeet } from "@/lib/server/calendar";
import { notify } from "@/lib/server/notify";
import { formatDateTime } from "@/lib/utils";
import type { Club, CollabRequest } from "@/lib/types";

/** Schedules the kickoff Meet for an accepted request and records it on the request + collaboration. */
export async function scheduleMeetForRequest(requestId: string) {
  const db = adminDb();
  const reqRef = db.collection("collabRequests").doc(requestId);
  const request = { id: requestId, ...(await reqRef.get()).data() } as CollabRequest;
  const [host, partner] = await Promise.all(
    [request.fromClubId, request.toClubId].map(async (id) => (await db.collection("clubs").doc(id).get()).data() as Club),
  );
  const secret = (await db.collection("clubSecrets").doc(request.fromClubId).get()).data();

  const meet = await createMeet({
    hostClubId: request.fromClubId,
    title: `${request.eventTitle ?? "Collaboration"}: ${host.name} × ${partner.name} kickoff`,
    description: `Kickoff call for ${request.eventTitle ?? "your collaboration"}, scheduled by CampusOne.`,
    attendeeEmails: [host.contactEmail, partner.contactEmail, secret?.connectedEmail],
  });

  const data = {
    meetLink: meet.meetLink,
    meetIsFallback: meet.isFallback,
    calendarEventId: meet.calendarEventId,
    meetStart: meet.start,
  };
  const batch = db.batch();
  batch.update(reqRef, data);
  if (request.collabId) batch.update(db.collection("collaborations").doc(request.collabId), { ...data, updatedAt: FieldValue.serverTimestamp() });
  const when = formatDateTime(meet.start);
  const link = request.collabId ? `/workspaces/${request.collabId}` : "/requests";
  const title = meet.isFallback
    ? `Kickoff with ${partner.name} proposed for ${when}. Add it to your calendar.`
    : `Google Meet scheduled with ${partner.name} for ${when}`;
  notify(request.fromClubId, "meet_scheduled", title, link, batch);
  notify(
    request.toClubId,
    "meet_scheduled",
    meet.isFallback ? `Kickoff with ${host.name} proposed for ${when}. Add it to your calendar.` : `Google Meet scheduled with ${host.name} for ${when}`,
    link,
    batch,
  );
  await batch.commit();
  return meet;
}
