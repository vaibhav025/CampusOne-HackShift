"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, orderBy, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { CalendarDays, CalendarPlus, Check, ExternalLink, Inbox, LayoutGrid, Send, Video, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/app-shell";
import { CapabilityTypeBadge } from "@/components/capability-card";
import { ClubAvatar } from "@/components/club-avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton, Spinner } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import { clientDb } from "@/lib/firebase/client";
import { useClubMap, useCollection } from "@/lib/hooks";
import { formatDate, timeAgo } from "@/lib/utils";
import type { Club, CollabRequest } from "@/lib/types";

const STATUS_VARIANT = { pending: "warn", accepted: "good", declined: "muted" } as const;

export default function RequestsPage() {
  const { club } = useAuth();
  const id = club!.id;
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const { map: clubs } = useClubMap();
  const incoming = useCollection<CollabRequest>(
    () => query(collection(clientDb(), "collabRequests"), where("toClubId", "==", id), orderBy("createdAt", "desc")),
    `incoming-${id}`,
  );
  const outgoing = useCollection<CollabRequest>(
    () => query(collection(clientDb(), "collabRequests"), where("fromClubId", "==", id), orderBy("createdAt", "desc")),
    `outgoing-${id}`,
  );
  const list = tab === "incoming" ? incoming : outgoing;
  const pendingCount = incoming.data.filter((r) => r.status === "pending").length;

  return (
    <>
      <PageHeader title="Collaboration requests" description="Invites from other clubs, and the ones you've sent." />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "incoming", label: <>Incoming {pendingCount > 0 && <span className="ml-1 rounded-full bg-warn px-1.5 text-[10px] text-canvas">{pendingCount}</span>}</> },
          { value: "outgoing", label: "Outgoing" },
        ]}
      />
      {list.loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : list.data.length === 0 ? (
        <EmptyState
          icon={tab === "incoming" ? <Inbox /> : <Send />}
          title={tab === "incoming" ? "No requests yet" : "You haven't sent any invites"}
          description={tab === "incoming" ? "List capabilities so other clubs can find you." : "Use the Compiler to find partners and send invites."}
          action={tab === "outgoing" && <Link href="/compiler" className={buttonVariants({ size: "sm" })}>Open the Compiler</Link>}
        />
      ) : (
        <div className="space-y-3">
          {list.data.map((r) => (
            <RequestCard key={r.id} request={r} direction={tab} other={clubs[tab === "incoming" ? r.fromClubId : r.toClubId]} />
          ))}
        </div>
      )}
    </>
  );
}

function RequestCard({ request: r, direction, other }: { request: CollabRequest; direction: "incoming" | "outgoing"; other?: Club }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | "meet" | null>(null);

  async function respond(action: "accept" | "decline") {
    setBusy(action);
    try {
      const res = await api<{ collabId?: string; meetLink?: string }>(`/api/requests/${r.id}/respond`, { body: { action } });
      if (action === "accept") {
        toast.success("Accepted! Your shared workspace is ready.", {
          description: res.meetLink ? "Kickoff call proposed. Add it to your calendar." : undefined,
          action: res.collabId ? { label: "Open workspace", onClick: () => router.push(`/workspaces/${res.collabId}`) } : undefined,
        });
      } else toast("Request declined");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function proposeTime() {
    setBusy("meet");
    try {
      await api("/api/calendar/create-meet", { body: { requestId: r.id } });
      toast.success("Kickoff time proposed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not schedule");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ClubAvatar name={other?.name ?? "?"} logoURL={other?.logoURL} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {direction === "incoming" ? "From " : "To "}
              <Link href={`/clubs/${other?.id ?? ""}`} className="hover:underline">{other?.name ?? "…"}</Link>
            </p>
            <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
            {r.needType && <CapabilityTypeBadge type={r.needType} />}
            <span className="ml-auto text-xs text-muted">{timeAgo(r.createdAt)}</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            <CalendarDays className="size-3" /> {r.eventTitle}
            {r.eventDate ? ` · ${formatDate(r.eventDate)}` : ""} · {other?.college}
          </p>
          {r.subject && <p className="mt-3 text-sm font-medium">{r.subject}</p>}
          <p className="mt-1 whitespace-pre-line text-sm text-muted">{r.message}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {direction === "incoming" && r.status === "pending" && (
              <>
                <Button size="sm" variant="good" onClick={() => respond("accept")} disabled={busy !== null}>
                  {busy === "accept" ? <Spinner /> : <Check />} Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => respond("decline")} disabled={busy !== null}>
                  {busy === "decline" ? <Spinner /> : <X />} Decline
                </Button>
              </>
            )}
            {r.status === "accepted" && (
              <>
                {r.meetLink ? (
                  <a href={r.meetLink} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "secondary" })}>
                    {r.meetIsFallback ? <CalendarPlus /> : <Video />} {r.meetIsFallback ? "Add kickoff to calendar" : "Join Google Meet"} <ExternalLink className="opacity-60" />
                  </a>
                ) : (
                  <Button size="sm" variant="secondary" onClick={proposeTime} disabled={busy !== null}>
                    {busy === "meet" ? <Spinner /> : <CalendarPlus />} Propose a time
                  </Button>
                )}
                {r.collabId && (
                  <Link href={`/workspaces/${r.collabId}`} className={buttonVariants({ size: "sm" })}>
                    <LayoutGrid /> Open workspace
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
