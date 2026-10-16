"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { collection } from "firebase/firestore";
import { CalendarDays, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EventCard } from "@/components/event-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { clientDb } from "@/lib/firebase/client";
import { useClubMap, useCollection, useNow } from "@/lib/hooks";
import { toDate } from "@/lib/utils";
import type { EventDoc } from "@/lib/types";

export default function EventsPage() {
  const events = useCollection<EventDoc>(() => collection(clientDb(), "events"), "events-feed");
  const { map: clubs } = useClubMap();
  const now = useNow();
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [f, setF] = useState({ q: "", city: "", mode: "" });

  const cities = useMemo(() => [...new Set(events.data.map((e) => e.city))].sort(), [events.data]);
  const list = useMemo(() => {
    const q = f.q.toLowerCase();
    return events.data
      .filter((e) => {
        const t = toDate(e.date)?.getTime() ?? 0;
        if (when === "upcoming" ? t < now : t >= now) return false;
        if (f.city && e.city !== f.city) return false;
        if (f.mode && e.mode !== f.mode) return false;
        if (q && ![e.title, e.description, ...e.tags, ...e.hostClubIds.map((id) => clubs[id]?.name ?? "")].join(" ").toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const d = (toDate(a.date)?.getTime() ?? 0) - (toDate(b.date)?.getTime() ?? 0);
        return when === "upcoming" ? d : -d;
      });
  }, [events.data, clubs, when, f, now]);

  return (
    <>
      <PageHeader
        title="Events"
        description="What's happening across campuses."
        actions={
          <Link href="/events/new" className={buttonVariants()}>
            <Plus /> Create event
          </Link>
        }
      />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <Tabs value={when} onChange={setWhen} tabs={[{ value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past" }]} />
        <Card className="grid flex-1 gap-2 p-2 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted" />
            <Input className="pl-9" placeholder="Search events, tags, clubs" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          </div>
          <Select aria-label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
            <option value="">Any city</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select aria-label="Mode" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
            <option value="">Any mode</option>
            <option value="offline">Offline</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </Card>
      </div>

      {events.error ? (
        <ErrorState message="Couldn't load events." />
      ) : events.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title={`No ${when} events`} description="Try clearing filters, or create one." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => <EventCard key={e.id} event={e} clubs={clubs} />)}
        </div>
      )}
    </>
  );
}
