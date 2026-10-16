"use client";

// Demo-mode stand-in for the API routes. Same request/response shapes as the
// real routes, backed by the in-memory store and the shared pure logic.
import { nextSlot, templateLink } from "@/lib/calendar-link";
import { isPlaceholderEmail } from "@/lib/emails";
import { fallbackParse } from "@/lib/compiler/fallback-parser";
import { normalizeParsed } from "@/lib/compiler/normalize";
import { createTasksFor, demoId, DEMO_UID, getState, update, type DemoState } from "@/lib/demo/store";
import { factReasons, scoreCandidates } from "@/lib/matching";
import { computePassport, type Passport } from "@/lib/passport";
import { formatDate, formatDateTime } from "@/lib/utils";
import { CAPABILITY_LABELS, type Capability, type Club, type Match, type NotificationType, type ParsedRequest } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class DemoError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function passportFor(clubId: string, s: DemoState): Passport {
  const club = s.clubs.find((c) => c.id === clubId)!;
  return computePassport({
    club,
    collaborations: s.collaborations,
    tasks: s.tasks,
    feedback: s.feedback,
    incomingRequests: s.collabRequests,
    clubNames: Object.fromEntries(s.clubs.map((c) => [c.id, c.name])),
  });
}

function notify(d: DemoState, clubId: string, type: NotificationType, title: string, link: string) {
  d.notifications.push({ id: demoId("n"), clubId, type, title, link, read: false, createdAt: new Date().toISOString() });
}

export function runMatch(reqId: string) {
  const s = getState();
  const request = s.compilerRequests.find((r) => r.id === reqId);
  if (!request) throw new DemoError("Request not found", 404);
  const clubs = Object.fromEntries(s.clubs.map((c) => [c.id, c]));
  const passports = Object.fromEntries(s.clubs.map((c) => [c.id, passportFor(c.id, s).metrics]));
  const matches: Match[] = [];
  for (const need of request.parsed.needs) {
    const top = scoreCandidates({
      need,
      parsed: request.parsed,
      requestingClubId: request.clubId,
      capabilities: s.capabilities,
      clubs,
      passports,
    }).slice(0, 3);
    top.forEach((c, i) =>
      matches.push({
        id: `${need.id}--${c.capability.id}`,
        needId: need.id,
        clubId: c.club.id,
        capabilityId: c.capability.id,
        scores: c.scores,
        reasons: factReasons(c, request.parsed),
        rank: i + 1,
        rankedBy: "score",
        semanticMethod: c.semanticMethod,
        snapshot: {
          clubName: c.club.name,
          college: c.club.college,
          verified: c.club.verified,
          capabilityTitle: c.capability.title,
          capabilityCity: c.capability.city,
          capacity: c.capability.capacity ?? null,
          completed: c.passport.collaborations.completed,
          abandoned: c.passport.collaborations.abandoned,
          onTimeRate: c.passport.onTime.rate,
          rating: c.passport.rating.average,
          risk: c.risk,
        },
      }),
    );
  }
  update((d) => {
    d.matches[reqId] = matches;
    const r = d.compilerRequests.find((x) => x.id === reqId)!;
    if (r.status === "parsed") r.status = "matched";
  });
}

/** Parses + matches a sentence for a club, synchronously (used to pre-seed and by the API). */
export function compileSentence(rawText: string, club: Club, fixedId?: string) {
  const parsed = normalizeParsed(fallbackParse(rawText, { today: new Date(), clubCity: club.city }), club.city);
  const id = fixedId ?? demoId("req");
  update((d) => {
    d.compilerRequests.push({ id, clubId: club.id, rawText, parsed, parsedBy: "fallback", status: "parsed", createdAt: new Date().toISOString() });
  });
  return { reqId: id, parsed };
}

