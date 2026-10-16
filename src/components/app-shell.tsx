"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import { Boxes, CalendarDays, Compass, Inbox, LayoutDashboard, LogOut, Menu, PenLine, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ClubAvatar } from "@/components/club-avatar";
import { LoadingState } from "@/components/ui/states";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { clientDb } from "@/lib/firebase/client";
import { useCollection } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { CollabRequest } from "@/lib/types";
import { HOST_CLUB_ID, isDemo, PARTNER_CLUB_ID, resetDemo } from "@/lib/demo/store";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/compiler", label: "New collaboration", icon: PenLine },
  { href: "/requests", label: "Requests", icon: Inbox, badge: "requests" as const },
  { href: "/explore", label: "Clubs", icon: Compass },
  { href: "/events", label: "Events", icon: CalendarDays },
];

/** Client-side guard: signed in + belongs to a club, otherwise redirect. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { configured, loading, user, profile, club, signOut, switchClub } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!configured || loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (profile && !profile.clubId) router.replace("/onboarding");
  }, [configured, loading, user, profile, pathname, router]);

  const pending = useCollection<CollabRequest>(
    () =>
      club
        ? query(
            collection(clientDb(), "collabRequests"),
            where("toClubId", "==", club.id),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc"),
            limit(20),
          )
        : null,
    `pending-badge-${club?.id}`,
  );

  if (!configured) return <SetupNotice />;
  if (loading || !user || !club) return <LoadingState label="Loading your club" />;

  const item = (href: string, label: string, Icon: React.ElementType, count = 0) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] transition-[color,background-color,box-shadow] duration-150",
          active ? "bg-teal-950/80 font-medium text-ink shadow-inset" : "text-muted hover:bg-surface-2/70 hover:text-ink",
        )}
      >
        <Icon className={cn("size-4", active ? "text-teal-500" : "text-muted/80")} strokeWidth={1.8} />
        {label}
        {count > 0 && <span className="ml-auto rounded-full bg-teal-500/15 px-1.5 text-[11px] tabular-nums text-sky-soft">{count}</span>}
      </Link>
    );
  };

  const nav = (
    <nav className="flex flex-col gap-0.5" onClick={() => setOpen(false)}>
      {NAV.map(({ href, label, icon, badge }) => item(href, label, icon, badge === "requests" ? pending.data.length : 0))}
      <p className="mb-1 mt-5 px-2 text-xs text-muted/80">{club.name}</p>
      {item(`/clubs/${club.id}`, "Profile & passport", ShieldCheck)}
      {item("/capabilities", "What we offer", Boxes)}
    </nav>
  );

  const demoBar = isDemo && switchClub && (
    <div className="mb-3 rounded-xl bg-teal-950/60 p-2 text-xs shadow-inset">
      <p className="px-1 pb-1.5 text-muted">Demo · viewing as</p>
      <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-teal-950 p-0.5">
        {[
          { id: HOST_CLUB_ID, label: "Coding Club" },
          { id: PARTNER_CLUB_ID, label: "CyberSec" },
        ].map((o) => (
          <button
            key={o.id}
            onClick={() => switchClub(o.id)}
            className={cn(
              "truncate rounded px-1.5 py-1 transition-[color,background-color,box-shadow] duration-150",
              club.id === o.id ? "bg-teal-700 font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => confirm("Reset all demo data?") && resetDemo()}
        className="mt-1.5 flex w-full items-center gap-1 px-1 py-0.5 text-muted transition-colors hover:text-ink"
      >
        <RotateCcw className="size-3" /> Reset demo data
      </button>
    </div>
  );

  const footer = (
    <div className="flex items-center gap-2.5 px-1">
      <ClubAvatar name={club.name} logoURL={club.logoURL} size="sm" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-medium">{user.displayName ?? club.name}</p>
        <p className="break-any truncate text-xs text-muted">{user.email}</p>
      </div>
      <ThemeToggle />
      <button
        onClick={() => signOut().then(() => router.replace("/"))}
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="size-3.5" />
      </button>
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-teal-900 px-3 py-4 shadow-[6px_0_24px_-12px_rgb(0_0_0/0.6)] lg:flex">
        <div className="mb-6 px-2">
          <Logo />
        </div>
        {nav}
        <div className="mt-auto">
          {demoBar}
          {footer}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-teal-900/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <Logo />
          <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md p-2 hover:bg-surface-2">
            <Menu className="size-5" />
          </button>
          </div>
        </header>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="cc-scrim absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
            <aside className="cc-drawer-left absolute left-0 top-0 flex h-dvh w-72 flex-col bg-teal-900 px-3 py-4 shadow-pop">
              <div className="mb-6 flex items-center justify-between px-2">
                <Logo />
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-md p-1.5 hover:bg-surface-2">
                  <X className="size-5" />
                </button>
              </div>
              {nav}
              <div className="mt-auto">
                {demoBar}
                {footer}
              </div>
            </aside>
          </div>
        )}
        {/* Sidebar is the elevated forest-teal surface; content sits on the canvas. */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 lg:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="m-auto max-w-md p-6 text-center">
      <h1 className="text-lg font-semibold">Firebase isn&apos;t configured</h1>
      <p className="mt-2 text-[13px] text-muted">
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in the Firebase keys and restart the dev server.
      </p>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
