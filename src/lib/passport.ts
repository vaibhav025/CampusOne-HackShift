// Campus Trust Passport (spec Section 10). Pure functions: the API route loads
// the raw documents and this module turns them into metrics, badges and the
// evidence behind every number. Nothing here is stored.
import { toDate } from "@/lib/utils";
import type { Club, Collaboration, CollabRequest, Feedback, Task } from "@/lib/types";

export interface PassportInput {
  club: Pick<Club, "id" | "verified" | "collegeDomain"> & { verifiedAt?: unknown; verifiedEmailDomain?: string | null };
  collaborations: Collaboration[];
  tasks: Task[];
  feedback: Feedback[];
  incomingRequests: CollabRequest[];
  clubNames: Record<string, string>;
  now?: Date;
}

export interface Badge {
  id: "verified" | "reliable" | "fast" | "repeat" | "ontime" | "new" | "caution";
  emoji: string;
  label: string;
  rule: string;
  tone: "good" | "accent" | "warn";
}

export interface PassportMetrics {
  verified: { value: boolean; domain: string; verifiedAt: string | null };
  collaborations: { completed: number; abandoned: number; ongoing: number; abandonmentRate: number | null };
  onTime: { onTime: number; total: number; rate: number | null };
  rating: { average: number | null; count: number; wouldCollabAgain: number };
  repeatPartners: { count: number };
  responseTime: { averageHours: number | null; count: number };
  /** completed / (completed + abandoned); neutral 0.5 when there is no history. */
  reliability: number;
  caution: boolean;
}

export interface Passport {
  clubId: string;
  metrics: PassportMetrics;
  badges: Badge[];
  evidence: {
    collaborations: {
      id: string;
      title: string;
      partners: string[];
      status: Collaboration["status"];
      eventDate: string | null;
      countsAsAbandoned: boolean;
      note?: string;
    }[];
    tasks: {
      id: string;
      title: string;
      collabTitle: string;
      dueDate: string | null;
      completedAt: string | null;
      status: Task["status"];
      onTime: boolean | null; // null = not yet counted (open and not past due)
    }[];
    ratings: { fromClub: string; rating: number; comment: string; wouldCollabAgain: boolean; date: string | null }[];
    repeatPartners: { clubId: string; name: string; completedTogether: number }[];
    responses: { fromClub: string; createdAt: string | null; respondedAt: string | null; hours: number | null; status: string }[];
  };
}

const iso = (v: unknown) => toDate(v)?.toISOString() ?? null;
const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export const BADGE_RULES: Record<Badge["id"], Omit<Badge, "id">> = {
  verified: { emoji: "✅", label: "Verified Institution", rule: "Admin's email domain matches the college domain", tone: "good" },
  reliable: { emoji: "🤝", label: "Reliable Partner", rule: "5 or more completed collaborations and none abandoned", tone: "accent" },
  fast: { emoji: "⚡", label: "Fast Responder", rule: "Average response under 24 h across 3 or more requests", tone: "accent" },
  repeat: { emoji: "🔁", label: "Repeat Choice", rule: "3 or more partner clubs completed 2+ collaborations together", tone: "accent" },
  ontime: { emoji: "🎯", label: "On-Time Deliverer", rule: "90% or more tasks on time, with 10 or more tasks", tone: "accent" },
  new: { emoji: "🌱", label: "New but Verified", rule: "Verified institution with no completed collaborations yet", tone: "good" },
  caution: { emoji: "⚠️", label: "Caution", rule: "2 or more abandoned collaborations, or abandonment rate above 30%", tone: "warn" },
};

/** Abandonment counts against the club that caused it (legacy docs without a culprit count for everyone). */
export function countsAsAbandoned(c: Collaboration, clubId: string) {
  return c.status === "abandoned" && (!c.abandonedByClubId || c.abandonedByClubId === clubId);
}

