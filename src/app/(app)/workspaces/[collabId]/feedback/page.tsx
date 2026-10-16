"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/app-shell";
import { ClubAvatar } from "@/components/club-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Switch, Textarea } from "@/components/ui/input";
import { ErrorState, LoadingState, Spinner } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { useClubMap, useDocument } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Collaboration } from "@/lib/types";

interface Entry {
  rating: number;
  comment: string;
  wouldCollabAgain: boolean;
}

export default function FeedbackPage() {
  const { collabId } = useParams<{ collabId: string }>();
  const { club } = useAuth();
  const router = useRouter();
  const collab = useDocument<Collaboration>(`collaborations/${collabId}`);
  const { map: clubs } = useClubMap();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [busy, setBusy] = useState(false);

  if (collab.loading) return <LoadingState />;
  if (!collab.data || !collab.data.clubIds.includes(club!.id)) return <ErrorState message="You're not part of this collaboration." />;
  const partners = collab.data.clubIds.filter((id) => id !== club!.id);
  const get = (id: string): Entry => entries[id] ?? { rating: 0, comment: "", wouldCollabAgain: true };
  const set = (id: string, patch: Partial<Entry>) => setEntries((e) => ({ ...e, [id]: { ...get(id), ...patch } }));
  const ready = partners.every((id) => get(id).rating > 0);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/feedback", { body: { collabId, entries: partners.map((id) => ({ toClubId: id, ...get(id) })) } });
      toast.success("Thanks! Partner Passports are updated.");
      router.push(`/workspaces/${collabId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="How did it go?" description={`Feedback for ${collab.data.title}. It appears on each partner's Trust Passport.`} />
      <div className="space-y-4">
        {partners.map((id) => {
          const e = get(id);
          return (
            <Card key={id} className="p-5">
              <div className="flex items-center gap-3">
                <ClubAvatar name={clubs[id]?.name ?? "?"} />
                <div>
                  <p className="font-medium">{clubs[id]?.name}</p>
                  <p className="text-xs text-muted">{collab.data!.roles?.[id] ?? "Partner"}</p>
                </div>
              </div>
              <div className="mt-4">
                <Label>Rating</Label>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} role="radio" aria-checked={e.rating === n} aria-label={`${n} stars`} onClick={() => set(id, { rating: n })}>
                      <Star className={cn("size-7 transition-colors", n <= e.rating ? "fill-warn text-warn" : "text-line hover:text-warn/60")} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor={`c-${id}`}>Comment</Label>
                <Textarea id={`c-${id}`} placeholder="What went well? What could be better?" value={e.comment} onChange={(ev) => set(id, { comment: ev.target.value })} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm">Would collaborate again</span>
                <Switch checked={e.wouldCollabAgain} onCheckedChange={(v) => set(id, { wouldCollabAgain: v })} label="Would collaborate again" />
              </div>
            </Card>
          );
        })}
        <Button className="w-full" size="lg" onClick={submit} disabled={!ready || busy}>
          {busy && <Spinner />} Submit feedback
        </Button>
      </div>
    </div>
  );
}
