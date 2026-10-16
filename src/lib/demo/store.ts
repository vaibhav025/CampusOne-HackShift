"use client";

// Frontend-only demo mode: the whole app runs on an in-memory copy of the
// seed data (persisted to localStorage), with the same pure logic the server
// uses for parsing, matching and the Trust Passport. No Firebase or API keys.
import { buildSeed } from "@/lib/demo/seed-data";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { dueDateFor, planTasks } from "@/lib/task-templates";
import { toDate } from "@/lib/utils";
import { TEAM } from "@/lib/emails";
import type {
  Capability,
  Club,
  Collaboration,
  CollabRequest,
  CompilerRequest,
  EventDoc,
  Feedback,
  Match,
  NotificationDoc,
  Task,
} from "@/lib/types";

export const isDemo = !isFirebaseConfigured || process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_UID = "demo-user";
export const HOST_CLUB_ID = "coding-club-ggsipu";
export const PARTNER_CLUB_ID = "cybersec-society-nitd";

export interface DemoState {
  version: number;
  signedIn: boolean;
  currentClubId: string;
  clubs: Club[];
  capabilities: Capability[];
  events: EventDoc[];
  rsvps: Record<string, { id: string; uid: string; college: string; createdAt: unknown }[]>;
  collaborations: Collaboration[];
  tasks: Task[];
  feedback: Feedback[];
  collabRequests: CollabRequest[];
  notifications: NotificationDoc[];
  compilerRequests: CompilerRequest[];
  matches: Record<string, Match[]>;
}

const VERSION = 6;
const STORAGE_KEY = "campusone-demo";
const DAY = 86_400_000;

