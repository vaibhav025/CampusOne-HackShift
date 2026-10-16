"use client";

import { useState } from "react";
import { toast } from "sonner";
import { StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import type { CollabRequest, Match } from "@/lib/types";

/** "Draft invite" → AI draft in an editable dialog → Send (in-app + email). */
export function InviteAction({ reqId, match, existing }: { reqId: string; match: Match; existing?: CollabRequest }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  if (existing) {
    return existing.status === "accepted" ? (
      <StatusDot tone="good">Accepted</StatusDot>
    ) : (
      <StatusDot tone="accent">Invite sent, waiting</StatusDot>
    );
  }

  async function openDraft() {
    setOpen(true);
    if (draft) return;
    setLoading(true);
    try {
      setDraft(await api<{ subject: string; message: string }>("/api/compiler/draft-invite", { body: { reqId, matchId: match.id } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not draft invite");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!draft) return;
    setSending(true);
    try {
      const res = await api<{ emailSent: boolean }>("/api/requests/send", { body: { reqId, matchId: match.id, ...draft } });
      toast.success(`Sent to ${match.snapshot.clubName}`, { description: res.emailSent ? "They'll see it in CampusOne and their inbox." : "They'll see it in CampusOne." });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={openDraft}>
        Invite
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={`Invite ${match.snapshot.clubName}`} description="We wrote a first draft from the match reasons. Change whatever you like.">
        {loading || !draft ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted">
            <Spinner /> Writing a first draft
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="inv-subject">Subject</Label>
              <Input id="inv-subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="inv-msg">Message</Label>
              <Textarea id="inv-msg" className="min-h-56" value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
              <p className="mt-1 text-right text-xs text-muted">{draft.message.trim().split(/\s+/).length} words</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={send} disabled={sending || draft.message.trim().length < 10}>
                {sending && <Spinner />} Send
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