export async function demoApi<T>(path: string, method: string, body: Record<string, unknown> = {}): Promise<T> {
  const s = getState();
  const me = s.clubs.find((c) => c.id === s.currentClubId)!;
  const url = new URL(path, "http://demo");
  const p = url.pathname;
  let m: RegExpMatchArray | null;

  // Small delays make loading states visible, like a real network.
  await sleep(p.startsWith("/api/compiler") ? 700 : 250);

  if (p === "/api/users/me") return { ok: true } as T;

  if (p === "/api/compiler/parse") {
    const { reqId, parsed } = compileSentence(String(body.rawText ?? ""), me);
    return { reqId, parsed, parsedBy: "fallback" } as T;
  }
  if (p === "/api/compiler/match") {
    runMatch(String(body.reqId));
    return { ok: true } as T;
  }
  if ((m = p.match(/^\/api\/compiler\/([^/]+)$/)) && method === "PATCH") {
    const parsed = normalizeParsed(body.parsed as ParsedRequest, me.city);
    update((d) => {
      d.compilerRequests.find((r) => r.id === m![1])!.parsed = parsed;
    });
    return { parsed } as T;
  }
  if (p === "/api/compiler/draft-invite") {
    const req = s.compilerRequests.find((r) => r.id === body.reqId)!;
    const match = (s.matches[req.id] ?? []).find((x) => x.id === body.matchId)!;
    const need = req.parsed.needs.find((n) => n.id === match.needId)!;
    const pr = req.parsed;
    return {
      subject: `Partner with ${me.name} on ${pr.eventTitle}?`,
      message: `Hi ${match.snapshot.clubName} team,

${me.name} (${me.college}) is hosting ${pr.eventTitle} on ${pr.date ? formatDate(pr.date) : "a date to be confirmed"}${pr.expectedSize ? ` for ${pr.expectedSize} participants` : ""}. We're looking for ${need.detail.toLowerCase()}, and your "${match.snapshot.capabilityTitle}" stood out. ${match.reasons[0] ?? ""}

Would you like to partner with us? Accept on CampusOne and we'll set up a quick kickoff call.

Cheers,
${me.name}`,
    } as T;
  }
  if (p === "/api/requests/send") {
    const req = s.compilerRequests.find((r) => r.id === body.reqId)!;
    const match = (s.matches[req.id] ?? []).find((x) => x.id === body.matchId)!;
    const need = req.parsed.needs.find((n) => n.id === match.needId);
    if (s.collabRequests.some((r) => r.compilerRequestId === req.id && r.toClubId === match.clubId && r.needId === match.needId && r.status !== "declined"))
      throw new DemoError("You've already invited this club for this need", 409);
    const id = demoId("creq");
    update((d) => {
      d.collabRequests.push({
        id,
        fromClubId: me.id,
        toClubId: match.clubId,
        compilerRequestId: req.id,
        needId: match.needId,
        needType: need?.type,
        capabilityId: match.capabilityId,
        matchId: match.id,
        subject: String(body.subject ?? ""),
        message: String(body.message ?? ""),
        status: "pending",
        eventTitle: req.parsed.eventTitle,
        eventDate: req.parsed.date,
        createdAt: new Date().toISOString(),
      });
      d.compilerRequests.find((r) => r.id === req.id)!.status = "invites_sent";
      notify(d, match.clubId, "collab_request", `${me.name} invited you to collaborate on ${req.parsed.eventTitle}`, "/requests");
    });
    return { requestId: id, emailSent: false } as T;
  }
  if ((m = p.match(/^\/api\/requests\/([^/]+)\/respond$/))) {
    const action = body.action as "accept" | "decline";
    const request = s.collabRequests.find((r) => r.id === m![1]);
    if (!request || request.toClubId !== me.id) throw new DemoError("Request not found", 404);
    if (request.status !== "pending") throw new DemoError(`Already ${request.status}`, 409);
    const host = s.clubs.find((c) => c.id === request.fromClubId)!;
    let collabId: string | null = null;
    let meetLink: string | null = null;
    update((d) => {
      const r = d.collabRequests.find((x) => x.id === request.id)!;
      r.respondedAt = new Date().toISOString();
      if (action === "decline") {
        r.status = "declined";
        notify(d, host.id, "request_accepted", `${me.name} declined your invite for ${request.eventTitle}`, "/requests");
        return;
      }
      r.status = "accepted";
      const role = request.needType ? CAPABILITY_LABELS[request.needType] : "Partner";
      let collab = request.compilerRequestId ? d.collaborations.find((c) => c.compilerRequestId === request.compilerRequestId) : undefined;
      if (collab) {
        if (!collab.clubIds.includes(me.id)) collab.clubIds.push(me.id);
        collab.roles = { ...collab.roles, [me.id]: role };
        // Joining partner only gets their own deliverables; the host plan already exists.
        const before = d.tasks.length;
        createTasksFor(d, collab, [{ clubId: me.id, type: request.needType ?? null }]);
        const added = d.tasks.splice(before).filter((t) => t.ownerClubId === me.id);
        const maxOrder = Math.max(0, ...d.tasks.filter((t) => t.collabId === collab!.id).map((t) => t.order));
        added.forEach((t, i) => d.tasks.push({ ...t, order: maxOrder + 1 + i }));
      } else {
        const eventDate = request.eventDate ? new Date(`${request.eventDate}T10:00:00+05:30`).toISOString() : new Date(Date.now() + 30 * 86_400_000).toISOString();
        collab = {
          id: demoId("collab"),
          title: request.eventTitle ?? "Collaboration",
          clubIds: [host.id, me.id],
          hostClubId: host.id,
          compilerRequestId: request.compilerRequestId,
          status: "ongoing",
          eventDate,
          startedAt: new Date().toISOString(),
          roles: { [host.id]: "Host", [me.id]: role },
          inactiveFlag: null,
        };
        d.collaborations.push(collab);
        createTasksFor(d, collab, [{ clubId: me.id, type: request.needType ?? null }]);
      }
      collabId = collab.id;
      r.collabId = collab.id;
      notify(d, host.id, "request_accepted", `${me.name} accepted your invite for ${request.eventTitle}`, `/workspaces/${collab.id}`);
      if (me.openToInstantMeets) {
        const { start, end } = nextSlot();
        meetLink = templateLink({
          title: `${request.eventTitle}: ${host.name} × ${me.name} kickoff`,
          details: "Kickoff call scheduled by CampusOne.",
          start,
          end,
          emails: [host.contactEmail, me.contactEmail].filter((e) => !isPlaceholderEmail(e)),
        });
        r.meetLink = meetLink;
        r.meetIsFallback = true;
        collab.meetLink = meetLink;
        collab.meetIsFallback = true;
        const when = formatDateTime(start);
        notify(d, host.id, "meet_scheduled", `Kickoff with ${me.name} proposed for ${when}`, `/workspaces/${collab.id}`);
        notify(d, me.id, "meet_scheduled", `Kickoff with ${host.name} proposed for ${when}`, `/workspaces/${collab.id}`);
      }
    });
    return { status: action === "accept" ? "accepted" : "declined", collabId, meetLink, meetIsFallback: true } as T;
  }
  if (p === "/api/calendar/create-meet") {
    const request = s.collabRequests.find((r) => r.id === body.requestId)!;
    const { start, end } = nextSlot();
    const meetLink = templateLink({ title: `${request.eventTitle} kickoff`, details: "Scheduled by CampusOne.", start, end, emails: [] });
    update((d) => {
      const r = d.collabRequests.find((x) => x.id === request.id)!;
      r.meetLink = meetLink;
      r.meetIsFallback = true;
      const c = d.collaborations.find((x) => x.id === r.collabId);
      if (c) Object.assign(c, { meetLink, meetIsFallback: true });
    });
    return { meetLink, isFallback: true } as T;
  }

  if ((m = p.match(/^\/api\/passport\/([^/]+)$/))) return passportFor(m[1], s) as T;

  if (p === "/api/workspace/tasks/update") {
    update((d) => {
      const t = d.tasks.find((x) => x.id === body.taskId)!;
      const status = body.status as "todo" | "doing" | "done";
      if (status !== t.status) t.completedAt = status === "done" ? new Date().toISOString() : null;
      t.status = status;
      if (typeof body.order === "number") t.order = body.order;
    });
    return { ok: true } as T;
  }
  if (p === "/api/workspace/complete") {
    update((d) => {
      const c = d.collaborations.find((x) => x.id === body.collabId)!;
      c.status = "completed";
      c.endedAt = new Date().toISOString();
      for (const id of c.clubIds) notify(d, id, "feedback_requested", `How was ${c.title}? Leave feedback for your partners`, `/workspaces/${c.id}/feedback`);
    });
    return { ok: true } as T;
  }
  if (p === "/api/feedback") {
    const entries = body.entries as { toClubId: string; rating: number; comment: string; wouldCollabAgain: boolean }[];
    update((d) => {
      d.feedback = d.feedback.filter((f) => !(f.collabId === body.collabId && f.fromClubId === me.id));
      for (const e of entries) d.feedback.push({ id: demoId("fb"), collabId: String(body.collabId), fromClubId: me.id, ...e, createdAt: new Date().toISOString() });
    });
    return { ok: true } as T;
  }

  if (p === "/api/notifications/read") {
    const ids = new Set(body.ids as string[]);
    update((d) => d.notifications.forEach((n) => ids.has(n.id) && (n.read = true)));
    return { ok: true } as T;
  }
  if (p === "/api/clubs" && method === "PATCH") {
    update((d) => Object.assign(d.clubs.find((c) => c.id === me.id)!, body));
    return { ok: true } as T;
  }
  if (p === "/api/capabilities" && method === "DELETE") {
    const id = url.searchParams.get("id");
    update((d) => void (d.capabilities = d.capabilities.filter((c) => c.id !== id)));
    return { ok: true } as T;
  }
  if (p === "/api/capabilities") {
    const { id, availableFrom, availableTo, ...rest } = body as Record<string, unknown> & { id?: string; availableFrom?: string; availableTo?: string };
    const data = {
      ...rest,
      availableFrom: availableFrom ? new Date(`${availableFrom}T00:00:00`).toISOString() : null,
      availableTo: availableTo ? new Date(`${availableTo}T23:59:59`).toISOString() : null,
    };
    const newId = id ?? demoId("cap");
    update((d) => {
      const existing = d.capabilities.find((c) => c.id === id);
      if (existing) Object.assign(existing, data);
      else d.capabilities.push({ ...(data as unknown as Capability), id: newId, clubId: me.id, createdAt: new Date().toISOString() });
    });
    return { id: newId, embedded: false } as T;
  }
  if (p === "/api/events/generate-description") {
    const lines = String(body.bullets).split(/\n|•|- /).map((x) => x.trim().replace(/[.;]+$/, "")).filter(Boolean);
    const title = body.title ? String(body.title) : "This event";
    return {
      description: `${title} is hosted by ${me.name}, ${me.college}. ${lines.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(". ")}. Bring your friends and join us!`,
      generatedBy: "llm",
    } as T;
  }
  if ((m = p.match(/^\/api\/events\/([^/]+)\/rsvp$/))) {
    let going = false;
    update((d) => {
      const list = (d.rsvps[m![1]] ??= []);
      const ev = d.events.find((e) => e.id === m![1])!;
      const i = list.findIndex((r) => r.uid === DEMO_UID);
      if (i >= 0) {
        list.splice(i, 1);
        ev.rsvpCount--;
      } else {
        list.push({ id: DEMO_UID, uid: DEMO_UID, college: me.college, createdAt: new Date().toISOString() });
        ev.rsvpCount++;
        going = true;
      }
    });
    return { going } as T;
  }
  if (p === "/api/events") {
    const id = demoId("ev");
    update((d) =>
      void d.events.push({
        id,
        title: String(body.title),
        description: String(body.description ?? ""),
        hostClubIds: [me.id],
        date: String(body.date),
        city: String(body.city),
        mode: body.mode as "offline",
        tags: (body.tags as string[]) ?? [],
        rsvpCount: 0,
        createdAt: new Date().toISOString(),
      }),
    );
    return { id } as T;
  }

  throw new DemoError(`Demo mode doesn't support ${method} ${p}`, 501);
}