function initialState(): DemoState {
  const now = new Date();
  const seed = buildSeed({ now });
  const withId = <T>(docs: { id: string; data: Record<string, unknown> }[]) => docs.map((d) => ({ id: d.id, ...d.data }) as T);
  const at = (days: number, hours = 0) => new Date(now.getTime() + days * DAY + hours * 3_600_000);

  const clubs = withId<Club>(seed.clubs).map((c) =>
    c.id === HOST_CLUB_ID || c.id === PARTNER_CLUB_ID ? { ...c, adminUids: [DEMO_UID] } : c,
  );
  const tasks = withId<Task>(seed.tasks);
  const collaborations = withId<Collaboration>(seed.collaborations);

  // An ongoing collaboration for the host so the workspace has something to show.
  const wsId = "demo-code-for-good";
  const wsDate = at(12);
  collaborations.push({
    id: wsId,
    title: "Code for Good Weekend",
    clubIds: [HOST_CLUB_ID, "greenearth-amity", "lens-light-dtu"],
    hostClubId: HOST_CLUB_ID,
    compilerRequestId: "",
    status: "ongoing",
    eventDate: wsDate,
    startedAt: at(-9),
    roles: { [HOST_CLUB_ID]: "Host", "greenearth-amity": "Volunteers", "lens-light-dtu": "Camera / Photo" },
    meetLink: "https://meet.google.com/cfg-wknd-dmo",
    meetIsFallback: false,
    inactiveFlag: null,
  });
  const plan = planTasks(HOST_CLUB_ID, [
    { clubId: "greenearth-amity", type: "volunteers" },
    { clubId: "lens-light-dtu", type: "camera" },
  ]);
  plan.forEach((t, i) => {
    const due = new Date(wsDate.getTime() - t.daysBeforeEvent * DAY);
    const status = i < 2 ? "done" : i < 4 ? "doing" : "todo";
    tasks.push({
      id: `${wsId}-t${i}`,
      collabId: wsId,
      title: t.title,
      description: t.description,
      ownerClubId: t.ownerClubId,
      dueDate: i === 3 ? at(-1) : due, // one overdue task to show the red pill
      status,
      completedAt: status === "done" ? new Date(due.getTime() - DAY) : null,
      order: i,
    });
  });

  const collabRequests = withId<CollabRequest>(seed.collabRequests);
  collabRequests.push(
    {
      id: "demo-incoming-ge",
      fromClubId: "greenearth-amity",
      toClubId: HOST_CLUB_ID,
      compilerRequestId: "",
      needId: "n1",
      needType: "tech_support",
      capabilityId: `${HOST_CLUB_ID}--tech_support-0`,
      subject: "Tech support for Climate Hack 2.0?",
      message:
        "Hi Coding Club! GreenEarth is hosting Climate Hack 2.0 next month for 150 students. Your hackathon judging platform and dev team would be perfect for running submissions. Would you partner with us?",
      status: "pending",
      createdAt: at(0, -3),
      eventTitle: "Climate Hack 2.0",
      eventDate: at(35).toISOString().slice(0, 10),
    },
    {
      id: "demo-incoming-fc",
      fromClubId: "founders-cell-jmi",
      toClubId: PARTNER_CLUB_ID,
      compilerRequestId: "",
      needId: "n1",
      needType: "mentor",
      capabilityId: `${PARTNER_CLUB_ID}--mentor-0`,
      subject: "Security mentors for Startup Pitch Night",
      message: "Hi CyberSec Society! Could two of your mentors judge the security round at our Startup Pitch Night?",
      status: "pending",
      createdAt: at(0, -6),
      eventTitle: "Startup Pitch Night",
      eventDate: at(18).toISOString().slice(0, 10),
    },
  );

  const notifications: NotificationDoc[] = [
    { id: "dn1", clubId: HOST_CLUB_ID, type: "collab_request", title: "GreenEarth Club invited you to collaborate on Climate Hack 2.0", link: "/requests", read: false, createdAt: at(0, -3) },
    { id: "dn2", clubId: HOST_CLUB_ID, type: "meet_scheduled", title: "Google Meet scheduled with Lens & Light Society for Code for Good Weekend", link: `/workspaces/${wsId}`, read: false, createdAt: at(-1) },
    { id: "dn3", clubId: HOST_CLUB_ID, type: "task_due", title: "\"Brief volunteers and run-of-show\" is overdue", link: `/workspaces/${wsId}`, read: true, createdAt: at(-1, -5) },
    { id: "dn4", clubId: HOST_CLUB_ID, type: "request_accepted", title: "GreenEarth Club accepted your invite for Code for Good Weekend", link: `/workspaces/${wsId}`, read: true, createdAt: at(-9) },
    { id: "dn5", clubId: PARTNER_CLUB_ID, type: "collab_request", title: "Founders' Cell invited you to collaborate on Startup Pitch Night", link: "/requests", read: false, createdAt: at(0, -6) },
  ];

  const rsvps: DemoState["rsvps"] = {};
  for (const e of seed.events) rsvps[e.id] = e.rsvps.map((r) => ({ id: r.uid, ...r }));

  return {
    version: VERSION,
    signedIn: true,
    currentClubId: HOST_CLUB_ID,
    clubs,
    capabilities: withId<Capability>(seed.capabilities),
    events: seed.events.map((e) => ({ id: e.id, ...e.data }) as EventDoc),
    rsvps,
    collaborations,
    tasks,
    feedback: withId<Feedback>(seed.feedback),
    collabRequests,
    notifications,
    compilerRequests: [],
    matches: {},
  };
}

let state: DemoState | null = null;
const listeners = new Set<() => void>();

function load(): DemoState {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === VERSION) return parsed;
    }
  } catch {
    /* storage unavailable: fall through to a fresh seed */
  }
  return initialState();
}

