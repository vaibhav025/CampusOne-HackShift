"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, query, where } from "firebase/firestore";
import { BadgeCheck, Mail, MapPin, Pencil, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { CapabilityCard } from "@/components/capability-card";
import { ClubAvatar } from "@/components/club-avatar";
import { PassportCard } from "@/components/passport/passport-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { clientDb } from "@/lib/firebase/client";
import { useCollection, useDocument } from "@/lib/hooks";
import { formatDate, toDate } from "@/lib/utils";
import type { Capability, Club, EventDoc } from "@/lib/types";

export default function ClubProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { club: myClub } = useAuth();
  const club = useDocument<Club>(`clubs/${id}`);
  const caps = useCollection<Capability>(
    () => query(collection(clientDb(), "capabilities"), where("clubId", "==", id)),
    `club-caps-${id}`,
  );
  const events = useCollection<EventDoc>(
    () => query(collection(clientDb(), "events"), where("hostClubIds", "array-contains", id)),
    `club-events-${id}`,
  );

  if (club.loading) return <LoadingState />;
  if (!club.data) return <ErrorState message="This club doesn't exist or was removed." />;
  const c = club.data;
  const isMine = myClub?.id === c.id;
  const activeCaps = caps.data.filter((x) => x.active || isMine);
  const sortedEvents = [...events.data].sort((a, b) => (toDate(b.date)?.getTime() ?? 0) - (toDate(a.date)?.getTime() ?? 0));

  return (
    <div className="space-y-12">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ClubAvatar name={c.name} logoURL={c.logoURL} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{c.name}</h1>
              {c.verified && (
                <Badge variant="good" title={`Admin email matched @${c.collegeDomain}`}>
                  <BadgeCheck /> Verified
                </Badge>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{c.college}</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {c.city}
              </span>
              <span className="flex items-center gap-1">
                <Users className="size-3.5" /> {c.memberCount} members
              </span>
              <a href={`mailto:${c.contactEmail}`} className="flex items-center gap-1 hover:text-ink">
                <Mail className="size-3.5" /> {c.contactEmail}
              </a>
            </p>
            {c.description && <p className="mt-3 max-w-3xl text-sm">{c.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.domains?.map((d) => (
                <Badge key={d} variant="outline">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
          {isMine && (
            <Link href="/capabilities" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil /> Manage
            </Link>
          )}
        </div>
      </div>

      <PassportCard clubId={c.id} />

      <section>
        <h2 className="mb-3 text-base font-semibold">
          What {isMine ? "we" : "they"} can offer
        </h2>
        {caps.loading ? (
          <LoadingState />
        ) : activeCaps.length === 0 ? (
          <EmptyState title="No capabilities listed yet" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeCaps.map((cap) => (
              <CapabilityCard key={cap.id} cap={cap} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">
          Events
        </h2>
        {events.loading ? (
          <LoadingState />
        ) : sortedEvents.length === 0 ? (
          <EmptyState title="No events yet" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedEvents.map((e) => (
              <Link key={e.id} href={`/events/${e.id}`}>
                <Card className="p-4 transition-colors duration-150 hover:bg-surface-2/70">
                  <p className="font-medium">{e.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(e.date)} · {e.city} · {e.rsvpCount} RSVPs
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
