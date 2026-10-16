"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { ClubAvatar } from "@/components/club-avatar";
import { WEIGHTS } from "@/lib/matching";
import { cn, pct } from "@/lib/utils";
import type { Match } from "@/lib/types";

function Part({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-mono text-xs tabular-nums">
        {value.toFixed(2)} <span className="text-muted">× {weight}</span>
      </span>
      <div className="col-span-2 h-1 rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-ink/70" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

/** Match % with the explainable breakdown on hover/focus (spec Section 9, step 3). */
export function ScoreBadge({ match }: { match: Match }) {
  const s = match.scores;
  return (
    <div className="group relative">
      <button
        className="rounded-md px-1.5 py-0.5 font-mono text-[15px] font-medium tabular-nums transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
        aria-label={`Match ${Math.round(s.final * 100)}%. Semantic ${s.semantic.toFixed(2)}, logistics ${s.logistics.toFixed(2)}, reliability ${s.reliability.toFixed(2)}`}
      >
        {Math.round(s.final * 100)}%
      </button>
      <div className="cc-pop absolute right-0 top-full z-20 mt-1.5 w-60 space-y-2.5 rounded-xl bg-surface p-3 shadow-pop">
        <Part label={match.semanticMethod === "embedding" ? "Fit (embeddings)" : "Fit (shared keywords)"} value={s.semantic} weight={WEIGHTS.semantic} />
        <Part label="City and dates" value={s.logistics} weight={WEIGHTS.logistics} />
        <Part label="Track record" value={s.reliability} weight={WEIGHTS.reliability} />
        <p className="border-t border-line pt-2 font-mono text-[11px] text-muted">
          = {s.final.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

/** One ranked partner for a need. Rendered as a list row, not a card. */
export function MatchCard({ match, action }: { match: Match; action?: React.ReactNode; best?: boolean }) {
  const s = match.snapshot;
  const isNew = s.completed === 0 && s.abandoned === 0;
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
      <ClubAvatar name={s.clubName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/clubs/${match.clubId}`} className="inline-flex items-center gap-1 font-medium hover:underline">
              {s.clubName}
              {s.verified && <BadgeCheck className="size-3.5 shrink-0 text-good" aria-label="Verified institution" />}
            </Link>
            <p className="text-[13px] text-muted">
              {s.college} · <span className="text-ink">{s.capabilityTitle}</span>
            </p>
          </div>
          <ScoreBadge match={match} />
        </div>

        <ul className="mt-2 space-y-0.5 text-[13px] text-muted">
          {match.reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted/50">–</span>
              {r}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/clubs/${match.clubId}#passport`} className="text-xs text-muted transition-colors hover:text-ink">
            {isNew ? (
              <>New club, no history yet</>
            ) : (
              <>
                {s.completed} finished ·{" "}
                <span className={cn(s.abandoned > 0 && "font-medium text-warn")}>{s.abandoned} dropped</span> · {pct(s.onTimeRate)} on time
                {s.rating != null && <> · {s.rating}★</>}
              </>
            )}
            {s.risk && <span className="ml-2 rounded bg-warn/12 px-1.5 py-px font-medium text-warn">Check before inviting</span>}
          </Link>
          {action}
        </div>
      </div>
    </div>
  );
}
