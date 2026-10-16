"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { LoadingState, Spinner } from "@/components/ui/states";
import { api } from "@/lib/api-client";

function NewEventForm() {
  const { club, isClubAdmin } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    title: params.get("title") ?? "",
    date: params.get("date") ? `${params.get("date")}T10:00` : "",
    city: club!.city,
    mode: "offline",
    tags: "",
    description: "",
  });
  const [bullets, setBullets] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const collabId = params.get("collabId") ?? undefined;

  async function generate() {
    if (bullets.trim().length < 3) return toast.error("Add a few bullet points first");
    setGenerating(true);
    try {
      const res = await api<{ description: string; generatedBy: string }>("/api/events/generate-description", {
        body: { bullets, title: form.title || undefined },
      });
      setForm((f) => ({ ...f, description: res.description }));
      if (res.generatedBy === "fallback") toast.info("AI unavailable, so we stitched your notes together.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate");
    } finally {
      setGenerating(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ id: string }>("/api/events", {
        body: {
          ...form,
          date: new Date(form.date).toISOString(),
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          collabId,
        },
      });
      toast.success("Event published");
      router.push(`/events/${res.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create event");
      setBusy(false);
    }
  }

  if (!isClubAdmin) return <p className="text-sm text-muted">Only club admins can create events.</p>;

  return (
    <>
      <PageHeader title="Create event" description={`Hosted by ${club!.name}${collabId ? " and your collaboration partners" : ""}`} />
      <Card className="max-w-3xl p-6">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="date">Date & time</Label>
            <Input id="date" type="datetime-local" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="mode">Mode</Label>
            <Select id="mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" placeholder="hackathon, ai" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>

          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 sm:col-span-2">
            <Label htmlFor="bullets">Quick notes for the AI helper</Label>
            <Textarea
              id="bullets"
              className="min-h-20"
              placeholder={"- 24-hour hackathon\n- prizes worth ₹50k\n- open to all Delhi colleges"}
              value={bullets}
              onChange={(e) => setBullets(e.target.value)}
            />
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={generate} disabled={generating}>
              {generating && <Spinner />} Write it for me
            </Button>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" className="min-h-32" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy && <Spinner />} Publish event
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewEventForm />
    </Suspense>
  );
}
