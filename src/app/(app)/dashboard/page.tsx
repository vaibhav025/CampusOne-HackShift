"use client";

import Link from "next/link";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ClubAvatar } from "@/components/club-avatar";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { clientDb } from "@/lib/firebase/client";
import { useClubMap, useCollection, useNow } from "@/lib/hooks";
import { cn, formatDate, timeAgo, toDate } from "@/lib/utils";
import type { Collaboration, CollabRequest, NotificationDoc } from "@/lib/types";

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { club, user } = useAuth();
  const clubId = club!.id;
  const now = useNow();
  const db = () => clientDb();
  const { map: clubs, list: allClubs, loading: clubsLoading } = useClubMap();

  const notifs = useCollection<NotificationDoc>(
    () => query(collection(db(), "notifications"), where("clubId", "==", clubId), orderBy("createdAt", "desc"), limit(15)),
    `notifs-${clubId}`,
  );
  const collabs = useCollection<Collaboration>(
    () => query(collection(db(), "collaborations"), where("clubIds", "array-contains", clubId)),
    `collabs-${clubId}`,
  );
  const pending = useCollection<CollabRequest>(
    () => query(collection(db(), "collabRequests"), where("toClubId", "==", clubId), where("status", "==", "pending"), orderBy("createdAt", "desc")),
    `pending-${clubId}`,
  );

  const ongoing = collabs.data
    .filter((c) => c.status === "ongoing")
    .sort((a, b) => (toDate(a.eventDate)?.getTime() ?? 0) - (toDate(b.eventDate)?.getTime() ?? 0));
  const completed = collabs.data.filter((c) => c.status === "completed").length;
  const unread = notifs.data.filter((n) => !n.read);
  const firstName = user?.displayName?.split(" ")[0];

  async function markAllRead() {
    if (unread.length) await api("/api/notifications/read", { body: { ids: unread.map((n) => n.id) } }).catch(() => {});
  }

  const stats = [
    { label: "Running now", value: ongoing.length, href: ongoing[0] ? `/workspaces/${ongoing[0].id}` : "/compiler" },
    { label: "Waiting on you", value: pending.data.length, href: "/requests" },
    { label: "Finished", value: completed, href: `/clubs/${clubId}` },
    { label: "Clubs you can reach", value: Math.max(0, allClubs.length - 1), href: "/explore" },
  ];

  return (
    <>
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-muted">{club!.name} · {club!.college}</p>
          <h1 className="mt-1 text-[22px] font-semibold">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <Link href="/compiler" className={buttonVariants()}>
          Plan a collaboration <ArrowRight />
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group rounded-xl bg-surface px-4 py-4 shadow-card transition-[box-shadow,background-color] duration-200 hover:bg-surface-2/60 hover:shadow-raise">
            <dd className="text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-ink">
              {collabs.loading || clubsLoading ? <Skeleton className="h-7 w-8" /> : s.value}
            </dd>
            <dt className="mt-1 text-xs text-muted transition-colors group-hover:text-sky-soft">{s.label}</dt>
          </Link>
        ))}
      </dl>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-12">
          {pending.data.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold">Needs a reply</h2>
              <ul className="cc-stagger divide-y divide-line rounded-xl bg-surface shadow-card">
                {pending.data.map((r) => (
                  <li key={r.id}>
                    <Link href="/requests" className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2/60">
                      <ClubAvatar name={clubs[r.fromClubId]?.name ?? "?"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px]">
                          <span className="font-medium">{clubs[r.fromClubId]?.name}</span> wants to work with you on {r.eventTitle}
                        </p>
                        <p className="text-xs text-muted">{timeAgo(r.createdAt)}</p>
                      </div>
                      <ChevronRight className="size-4 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold">Collaborations</h2>
            {collabs.loading ? (
              <Skeleton className="h-16" />
            ) : ongoing.length === 0 ? (
              <p className="text-[13px] text-muted">
                Nothing running yet.{" "}
                <Link href="/compiler" className="text-accent-ink hover:underline">
                  Describe your next event
                </Link>{" "}
                and we&apos;ll find clubs to do it with.
              </p>
            ) : (
              <ul className="cc-stagger space-y-2">
                {ongoing.map((c) => {
                  const days = Math.ceil(((toDate(c.eventDate)?.getTime() ?? now) - now) / 86_400_000);
                  return (
                    <li key={c.id}>
                      <Link href={`/workspaces/${c.id}`} className="flex items-center gap-4 rounded-xl px-4 py-3 shadow-card transition-colors duration-150 hover:bg-surface-2/60">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{c.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            with {c.clubIds.filter((id) => id !== clubId).map((id) => clubs[id]?.name ?? "…").join(", ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] tabular-nums">{formatDate(c.eventDate, { day: "numeric", month: "short" })}</p>
                          <p className={cn("text-xs", days <= 7 ? "text-warn" : "text-muted")}>{days > 0 ? `in ${days} days` : "today"}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Activity</h2>
            {unread.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-muted transition-colors hover:text-ink">
                Mark {unread.length} as read
              </button>
            )}
          </div>
          {notifs.loading ? (
            <Skeleton className="h-40" />
          ) : notifs.data.length === 0 ? (
            <p className="text-[13px] text-muted">Invites, kickoff calls and feedback requests will show up here.</p>
          ) : (
            <ol className="relative space-y-4 rounded-xl bg-surface p-4 shadow-card before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-gradient-to-b before:from-teal-500/40 before:to-line">
              {notifs.data.map((n) => (
                <li key={n.id} className="relative pl-6">
                  <span className={cn("absolute left-0 top-1 size-[9px] rounded-full ring-[3px] ring-surface", n.read ? "bg-slate-teal" : "bg-teal-500 shadow-[0_0_0_3px_rgb(12_150_156/0.18)]")} />
                  <Link
                    href={n.link}
                    onClick={() => !n.read && api("/api/notifications/read", { body: { ids: [n.id] } }).catch(() => {})}
                    className={cn("block text-[13px] leading-snug hover:underline", n.read ? "text-muted" : "text-ink")}
                  >
                    {n.title.replace(/\s*🎉/g, "")}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">{timeAgo(n.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