export function computePassport(input: PassportInput): Passport {
  const { club, clubNames } = input;
  const now = input.now ?? new Date();
  const name = (id: string) => clubNames[id] ?? "Unknown club";
  const mine = input.collaborations.filter((c) => c.clubIds.includes(club.id));
  const collabTitle = new Map(mine.map((c) => [c.id, c.title]));

  // Collaborations
  const completed = mine.filter((c) => c.status === "completed").length;
  const abandoned = mine.filter((c) => countsAsAbandoned(c, club.id)).length;
  const ongoing = mine.filter((c) => c.status === "ongoing").length;
  const finished = completed + abandoned;
  const abandonmentRate = finished ? abandoned / finished : null;

  // On-time delivery: tasks owned that are done, or open but past due.
  const taskEvidence = input.tasks
    .filter((t) => t.ownerClubId === club.id && collabTitle.has(t.collabId))
    .map((t) => {
      const due = toDate(t.dueDate);
      const done = toDate(t.completedAt);
      let onTime: boolean | null = null;
      if (t.status === "done" && done && due) onTime = done.getTime() <= due.getTime();
      else if (due && due.getTime() < now.getTime()) onTime = false;
      return {
        id: t.id,
        title: t.title,
        collabTitle: collabTitle.get(t.collabId) ?? "",
        dueDate: iso(t.dueDate),
        completedAt: iso(t.completedAt),
        status: t.status,
        onTime,
      };
    })
    .sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""));
  const counted = taskEvidence.filter((t) => t.onTime !== null);
  const onTimeCount = counted.filter((t) => t.onTime).length;

  // Ratings
  const received = input.feedback.filter((f) => f.toClubId === club.id);
  const avgRating = received.length ? received.reduce((s, f) => s + f.rating, 0) / received.length : null;

  // Repeat partners: distinct partners with >= 2 completed collaborations together.
  const together = new Map<string, number>();
  for (const c of mine.filter((c) => c.status === "completed")) {
    for (const p of c.clubIds) if (p !== club.id) together.set(p, (together.get(p) ?? 0) + 1);
  }
  const repeat = [...together.entries()]
    .filter(([, n]) => n >= 2)
    .map(([id, n]) => ({ clubId: id, name: name(id), completedTogether: n }))
    .sort((a, b) => b.completedTogether - a.completedTogether);

  // Response time on incoming requests
  const responses = input.incomingRequests
    .filter((r) => r.toClubId === club.id)
    .map((r) => {
      const created = toDate(r.createdAt);
      const responded = toDate(r.respondedAt);
      const hours = created && responded ? (responded.getTime() - created.getTime()) / 3_600_000 : null;
      return { fromClub: name(r.fromClubId), createdAt: iso(r.createdAt), respondedAt: iso(r.respondedAt), hours: hours == null ? null : round(hours), status: r.status };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const answered = responses.filter((r) => r.hours != null);
  const avgHours = answered.length ? answered.reduce((s, r) => s + r.hours!, 0) / answered.length : null;

  const onTimeRate = counted.length ? onTimeCount / counted.length : null;
  const caution = abandoned >= 2 || (abandonmentRate ?? 0) > 0.3;

  const metrics: PassportMetrics = {
    verified: {
      value: club.verified,
      domain: club.verifiedEmailDomain || club.collegeDomain,
      verifiedAt: iso(club.verifiedAt),
    },
    collaborations: { completed, abandoned, ongoing, abandonmentRate },
    onTime: { onTime: onTimeCount, total: counted.length, rate: onTimeRate },
    rating: {
      average: avgRating == null ? null : round(avgRating),
      count: received.length,
      wouldCollabAgain: received.filter((f) => f.wouldCollabAgain).length,
    },
    repeatPartners: { count: repeat.length },
    responseTime: { averageHours: avgHours == null ? null : round(avgHours), count: answered.length },
    reliability: finished ? completed / finished : 0.5,
    caution,
  };

  const earned: Badge["id"][] = [];
  if (club.verified) earned.push("verified");
  if (completed >= 5 && abandoned === 0) earned.push("reliable");
  if (avgHours != null && avgHours < 24 && answered.length >= 3) earned.push("fast");
  if (repeat.length >= 3) earned.push("repeat");
  if (onTimeRate != null && onTimeRate >= 0.9 && counted.length >= 10) earned.push("ontime");
  if (club.verified && completed === 0) earned.push("new");
  if (caution) earned.push("caution");

  return {
    clubId: club.id,
    metrics,
    badges: earned.map((id) => ({ id, ...BADGE_RULES[id] })),
    evidence: {
      collaborations: mine
        .map((c) => ({
          id: c.id,
          title: c.title,
          partners: c.clubIds.filter((id) => id !== club.id).map(name),
          status: c.status,
          eventDate: iso(c.eventDate),
          countsAsAbandoned: countsAsAbandoned(c, club.id),
          note:
            c.status === "abandoned" && c.abandonedByClubId && c.abandonedByClubId !== club.id
              ? `Abandoned by ${name(c.abandonedByClubId)}; not counted against this club`
              : c.inactiveFlag?.disputeNote,
        }))
        .sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? "")),
      tasks: taskEvidence,
      ratings: received
        .map((f) => ({ fromClub: name(f.fromClubId), rating: f.rating, comment: f.comment, wouldCollabAgain: f.wouldCollabAgain, date: iso(f.createdAt) }))
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
      repeatPartners: repeat,
      responses,
    },
  };
}
