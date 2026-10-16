"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { cn, formatDate } from "@/lib/utils";
import { CAPABILITY_LABELS, CAPABILITY_TYPES, type CapabilityType, type Need, type ParsedRequest, type Priority } from "@/lib/types";

const PRIORITY_TEXT: Record<Priority, string> = { high: "Must have", medium: "Nice to have", low: "Optional" };

/**
 * Shows the parsed request and lets the organizer fix anything before matching.
 * `onRematch` runs after a save so the matches reflect the edited needs.
 */
export function ParsedEditor({
  reqId,
  parsed,
  editable,
  onRematch,
  rematching,
}: {
  reqId: string;
  parsed: ParsedRequest;
  editable: boolean;
  onRematch: () => Promise<void>;
  rematching: boolean;
}) {
  const [draft, setDraft] = useState<ParsedRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const p = draft ?? parsed;
  const editing = draft !== null;

  const setNeed = (id: string, patch: Partial<Need>) =>
    setDraft({ ...p, needs: p.needs.map((n) => (n.id === id ? { ...n, ...patch } : n)) });

  async function persist(next: ParsedRequest) {
    setSaving(true);
    try {
      await api(`/api/compiler/${reqId}`, { method: "PATCH", body: { parsed: next } });
      setDraft(null);
      await onRematch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    } finally {
      setSaving(false);
    }
  }

  function addSuggestion(type: CapabilityType, reason: string) {
    const next: ParsedRequest = {
      ...p,
      needs: [...p.needs, { id: `n${p.needs.length + 1}`, type, detail: reason, priority: "medium", quantity: null }],
      suggestedMissingNeeds: p.suggestedMissingNeeds.filter((s) => s.type !== type),
    };
    if (editing) setDraft(next);
    else persist(next);
  }

  const meta = [
    p.date ? formatDate(p.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "No date yet",
    p.city ?? "City not set",
    p.expectedSize ? `${p.expectedSize} people` : "Size not set",
    p.mode ? p.mode.charAt(0).toUpperCase() + p.mode.slice(1) : null,
  ].filter(Boolean);

  if (editing) {
    return (
      <div className="space-y-6 rounded-lg p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="ev-title">Event name</Label>
            <Input id="ev-title" value={p.eventTitle} onChange={(e) => setDraft({ ...p, eventTitle: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ev-date">Date</Label>
            <Input id="ev-date" type="date" value={p.date ?? ""} onChange={(e) => setDraft({ ...p, date: e.target.value || null })} />
          </div>
          <div>
            <Label htmlFor="ev-city">City</Label>
            <Input id="ev-city" value={p.city ?? ""} onChange={(e) => setDraft({ ...p, city: e.target.value || null })} />
          </div>
          <div>
            <Label htmlFor="ev-size">People</Label>
            <Input id="ev-size" type="number" min={1} value={p.expectedSize ?? ""} onChange={(e) => setDraft({ ...p, expectedSize: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div>
            <Label htmlFor="ev-mode">Format</Label>
            <Select id="ev-mode" value={p.mode ?? ""} onChange={(e) => setDraft({ ...p, mode: (e.target.value || null) as ParsedRequest["mode"] })}>
              <option value="">Not sure yet</option>
              <option value="offline">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </Select>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium">What you need</p>
          <div className="space-y-2">
            {p.needs.map((n) => (
              <div key={n.id} className="grid gap-2 sm:grid-cols-[150px_1fr_130px_auto]">
                <Select aria-label="Type" value={n.type} onChange={(e) => setNeed(n.id, { type: e.target.value as CapabilityType })}>
                  {CAPABILITY_TYPES.map((t) => <option key={t} value={t}>{CAPABILITY_LABELS[t]}</option>)}
                </Select>
                <Input aria-label="Detail" placeholder="What exactly?" value={n.detail} onChange={(e) => setNeed(n.id, { detail: e.target.value })} />
                <Select aria-label="Priority" value={n.priority} onChange={(e) => setNeed(n.id, { priority: e.target.value as Priority })}>
                  {(["high", "medium", "low"] as Priority[]).map((pr) => <option key={pr} value={pr}>{PRIORITY_TEXT[pr]}</option>)}
                </Select>
                <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setDraft({ ...p, needs: p.needs.filter((x) => x.id !== n.id) })}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setDraft({ ...p, needs: [...p.needs, { id: `n${p.needs.length + 1}`, type: "volunteers", detail: "", priority: "medium", quantity: null }] })}
          >
            <Plus /> Add another
          </Button>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          <Button onClick={() => persist(p)} disabled={saving || p.needs.length === 0 || p.needs.some((n) => !n.detail.trim())}>
            {saving && <Spinner />} Save and re-match
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold">{p.eventTitle}</h1>
          <p className="mt-1 text-[13px] text-muted">{meta.join(" · ")}</p>
        </div>
        {editable && (
          <Button variant="outline" size="sm" onClick={() => setDraft(structuredClone(parsed))}>
            Edit
          </Button>
        )}
      </div>

      <dl className="mt-6 divide-y divide-line border-y border-line">
        {p.needs.map((n) => (
          <div key={n.id} className="grid grid-cols-[120px_1fr_auto] items-baseline gap-4 py-2.5 text-[13px] sm:grid-cols-[160px_1fr_auto]">
            <dt className="font-medium">{CAPABILITY_LABELS[n.type]}</dt>
            <dd className="text-muted">
              {n.quantity ? `${n.quantity} × ` : ""}
              {n.detail}
            </dd>
            <dd className={cn("text-xs", n.priority === "high" ? "text-ink" : "text-muted")}>{PRIORITY_TEXT[n.priority]}</dd>
          </div>
        ))}
      </dl>

      {p.suggestedMissingNeeds.length > 0 && (
        <div className="mt-4 rounded-lg bg-warn/[0.06] px-4 py-3">
          <p className="text-[13px] font-medium text-ink">Easy to forget</p>
          <ul className="mt-2 space-y-2">
            {p.suggestedMissingNeeds.map((s) => (
              <li key={s.type} className="flex items-center gap-3 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{CAPABILITY_LABELS[s.type]}</span>
                  <span className="text-muted"> · {s.reason}</span>
                </span>
                {editable && (
                  <Button size="sm" variant="secondary" disabled={saving || rematching} onClick={() => addSuggestion(s.type, s.reason)}>
                    <Plus /> Add
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rematching && (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
          <Spinner /> Looking again with your changes
        </p>
      )}
    </div>
  );
}
