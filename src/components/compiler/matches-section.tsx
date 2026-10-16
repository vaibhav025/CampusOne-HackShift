"use client";

import { collection } from "firebase/firestore";
import { MatchCard } from "@/components/compiler/match-card";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { clientDb } from "@/lib/firebase/client";
import { useCollection } from "@/lib/hooks";
import { CAPABILITY_LABELS, type Match, type ParsedRequest } from "@/lib/types";

export function MatchesSection({
  reqId,
  parsed,
  renderAction,
}: {
  reqId: string;
  parsed: ParsedRequest;
  renderAction?: (match: Match) => React.ReactNode;
}) {
  const matches = useCollection<Match>(() => collection(clientDb(), "compilerRequests", reqId, "matches"), `matches-${reqId}`);

  if (matches.loading) return <Skeleton className="h-72" />;
  if (matches.data.length === 0) {
    return <EmptyState title="No matches yet" description="Save your needs and we'll look for clubs that can help." />;
  }

  return (
    <div className="space-y-10">
      {parsed.needs.map((need) => {
        const forNeed = matches.data.filter((m) => m.needId === need.id).sort((a, b) => a.rank - b.rank);
        const rankedBy = forNeed[0]?.rankedBy;
        return (
          <section key={need.id}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-sm">
                <span className="font-semibold">{CAPABILITY_LABELS[need.type]}</span>
                <span className="text-muted"> · {need.detail}</span>
              </h3>
              {rankedBy && (
                <span className="shrink-0 text-xs text-muted" title={rankedBy === "llm" ? "Top 5 by score, then reranked by AI" : "Ordered by the computed score"}>
                  {rankedBy === "llm" ? "Reranked by AI" : "Ranked by score"}
                </span>
              )}
            </div>
            {forNeed.length === 0 ? (
              <p className="rounded-lg px-4 py-6 text-[13px] text-muted shadow-[0_0_0_1px_var(--line)]">
                No club lists a {CAPABILITY_LABELS[need.type].toLowerCase()} that fits yet. Try a different date or a smaller capacity.
              </p>
            ) : (
              <div className="cc-stagger divide-y divide-line rounded-xl bg-surface shadow-card">
                {forNeed.map((m) => (
                  <MatchCard key={m.id} match={m} action={renderAction?.(m)} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
