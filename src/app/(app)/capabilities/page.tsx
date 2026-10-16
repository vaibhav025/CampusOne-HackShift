"use client";

import { useState } from "react";
import { collection, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { Boxes, Pause, Pencil, Play, Plus, Trash2, Zap } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/app-shell";
import { CapabilityCard } from "@/components/capability-card";
import { CalendarConnect } from "@/components/calendar-connect";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Switch, Textarea } from "@/components/ui/input";
import { EmptyState, LoadingState, Spinner } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { clientDb } from "@/lib/firebase/client";
import { useCollection } from "@/lib/hooks";
import { toDate } from "@/lib/utils";
import { CAPABILITY_LABELS, CAPABILITY_TYPES, type Capability, type CapabilityType } from "@/lib/types";

function inputDate(v: unknown) {
  const d = toDate(v);
  if (!d) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function CapabilitiesPage() {
  const { club, isClubAdmin } = useAuth();
  const caps = useCollection<Capability>(
    () => query(collection(clientDb(), "capabilities"), where("clubId", "==", club!.id)),
    `my-caps-${club!.id}`,
  );
  const [editing, setEditing] = useState<Capability | "new" | null>(null);
  const [savingMeets, setSavingMeets] = useState(false);

  async function toggleMeets(v: boolean) {
    setSavingMeets(true);
    try {
      await api("/api/clubs", { method: "PATCH", body: { openToInstantMeets: v } });
      toast.success(v ? "Partners can auto-schedule a Meet when they accept" : "Instant meets turned off");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setSavingMeets(false);
    }
  }

  async function toggleActive(cap: Capability) {
    try {
      await api("/api/capabilities", { body: { ...formFromCap(cap), id: cap.id, active: !cap.active } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  async function remove(cap: Capability) {
    if (!confirm(`Delete "${cap.title}"?`)) return;
    try {
      await api(`/api/capabilities?id=${cap.id}`, { method: "DELETE" });
      toast.success("Capability deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  const sorted = [...caps.data].sort((a, b) => Number(b.active) - Number(a.active) || a.type.localeCompare(b.type));

  return (
    <>
      <PageHeader
        title="Capabilities"
        description="What your club can offer other clubs. The Collaboration Compiler matches requests against this list."
        actions={
          isClubAdmin && (
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add capability
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <Card className="flex items-center gap-4 p-4">
          <Zap className="size-5 shrink-0 text-warn" />
          <div className="flex-1">
            <p className="font-medium">Open to instant meets</p>
            <p className="text-xs text-muted">When you accept a request, a 30-min Google Meet is scheduled automatically.</p>
          </div>
          <Switch
            label="Open to instant meets"
            checked={club!.openToInstantMeets}
            disabled={!isClubAdmin || savingMeets}
            onCheckedChange={toggleMeets}
          />
        </Card>
        <CalendarConnect />
      </div>

      {caps.loading ? (
        <LoadingState />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title="No capabilities yet"
          description='List things like "Venue, 250 seats" or "2 photographers with a Sony A7 III".'
          action={isClubAdmin && <Button onClick={() => setEditing("new")}><Plus /> Add your first capability</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((cap) => (
            <CapabilityCard
              key={cap.id}
              cap={cap}
              footer={
                isClubAdmin && (
                  <div className="mt-auto flex gap-1 border-t border-line pt-3">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(cap)}>
                      <Pencil /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(cap)}>
                      {cap.active ? <Pause /> : <Play />} {cap.active ? "Pause" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-auto hover:text-danger" onClick={() => remove(cap)} aria-label="Delete">
                      <Trash2 />
                    </Button>
                  </div>
                )
              }
            />
          ))}
        </div>
      )}

      {editing && (
        <CapabilityDialog
          cap={editing === "new" ? null : editing}
          defaultCity={club!.city}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function formFromCap(cap: Capability | null, defaultCity = "") {
  return {
    type: (cap?.type ?? "venue") as CapabilityType,
    title: cap?.title ?? "",
    description: cap?.description ?? "",
    city: cap?.city ?? defaultCity,
    capacity: cap?.capacity ?? null,
    availableFrom: inputDate(cap?.availableFrom) || null,
    availableTo: inputDate(cap?.availableTo) || null,
    tags: cap?.tags ?? [],
    active: cap?.active ?? true,
  };
}

function CapabilityDialog({ cap, defaultCity, onClose }: { cap: Capability | null; defaultCity: string; onClose: () => void }) {
  const [form, setForm] = useState(() => ({ ...formFromCap(cap, defaultCity), tagsText: (cap?.tags ?? []).join(", ") }));
  const [busy, setBusy] = useState(false);
  const showCapacity = ["venue", "volunteers"].includes(form.type);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { tagsText, ...rest } = form;
      const res = await api<{ embedded: boolean }>("/api/capabilities", {
        body: {
          ...rest,
          id: cap?.id,
          capacity: showCapacity && rest.capacity ? Number(rest.capacity) : null,
          availableFrom: rest.availableFrom || null,
          availableTo: rest.availableTo || null,
          tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        },
      });
      toast.success(cap ? "Capability updated" : "Capability added", {
        description: res.embedded ? "Semantic embedding computed." : "Matched by tags (embeddings unavailable).",
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={cap ? "Edit capability" : "Add capability"}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CapabilityType })}>
            {CAPABILITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {CAPABILITY_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Main auditorium, 250 seats" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        {showCapacity && (
          <div>
            <Label htmlFor="cap">Capacity</Label>
            <Input id="cap" type="number" min={1} value={form.capacity ?? ""} onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : null })} />
          </div>
        )}
        <div className={showCapacity ? "" : "sm:col-span-2"}>
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input id="tags" value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} placeholder="hackathon, wifi, overnight" />
        </div>
        <div>
          <Label htmlFor="from">Available from</Label>
          <Input id="from" type="date" value={form.availableFrom ?? ""} onChange={(e) => setForm({ ...form, availableFrom: e.target.value || null })} />
        </div>
        <div>
          <Label htmlFor="to">Available to</Label>
          <Input id="to" type="date" value={form.availableTo ?? ""} onChange={(e) => setForm({ ...form, availableTo: e.target.value || null })} />
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Spinner />} Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
