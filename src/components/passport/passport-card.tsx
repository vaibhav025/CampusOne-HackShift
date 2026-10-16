"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ChevronRight, Info } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { cn, formatDate, pct } from "@/lib/utils";
import type { Passport } from "@/lib/passport";

type EvidenceKey = "identity" | "collaborations" | "tasks" | "ratings" | "repeat" | "responses";

export function PassportCard({ clubId }: { clubId: string }) {
  const [data, setData] = useState<{ id: string; passport: Passport | null; error: string | null } | null>(null);
  const [open, setOpen] = useState<EvidenceKey | null>(null);

  useEffect(() => {
    let alive = true;
    api<Passport>(`/api/passport/${clubId}`)
      .then((p) => alive && setData({ id: clubId, passport: p, error: null }))
      .catch((e) => alive && setData({ id: clubId, passport: null, error: e instanceof Error ? e.message : "Failed" }));
    return () => {
      alive = false;
    };
  }, [clubId]);

  const current = data?.id === clubId ? data : null;
  if (!current) return <Skeleton className="h-56" />;
  if (!current.passport) return <ErrorState message={`Couldn't load the trust passport: ${current.error}`} />;
  const { metrics: m, badges } = current.passport;
  const isNew = m.collaborations.completed === 0 && m.collaborations.abandoned === 0;

  const figures: { key: EvidenceKey; value: string; label: string; detail: string; warn?: boolean }[] = [
    {
      key: "collaborations",
      value: `${m.collaborations.completed}`,
      label: "finished",
      detail: m.collaborations.ongoing ? `${m.collaborations.ongoing} running now` : "collaborations",
    },
    {
      key: "collaborations",
      value: `${m.collaborations.abandoned}`,
      label: "dropped",
      detail: m.collaborations.abandonmentRate != null ? `${pct(m.collaborations.abandonmentRate)} of finished ones` : "none so far",
      warn: m.collaborations.abandoned > 0,
    },
    {
      key: "tasks",
      value: m.onTime.total ? `${m.onTime.onTime}/${m.onTime.total}` : "–",
      label: "tasks on time",
      detail: m.onTime.total ? pct(m.onTime.rate) : "no tasks yet",
      warn: (m.onTime.rate ?? 1) < 0.7,
    },
    {
      key: "ratings",
      value: m.rating.average != null ? m.rating.average.toFixed(1) : "–",
      label: "partner rating",
      detail: m.rating.count ? `from ${m.rating.count} clubs` : "no reviews yet",
    },
    {
      key: "repeat",
      value: String(m.repeatPartners.count),
      label: "repeat partners",
      detail: "came back for more",
    },
    {
      key: "responses",
      value: m.responseTime.averageHours != null ? `${m.responseTime.averageHours}h` : "–",
      label: "to reply",
      detail: m.responseTime.count ? `average, ${m.responseTime.count} requests` : "no requests yet",
    },
  ];

  return (
    <section id="passport" className="scroll-mt-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Trust passport</h2>
        <p className="text-xs text-muted">Every number opens the records behind it.</p>
      </div>

      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        <button
          onClick={() => setOpen("identity")}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors duration-150 hover:bg-surface-2/60"
        >
          <BadgeCheck className={cn("size-4 shrink-0", m.verified.value ? "text-good" : "text-muted")} />
          <span className="min-w-0 flex-1">
            {m.verified.value ? (
              <>
                Verified institution. Admin signed in with <span className="font-mono text-xs">@{m.verified.domain}</span>
              </>
            ) : (
              <span className="text-muted">Not verified yet. The admin&apos;s email doesn&apos;t match the college domain.</span>
            )}
          </span>
          <ChevronRight className="size-4 text-muted/60" />
        </button>

        {isNew ? (
          <div className="border-t border-line px-4 py-6">
            <p className="font-medium">No collaborations yet</p>
            <p className="mt-1 max-w-lg text-[13px] text-muted">
              This club is new. When we rank partners, clubs without history get a neutral track-record score, so being new never counts against them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            {figures.map((f) => (
              <button
                key={f.label}
                onClick={() => setOpen(f.key)}
                className="bg-surface px-4 py-4 text-left transition-colors duration-150 hover:bg-surface-2"
              >
                <p className={cn("text-[22px] font-semibold tabular-nums tracking-[-0.02em]", f.warn && "text-warn")}>{f.value}</p>
                <p className="text-[13px]">{f.label}</p>
                <p className="mt-0.5 text-xs text-muted">{f.detail}</p>
              </button>
            ))}
          </div>
        )}

        {badges.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-2/40 px-4 py-2.5">
            {badges.map((b) => (
              <span key={b.id} className="group relative inline-flex cursor-help items-center gap-1 text-xs">
                <span className={cn("size-1.5 rounded-full", b.tone === "warn" ? "bg-warn" : b.tone === "good" ? "bg-good" : "bg-ink/70")} />
                <span className={cn(b.tone === "warn" ? "font-medium text-warn" : "text-ink")}>{b.label}</span>
                <Info className="size-3 text-muted/60" />
                <span className="cc-pop absolute left-0 top-full z-20 mt-1.5 w-56 rounded-md bg-surface p-2.5 text-xs text-muted shadow-pop [transform-origin:top_left]">
                  {b.rule}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <EvidenceDrawer open={open} onClose={() => setOpen(null)} passport={current.passport} />
    </section>
  );
}

function Row({ children, flag }: { children: React.ReactNode; flag?: boolean }) {
  return <li className={cn("py-3", flag && "-mx-2 rounded-md bg-warn/[0.07] px-2")}>{children}</li>;
}

function EvidenceDrawer({ open, onClose, passport }: { open: EvidenceKey | null; onClose: () => void; passport: Passport }) {
  const { metrics: m, evidence: e } = passport;
  const titles: Record<EvidenceKey, [string, string]> = {
    identity: ["Verified institution", "How we checked this club belongs to its college"],
    collaborations: ["Collaborations", `${m.collaborations.completed} finished, ${m.collaborations.abandoned} dropped, ${m.collaborations.ongoing} running`],
    tasks: ["Tasks on time", `${m.onTime.onTime} of ${m.onTime.total} done by their due date. Open tasks count once they're overdue.`],
    ratings: ["What partners said", m.rating.average != null ? `Average ${m.rating.average} from ${m.rating.count} clubs` : "No ratings yet"],
    repeat: ["Repeat partners", "Clubs that finished two or more collaborations with them"],
    responses: ["Reply time", m.responseTime.averageHours != null ? `${m.responseTime.averageHours} hours on average` : "No replies yet"],
  };
  if (!open) return null;
  const [title, description] = titles[open];

  return (
    <Dialog open side="right" onOpenChange={(o) => !o && onClose()} title={title} description={description}>
      <ul className="divide-y divide-line text-[13px]">
        {open === "identity" && (
          <Row>
            {m.verified.value ? (
              <>
                <p>
                  The admin signed in with a Google account on <span className="font-mono text-xs">@{m.verified.domain}</span>, which matches the college&apos;s domain.
                </p>
                {m.verified.verifiedAt && <p className="mt-1 text-xs text-muted">Checked on {formatDate(m.verified.verifiedAt)}</p>}
              </>
            ) : (
              <p className="text-muted">Not verified yet.</p>
            )}
          </Row>
        )}
        {open === "collaborations" &&
          e.collaborations.map((c) => (
            <Row key={c.id} flag={c.countsAsAbandoned}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{c.title}</p>
                <span className={cn("shrink-0 text-xs", c.status === "abandoned" ? "font-medium text-warn" : "text-muted")}>
                  {c.status === "completed" ? "Finished" : c.status === "abandoned" ? "Dropped" : "Running"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                with {c.partners.join(", ")} · {formatDate(c.eventDate)}
              </p>
              {c.note && <p className="mt-1 text-xs text-muted">{c.note}</p>}
            </Row>
          ))}
        {open === "tasks" &&
          e.tasks
            .filter((t) => t.onTime !== null)
            .map((t) => (
              <Row key={t.id} flag={!t.onTime}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{t.title}</p>
                  <span className={cn("shrink-0 text-xs", t.onTime ? "text-good" : "font-medium text-warn")}>{t.onTime ? "On time" : "Late"}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {t.collabTitle} · due {formatDate(t.dueDate)} · {t.completedAt ? `done ${formatDate(t.completedAt)}` : "not done"}
                </p>
              </Row>
            ))}
        {open === "ratings" &&
          e.ratings.map((r, i) => (
            <Row key={i} flag={r.rating <= 2}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{r.fromClub}</p>
                <span className="shrink-0 font-mono text-xs tabular-nums">{r.rating}/5</span>
              </div>
              <p className="mt-1 text-muted">&ldquo;{r.comment}&rdquo;</p>
              <p className="mt-1 text-xs text-muted">
                {r.wouldCollabAgain ? "Would work with them again" : "Wouldn't work with them again"} · {formatDate(r.date)}
              </p>
            </Row>
          ))}
        {open === "repeat" &&
          (e.repeatPartners.length ? (
            e.repeatPartners.map((p) => (
              <Row key={p.clubId}>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted">{p.completedTogether} collaborations finished together</p>
              </Row>
            ))
          ) : (
            <Row>
              <p className="text-muted">No repeat partners yet.</p>
            </Row>
          ))}
        {open === "responses" &&
          e.responses.map((r, i) => (
            <Row key={i} flag={r.hours != null && r.hours >= 24}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">From {r.fromClub}</p>
                <span className="shrink-0 font-mono text-xs tabular-nums">{r.hours != null ? `${r.hours}h` : "waiting"}</span>
              </div>
              <p className="text-xs text-muted">
                Received {formatDate(r.createdAt)} · {r.status}
              </p>
            </Row>
          ))}
      </ul>
    </Dialog>
  );
}
