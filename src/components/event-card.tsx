"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, Check, MapPin, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { useDocument, useNow } from "@/lib/hooks";
import { cn, formatDateTime, toDate } from "@/lib/utils";
import type { Club, EventDoc } from "@/lib/types";

export function RsvpButton({ eventId, size = "sm" }: { eventId: string; size?: "sm" | "default" }) {
  const { user } = useAuth();
  const rsvp = useDocument(user ? `events/${eventId}/rsvps/${user.uid}` : null);
  const [busy, setBusy] = useState(false);
  const going = Boolean(rsvp.data);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ going: boolean }>(`/api/events/${eventId}/rsvp`, { method: "POST" });
      toast.success(res.going ? "You're going!" : "RSVP removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "RSVP failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size={size} variant={going ? "good" : "outline"} onClick={toggle} disabled={busy || rsvp.loading}>
      {busy ? <Spinner /> : going ? <Check /> : null}
      {going ? "Going" : "RSVP"}
    </Button>
  );
}

export function EventCard({ event, clubs }: { event: EventDoc; clubs: Record<string, Club> }) {
  const now = useNow();
  const past = (toDate(event.date)?.getTime() ?? 0) < now;
  const hosts = event.hostClubIds.map((id) => clubs[id]?.name).filter(Boolean);
  return (
    <Link href={`/events/${event.id}`}>
      <Card className={cn("flex h-full flex-col gap-3 p-4 transition-colors duration-150 hover:bg-surface-2/70", past && "opacity-70")}>
        <div className="flex items-center justify-between gap-2">
          <Badge variant={event.mode === "online" ? "good" : event.mode === "hybrid" ? "warn" : "default"}>{event.mode}</Badge>
          {event.hostClubIds.length > 1 && <Badge variant="outline">Collab</Badge>}
        </div>
        <div>
          <p className="font-medium">{event.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">by {hosts.join(" × ") || "—"}</p>
        </div>
        <p className="line-clamp-2 text-sm text-muted">{event.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1"><CalendarDays className="size-3" /> {formatDateTime(event.date)}</span>
          <span className="flex items-center gap-1"><MapPin className="size-3" /> {event.city}</span>
          <span className="flex items-center gap-1"><Users className="size-3" /> {event.rsvpCount}</span>
        </div>
        {!past && (
          <div className="border-t border-line pt-3">
            <RsvpButton eventId={event.id} />
          </div>
        )}
      </Card>
    </Link>
  );
}
