"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, orderBy, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ClubAvatar } from "@/components/club-avatar";
import { Kanban } from "@/components/workspace/kanban";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState, Spinner } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { clientDb } from "@/lib/firebase/client";
import { useClubMap, useCollection, useDocument, useNow } from "@/lib/hooks";
import { cn, formatDate, toDate } from "@/lib/utils";
import type { Collaboration, Task } from "@/lib/types";

export default function WorkspacePage() {
  const { collabId } = useParams<{ collabId: string }>();
  const { club } = useAuth();
  const now = useNow();
  const collab = useDocument<Collaboration>(`collaborations/${collabId}`);
  const tasks = useCollection<Task>(
    () => query(collection(clientDb(), "tasks"), where("collabId", "==", collabId), orderBy("order")),
    `tasks-${collabId}`,
  );
  const { map: clubs } = useClubMap();
  const [confirming, setConfirming] = useState(false);
  const [completing, setCompleting] = useState(false);

  if (collab.loading) return <LoadingState />;
  if (!collab.data) return <ErrorState message="This workspace doesn't exist." />;
  const c = collab.data;
  const member = c.clubIds.includes(club!.id);
  const isHost = c.hostClubId === club!.id;
  const eventDate = toDate(c.eventDate);
  const daysLeft = eventDate ? Math.ceil((eventDate.getTime() - now) / 86_400_000) : null;
  const done = tasks.data.filter((t) => t.status === "done").length;
  const overdue = tasks.data.filter((t) => t.status !== "done" && (toDate(t.dueDate)?.getTime() ?? Infinity) < now).length;
  const progress = tasks.data.length ? done / tasks.data.length : 0;

  async function complete() {
    setCompleting(true);
    try {
      await api("/api/workspace/complete", { body: { collabId } });
      toast.success("Marked as finished. We've asked every club for feedback.");
      setConfirming(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't finish it");
    } finally {
      setCompleting(false);
    }
  }

  const statusLine =
    c.status === "completed"
      ? "Finished"
      : c.status === "abandoned"
        ? "Dropped"
        : daysLeft == null
          ? "Date not set"
          : daysLeft > 1
            ? `${daysLeft} days to go`
            : daysLeft === 1
              ? "Tomorrow"
              : daysLeft === 0
                ? "Today"
                : "Event date has passed";

  return (
    <div className="space-y-10">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold">{c.title}</h1>
            <p className="mt-1 text-[13px] text-muted">
              {formatDate(c.eventDate, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
              <span className={cn(daysLeft != null && daysLeft <= 7 && c.status === "ongoing" && "font-medium text-warn")}>{statusLine}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {c.meetLink && (
              <a href={c.meetLink} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "secondary" })}>
                {c.meetIsFallback ? "Add kickoff call" : "Join kickoff call"} <ArrowUpRight />
              </a>
            )}
            {c.status === "completed" && member && (
              <Link href={`/workspaces/${collabId}/feedback`} className={buttonVariants()}>
                Leave feedback
              </Link>
            )}
            {isHost && c.status === "ongoing" && (
              <Button variant="outline" onClick={() => setConfirming(true)}>
                Mark as finished
              </Button>
            )}
          </div>
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
          {c.clubIds.map((id) => (
            <li key={id}>
              <Link href={`/clubs/${id}`} className="group flex items-center gap-2">
                <ClubAvatar name={clubs[id]?.name ?? "?"} size="sm" />
                <span className="leading-tight">
                  <span className="block text-[13px] font-medium group-hover:underline">{clubs[id]?.name ?? "…"}</span>
                  <span className="block text-xs text-muted">{c.roles?.[id] ?? (id === c.hostClubId ? "Host" : "Partner")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Tasks</h2>
            <p className="mt-0.5 text-xs text-muted">
              {done} of {tasks.data.length} done
              {overdue > 0 && <span className="font-medium text-danger"> · {overdue} overdue</span>} · first draft written by AI, edit freely
            </p>
          </div>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-snappy" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        {tasks.loading ? (
          <LoadingState />
        ) : tasks.data.length === 0 ? (
          <EmptyState title="Writing your task list" description="Tasks with owners and due dates will appear here in a moment." />
        ) : (
          <Kanban tasks={tasks.data} clubs={clubs} clubOrder={c.clubIds} readOnly={!member || c.status !== "ongoing"} />
        )}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming} title="Mark this collaboration as finished?" description="Every club gets asked for feedback, and the passports update straight away.">
        {tasks.data.length - done > 0 && (
          <p className="mb-4 text-[13px] text-muted">
            {tasks.data.length - done} task{tasks.data.length - done === 1 ? " is" : "s are"} still open. They&apos;ll stay on the board.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Not yet
          </Button>
          <Button onClick={complete} disabled={completing}>
            {completing && <Spinner />} Mark as finished
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
