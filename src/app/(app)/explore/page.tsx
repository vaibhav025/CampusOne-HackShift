"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { collection, query, where } from "firebase/firestore";
import { BadgeCheck, Compass, MapPin, Search, Users, X } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { CAPABILITY_ICONS } from "@/components/capability-card";
import { ClubAvatar } from "@/components/club-avatar";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { clientDb } from "@/lib/firebase/client";
import { useCollection } from "@/lib/hooks";
import { CAPABILITY_LABELS, CAPABILITY_TYPES, type Capability, type CapabilityType, type Club } from "@/lib/types";

const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));

export default function ExplorePage() {
  const { club: myClub } = useAuth();
  const clubs = useCollection<Club>(() => collection(clientDb(), "clubs"), "explore-clubs");
  const caps = useCollection<Capability>(
    () => query(collection(clientDb(), "capabilities"), where("active", "==", true)),
    "explore-caps",
  );
  const [f, setF] = useState({ q: "", college: "", domain: "", city: "", type: "" as CapabilityType | "" });

  const options = useMemo(
    () => ({
      colleges: uniq(clubs.data.map((c) => c.college)),
      domains: uniq(clubs.data.flatMap((c) => c.domains ?? [])),
      cities: uniq([...clubs.data.map((c) => c.city), ...caps.data.map((c) => c.city)]),
    }),
    [clubs.data, caps.data],
  );

  const results = useMemo(() => {
    const q = f.q.toLowerCase().trim();
    return clubs.data
      .map((club) => {
        const clubCaps = caps.data.filter((c) => c.clubId === club.id);
        const matchingCaps = clubCaps.filter((c) => (!f.type || c.type === f.type) && (!f.city || c.city === f.city));
        return { club, clubCaps, matchingCaps };
      })
      .filter(({ club, clubCaps, matchingCaps }) => {
        if (f.college && club.college !== f.college) return false;
        if (f.domain && !club.domains?.includes(f.domain)) return false;
        if ((f.type || f.city) && matchingCaps.length === 0 && !(f.city && !f.type && club.city === f.city)) return false;
        if (q) {
          const hay = [club.name, club.college, club.description, ...(club.domains ?? []), ...clubCaps.flatMap((c) => [c.title, ...c.tags])]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => Number(b.club.verified) - Number(a.club.verified) || a.club.name.localeCompare(b.club.name));
  }, [clubs.data, caps.data, f]);

  const active = f.q || f.college || f.domain || f.city || f.type;

  return (
    <>
      <PageHeader title="Explore communities" description="Find clubs across campuses and see what they can offer." />

      <Card className="mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-3 size-4 text-muted" />
          <Input className="pl-9" placeholder="Search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <Select aria-label="Capability type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as CapabilityType | "" })}>
          <option value="">Any capability</option>
          {CAPABILITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {CAPABILITY_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select aria-label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
          <option value="">Any city</option>
          {options.cities.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select aria-label="College" value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })}>
          <option value="">Any college</option>
          {options.colleges.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select aria-label="Domain" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })}>
          <option value="">Any domain</option>
          {options.domains.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Card>

      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>{clubs.loading ? "Loading…" : `${results.length} ${results.length === 1 ? "club" : "clubs"}`}</span>
        {active && (
          <Button variant="ghost" size="sm" onClick={() => setF({ q: "", college: "", domain: "", city: "", type: "" })}>
            <X /> Clear filters
          </Button>
        )}
      </div>

      {clubs.error || caps.error ? (
        <ErrorState message="Couldn't load communities. Check your connection and try again." />
      ) : clubs.loading || caps.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : results.length === 0 ? (
        <EmptyState icon={<Compass />} title="No clubs match these filters" description="Try a different city or capability type." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(({ club, clubCaps, matchingCaps }) => {
            const shown = f.type || f.city ? matchingCaps : clubCaps;
            return (
              <Link key={club.id} href={`/clubs/${club.id}`}>
                <Card className="flex h-full flex-col gap-3 p-4 transition-colors duration-150 hover:bg-surface-2/70">
                  <div className="flex items-start gap-3">
                    <ClubAvatar name={club.name} logoURL={club.logoURL} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-medium">
                        <span className="truncate">{club.name}</span>
                        {club.verified && <BadgeCheck className="size-4 shrink-0 text-good" aria-label="Verified" />}
                      </p>
                      <p className="truncate text-xs text-muted">{club.college}</p>
                    </div>
                    {club.id === myClub?.id && <Badge variant="muted">You</Badge>}
                  </div>
                  <p className="flex gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1"><MapPin className="size-3" /> {club.city}</span>
                    <span className="flex items-center gap-1"><Users className="size-3" /> {club.memberCount}</span>
                  </p>
                  <div className="mt-auto space-y-1.5">
                    {shown.slice(0, 3).map((c) => {
                      const Icon = CAPABILITY_ICONS[c.type];
                      return (
                        <div key={c.id} className="flex items-center gap-2 rounded-md bg-canvas/60 px-2 py-1.5 text-xs">
                          <Icon className="size-3.5 shrink-0 text-good" />
                          <span className="truncate">{c.title}</span>
                        </div>
                      );
                    })}
                    {shown.length > 3 && <p className="text-xs text-muted">+{shown.length - 3} more</p>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