export function getState(): DemoState {
  state ??= load();
  return state;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Applies a mutation to a copy of the state, persists it and notifies subscribers. */
export function update(mutate: (draft: DemoState) => void) {
  const draft = structuredClone(getState());
  mutate(draft);
  state = draft;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function resetDemo() {
  state = initialState();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const demoId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---- Query resolution: maps each page's query key / document path to data --

const time = (v: unknown) => toDate(v)?.getTime() ?? 0;
const desc = <T extends { createdAt: unknown }>(xs: T[]) => [...xs].sort((a, b) => time(b.createdAt) - time(a.createdAt));

export function resolveCollection(key: string, s: DemoState): unknown[] {
  const arg = (prefix: string) => (key.startsWith(prefix) ? key.slice(prefix.length) : null);
  let a: string | null;

  if (["club-map", "all-clubs", "explore-clubs", "onboarding-clubs"].includes(key)) return s.clubs;
  if (key === "explore-caps") return s.capabilities.filter((c) => c.active);
  if (key === "events-feed") return s.events;
  if ((a = arg("pending-badge-")) !== null || (a = arg("pending-")) !== null)
    return desc(s.collabRequests.filter((r) => r.toClubId === a && r.status === "pending"));
  if ((a = arg("notifs-")) !== null) return desc(s.notifications.filter((n) => n.clubId === a)).slice(0, 15);
  if ((a = arg("collabs-")) !== null) return s.collaborations.filter((c) => c.clubIds.includes(a!));
  if ((a = arg("club-caps-")) !== null || (a = arg("my-caps-")) !== null) return s.capabilities.filter((c) => c.clubId === a);
  if ((a = arg("club-events-")) !== null) return s.events.filter((e) => e.hostClubIds.includes(a!));
  if ((a = arg("rsvps-")) !== null) return s.rsvps[a] ?? [];
  if ((a = arg("compiler-recent-")) !== null) return s.compilerRequests.filter((r) => r.clubId === a);
  if ((a = arg("matches-")) !== null) return s.matches[a] ?? [];
  if ((a = arg("incoming-")) !== null) return desc(s.collabRequests.filter((r) => r.toClubId === a));
  if ((a = arg("outgoing-")) !== null) return desc(s.collabRequests.filter((r) => r.fromClubId === a));
  if ((a = arg("collab-requests-")) !== null) return s.collabRequests.filter((r) => r.compilerRequestId === a);
  if ((a = arg("tasks-")) !== null) return s.tasks.filter((t) => t.collabId === a).sort((x, y) => x.order - y.order);
  if ((a = arg("feedback-")) !== null) return s.feedback.filter((f) => f.collabId === a);
  console.warn(`[demo] unknown query key: ${key}`);
  return [];
}

export function resolveDocument(path: string, s: DemoState): unknown | null {
  const parts = path.split("/");
  const find = <T extends { id: string }>(xs: T[], id: string) => xs.find((x) => x.id === id) ?? null;
  if (parts[0] === "events" && parts[2] === "rsvps") return (s.rsvps[parts[1]] ?? []).find((r) => r.uid === parts[3]) ?? null;
  switch (parts[0]) {
    case "clubs": return find(s.clubs, parts[1]);
    case "events": return find(s.events, parts[1]);
    case "compilerRequests": return find(s.compilerRequests, parts[1]);
    case "collaborations": return find(s.collaborations, parts[1]);
    case "collabRequests": return find(s.collabRequests, parts[1]);
    case "users": { const p = s.currentClubId === HOST_CLUB_ID ? TEAM.host : TEAM.partner; return { id: DEMO_UID, uid: DEMO_UID, name: p.name, email: p.email, photoURL: "", clubId: s.currentClubId, role: "admin", createdAt: null } }
  }
  return null;
}

/** Creates the workspace task board for a new collaboration (template plan). */
export function createTasksFor(draft: DemoState, collab: Collaboration, partners: { clubId: string; type: Capability["type"] | null }[]) {
  const eventDate = toDate(collab.eventDate);
  planTasks(collab.hostClubId, partners).forEach((t, i) => {
    draft.tasks.push({
      id: demoId("task"),
      collabId: collab.id,
      title: t.title,
      description: t.description,
      ownerClubId: t.ownerClubId,
      dueDate: dueDateFor(eventDate, t.daysBeforeEvent),
      status: "todo",
      completedAt: null,
      order: i,
    });
  });
}
