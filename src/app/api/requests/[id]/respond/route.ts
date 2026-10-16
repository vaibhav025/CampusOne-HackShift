import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { renderEmail, sendEmail } from "@/lib/server/email";
import { scheduleMeetForRequest } from "@/lib/server/meet";
import { notify } from "@/lib/server/notify";
import { generateTasksForCollab } from "@/lib/server/tasks";
import { body, route } from "@/lib/server/route";
import { CAPABILITY_LABELS, type Club, type CollabRequest, type CompilerRequest } from "@/lib/types";

/**
 * Accept or decline an incoming request. On accept: create (or join) the
 * collaboration for this compiler request, schedule the Meet when the partner
 * is open to instant meets, and notify + email the host.
 */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { club } = await requireClubAdmin(req);
  const { id } = await params;
  const { action } = await body(req, z.object({ action: z.enum(["accept", "decline"]) }));
  const db = adminDb();
  const reqRef = db.collection("collabRequests").doc(id);

  // Transaction guards against double-accepts and creates the collaboration exactly once.
  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(reqRef);
    const request = snap.data() as CollabRequest | undefined;
    if (!request || request.toClubId !== club.id) throw new HttpError(404, "Request not found");
    if (request.status !== "pending") throw new HttpError(409, `This request was already ${request.status}`);

    if (action === "decline") {
      tx.update(reqRef, { status: "declined", respondedAt: FieldValue.serverTimestamp() });
      return { request, collabId: null as string | null, created: false };
    }

    const compilerRef = db.collection("compilerRequests").doc(request.compilerRequestId);
    const [compilerSnap, existing] = await Promise.all([
      tx.get(compilerRef),
      tx.get(db.collection("collaborations").where("compilerRequestId", "==", request.compilerRequestId).limit(1)),
    ]);
    const compiler = compilerSnap.data() as CompilerRequest | undefined;
    const role = request.needType ? CAPABILITY_LABELS[request.needType] : "Partner";

    let collabRef;
    let created = false;
    if (!existing.empty) {
      collabRef = existing.docs[0].ref;
      tx.update(collabRef, { clubIds: FieldValue.arrayUnion(club.id), [`roles.${club.id}`]: role });
    } else {
      collabRef = db.collection("collaborations").doc();
      created = true;
      const date = compiler?.parsed.date ? new Date(`${compiler.parsed.date}T10:00:00+05:30`) : null;
      tx.set(collabRef, {
        title: compiler?.parsed.eventTitle ?? request.eventTitle ?? "Collaboration",
        clubIds: [request.fromClubId, club.id],
        hostClubId: request.fromClubId,
        compilerRequestId: request.compilerRequestId,
        status: "ongoing",
        eventDate: date,
        roles: { [request.fromClubId]: "Host", [club.id]: role },
        startedAt: FieldValue.serverTimestamp(),
        abandonedByClubId: null,
        inactiveFlag: null,
      });
    }
    tx.update(reqRef, { status: "accepted", respondedAt: FieldValue.serverTimestamp(), collabId: collabRef.id });
    return { request, collabId: collabRef.id, created };
  });

  const { request, collabId } = outcome;
  const host = (await db.collection("clubs").doc(request.fromClubId).get()).data() as Club;

  if (action === "decline") {
    await notify(request.fromClubId, "request_accepted", `${club.name} declined your invite for ${request.eventTitle ?? "your event"}`, `/compiler/${request.compilerRequestId}`);
    return { status: "declined" };
  }

  await notify(request.fromClubId, "request_accepted", `${club.name} accepted your invite for ${request.eventTitle ?? "your event"}`, `/workspaces/${collabId}`);

  // Meet: auto-schedule only if the accepting club allows instant meets.
  let meetLink: string | null = null;
  let meetIsFallback = false;
  if (club.openToInstantMeets) {
    const meet = await scheduleMeetForRequest(id);
    meetLink = meet.meetLink;
    meetIsFallback = meet.isFallback;
  } else {
    await notify(club.id, "meet_scheduled", `Propose a kickoff time with ${host.name}`, "/requests");
  }

  // Task board: a full plan for a new collaboration, or just the joiner's tasks for an existing one.
  // A failure here shouldn't undo the acceptance; the host can regenerate from the workspace.
  await generateTasksForCollab(collabId!, outcome.created ? {} : { onlyForClubId: club.id }).catch((e) =>
    console.error("[respond] task generation failed", e),
  );

  await sendEmail({
    to: host.contactEmail,
    subject: `${club.name} accepted: ${request.eventTitle ?? "your collaboration"}`,
    text: `${club.name} accepted your collaboration request.${meetLink ? ` Kickoff: ${meetLink}` : ""}`,
    html: renderEmail({
      heading: `${club.name} is in!`,
      paragraphs: [
        `${club.name} accepted your invite for ${request.eventTitle ?? "your event"}.`,
        meetLink ? (meetIsFallback ? `Add the kickoff call to your calendar: ${meetLink}` : `Kickoff Google Meet: ${meetLink}`) : "They'll propose a time for a kickoff call.",
        "Your shared workspace and task board are ready.",
      ],
      buttonText: "Open workspace",
      buttonPath: `/workspaces/${collabId}`,
    }),
  });

  return { status: "accepted", collabId, meetLink, meetIsFallback };
});
