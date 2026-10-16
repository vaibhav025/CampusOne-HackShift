"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { collection } from "firebase/firestore";
import { CalendarDays, GraduationCap, MapPin, Users } from "lucide-react";
import { ClubAvatar } from "@/components/club-avatar";
import { RsvpButton } from "@/components/event-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { clientDb } from "@/lib/firebase/client";
import { useClubMap, useCollection, useDocument, useNow } from "@/lib/hooks";
import { formatDateTime, toDate } from "@/lib/utils";
import type { EventDoc } from "@/lib/types";

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const event = useDocument<EventDoc>(`events/${id}`);
  const rsvps = useCollection<{ id: string; college: string }>(() => collection(clientDb(), "events", id, "rsvps"), `rsvps-${id}`);
  const { map: clubs } = useClubMap();
  const now = useNow();

  if (event.loading) return <LoadingState />;
  if (!event.data) return <ErrorState message="Event not found." />;
  const e = event.data;
  const past = (toDate(e.date)?.getTime() ?? 0) < now;

  // "Reached N colleges" analytics from RSVPs
  const byCollege = Object.entries(
    rsvps.data.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.college]: (acc[r.college] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const max = byCollege[0]?.[1] ?? 1;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{e.mode}</Badge>
          {e.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{e.title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1"><CalendarDays className="size-4" /> {formatDateTime(e.date)}</span>
          <span className="flex items-center gap-1"><MapPin className="size-4" /> {e.city}</span>
          <span className="flex items-center gap-1"><Users className="size-4" /> {e.rsvpCount} going</span>
        </div>
        <p className="mt-5 whitespace-pre-line text-sm leading-relaxed">{e.description || "No description yet."}</p>
        {!past && <div className="mt-6"><RsvpButton eventId={e.id} size="default" /></div>}

        <h2 className="mt-8 text-sm font-semibold text-muted">Hosted by</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {e.hostClubIds.map((cid) => (
            <Link key={cid} href={`/clubs/${cid}`} className="flex items-center gap-2 rounded-xl shadow-[0_0_0_1px_var(--line)] p-2 pr-4 hover:bg-surface-2/70">
              <ClubAvatar name={clubs[cid]?.name ?? "?"} size="sm" />
              <div>
                <p className="text-sm font-medium">{clubs[cid]?.name ?? "…"}</p>
                <p className="text-xs text-muted">{clubs[cid]?.college}</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="size-4 text-good" /> Reached {byCollege.length} {byCollege.length === 1 ? "college" : "colleges"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rsvps.loading ? (
            <LoadingState />
          ) : byCollege.length === 0 ? (
            <p className="text-sm text-muted">No RSVPs yet.</p>
          ) : (
            byCollege.map(([college, n]) => (
              <div key={college}>
                <div className="flex justify-between text-xs">
                  <span>{college}</span>
                  <span className="text-muted">{n}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-good" style={{ width: `${(n / max) * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
