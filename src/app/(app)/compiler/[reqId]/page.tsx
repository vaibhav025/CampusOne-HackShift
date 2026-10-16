"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { InviteAction } from "@/components/compiler/invite-action";
import { MatchesSection } from "@/components/compiler/matches-section";
import { ParsedEditor } from "@/components/compiler/parsed-editor";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { collection, query, where } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { useCollection, useDocument } from "@/lib/hooks";
import type { CollabRequest, CompilerRequest } from "@/lib/types";

export default function CompilerResultPage() {
  const { reqId } = useParams<{ reqId: string }>();
  const { club } = useAuth();
  const request = useDocument<CompilerRequest>(`compilerRequests/${reqId}`);
  const [rematching, setRematching] = useState(false);
  const sent = useCollection<CollabRequest>(
    () => query(collection(clientDb(), "collabRequests"), where("compilerRequestId", "==", reqId)),
    `collab-requests-${reqId}`,
  );

  async function rematch() {
    setRematching(true);
    try {
      await api("/api/compiler/match", { body: { reqId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setRematching(false);
    }
  }

  if (request.loading) return <LoadingState />;
  if (!request.data) return <ErrorState message="This request doesn't exist." />;
  const r = request.data;
  const isOwner = r.clubId === club?.id;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/compiler" className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-ink">
          <ArrowLeft className="size-3.5" /> New collaboration
        </Link>
        <p className="mt-4 border-l-2 border-line pl-3 text-[13px] italic text-muted">
          &ldquo;{r.rawText}&rdquo;
          <span className="not-italic text-muted/70"> · {r.parsedBy === "fallback" ? "read with built-in rules" : "read by AI"}</span>
        </p>
      </div>

      <ParsedEditor reqId={reqId} parsed={r.parsed} editable={isOwner} onRematch={rematch} rematching={rematching} />

      <div>
        <h2 className="text-base font-semibold">Clubs that can help</h2>
        <p className="mb-6 mt-1 text-[13px] text-muted">Hover a percentage to see how it was worked out. Reasons come from what each club listed and its track record.</p>
        <MatchesSection
          reqId={reqId}
          parsed={r.parsed}
          renderAction={
            isOwner
              ? (m) => (
                  <InviteAction
                    reqId={reqId}
                    match={m}
                    existing={sent.data.find((x) => x.toClubId === m.clubId && x.needId === m.needId && x.status !== "declined")}
                  />
                )
              : undefined
          }
        />
      </div>
    </div>
  );
}
