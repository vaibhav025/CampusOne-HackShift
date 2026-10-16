"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, orderBy, query } from "firebase/firestore";
import { toast } from "sonner";
import { BadgeCheck, Search, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ClubAvatar } from "@/components/club-avatar";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { LoadingState, Spinner } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import { clientDb } from "@/lib/firebase/client";
import { useCollection } from "@/lib/hooks";
import type { Club } from "@/lib/types";

function domainOf(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}
function matches(email: string, collegeDomain: string) {
  const d = domainOf(email);
  const c = collegeDomain.toLowerCase().replace(/^@/, "").trim();
  return Boolean(c) && (d === c || d.endsWith(`.${c}`));
}

export default function OnboardingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (profile?.clubId) router.replace("/dashboard");
  }, [loading, user, profile, router]);

  if (loading || !user || profile?.clubId) return <LoadingState />;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Logo href="/" />
      <h1 className="mt-8 text-2xl font-semibold">Set up your club</h1>
      <p className="mt-1 text-sm text-muted">
        Signed in as <span className="text-ink">{user.email}</span>
      </p>
      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "create", label: "Create a club" },
          { value: "join", label: "Join a club" },
        ]}
      />
      <div className="mt-6">{tab === "create" ? <CreateClub email={user.email ?? ""} /> : <JoinClub email={user.email ?? ""} />}</div>
    </main>
  );
}

function CreateClub({ email }: { email: string }) {
  const [form, setForm] = useState({
    name: "",
    college: "",
    collegeDomain: domainOf(email).endsWith("gmail.com") ? "" : domainOf(email),
    city: "Delhi",
    domains: "",
    description: "",
    contactEmail: email,
    logoURL: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const verified = matches(email, form.collegeDomain);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ verified: boolean }>("/api/clubs", {
        body: {
          ...form,
          domains: form.domains.split(",").map((s) => s.trim()).filter(Boolean),
        },
      });
      toast.success(res.verified ? "Club created and verified" : "Club created");
      // AuthProvider's live profile listener picks up clubId; AppShell takes over.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create club");
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Club name</Label>
          <Input id="name" required value={form.name} onChange={set("name")} placeholder="Coding Club" />
        </div>
        <div>
          <Label htmlFor="college">College</Label>
          <Input id="college" required value={form.college} onChange={set("college")} placeholder="GGSIPU" />
        </div>
        <div>
          <Label htmlFor="domain">College email domain</Label>
          <Input id="domain" required value={form.collegeDomain} onChange={set("collegeDomain")} placeholder="std.ggsipu.ac.in" />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" required value={form.city} onChange={set("city")} />
        </div>
        <div>
          <Label htmlFor="contact">Contact email</Label>
          <Input id="contact" type="email" required value={form.contactEmail} onChange={set("contactEmail")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="domains">Interest tags (comma separated)</Label>
          <Input id="domains" value={form.domains} onChange={set("domains")} placeholder="coding, hackathons, ai" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={form.description} onChange={set("description")} placeholder="What does your club do?" />
        </div>

        {/* Verified badge preview */}
        <div className="flex items-center gap-3 rounded-xl shadow-[0_0_0_1px_var(--line)] bg-canvas/50 p-3 sm:col-span-2">
          <ClubAvatar name={form.name || "Club"} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{form.name || "Your club"}</p>
            <p className="truncate text-xs text-muted">{form.college || "College"} · {form.city}</p>
          </div>
          {verified ? (
            <Badge variant="good">
              <BadgeCheck /> Verified Institution
            </Badge>
          ) : (
            <Badge variant="muted" title="Your sign-in email domain must match the college domain">
              <ShieldAlert /> Unverified
            </Badge>
          )}
        </div>
        {!verified && form.collegeDomain && (
          <p className="text-xs text-muted sm:col-span-2">
            You signed in with @{domainOf(email)}. Sign in with an @{form.collegeDomain} account to get verified.
          </p>
        )}

        <Button type="submit" disabled={busy} className="sm:col-span-2">
          {busy && <Spinner />} Create club
        </Button>
      </form>
    </Card>
  );
}

function JoinClub({ email }: { email: string }) {
  const [search, setSearch] = useState("");
  const [joining, setJoining] = useState<string | null>(null);
  const clubs = useCollection<Club>(() => query(collection(clientDb(), "clubs"), orderBy("name")), "onboarding-clubs");
  const filtered = useMemo(
    () =>
      clubs.data.filter((c) => `${c.name} ${c.college}`.toLowerCase().includes(search.toLowerCase())),
    [clubs.data, search],
  );

  async function join(club: Club) {
    setJoining(club.id);
    try {
      await api("/api/clubs/join", { body: { clubId: club.id } });
      toast.success(`Joined ${club.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join");
      setJoining(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 size-4 text-muted" />
        <Input className="pl-9" placeholder="Search clubs or colleges" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {clubs.loading ? (
        <LoadingState />
      ) : (
        filtered.map((c) => {
          const canJoin = matches(email, c.collegeDomain);
          return (
            <Card key={c.id} className="flex items-center gap-3 p-4">
              <ClubAvatar name={c.name} logoURL={c.logoURL} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted">{c.college} · @{c.collegeDomain}</p>
              </div>
              <Button
                size="sm"
                variant={canJoin ? "default" : "outline"}
                disabled={!canJoin || joining === c.id}
                title={canJoin ? "" : `Requires an @${c.collegeDomain} email`}
                onClick={() => join(c)}
              >
                {joining === c.id && <Spinner />} {canJoin ? "Join" : "Domain mismatch"}
              </Button>
            </Card>
          );
        })
      )}
    </div>
  );
}
