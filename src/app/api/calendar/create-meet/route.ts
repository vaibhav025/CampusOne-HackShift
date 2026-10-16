import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { scheduleMeetForRequest } from "@/lib/server/meet";
import { body, route } from "@/lib/server/route";

/** Schedules (or reschedules) the kickoff Meet for an accepted request, e.g. "Propose a time". */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const { requestId } = await body(req, z.object({ requestId: z.string() }));
  const request = (await adminDb().collection("collabRequests").doc(requestId).get()).data();
  if (!request || ![request.fromClubId, request.toClubId].includes(club.id)) throw new HttpError(404, "Request not found");
  if (request.status !== "accepted") throw new HttpError(400, "Only accepted requests can have a meeting");
  const meet = await scheduleMeetForRequest(requestId);
  return { meetLink: meet.meetLink, eventId: meet.calendarEventId, isFallback: meet.isFallback };
});
