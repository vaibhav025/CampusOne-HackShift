"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { ArrowRight, Check, CornerDownLeft } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { clientDb } from "@/lib/firebase/client";
import { useCollection } from "@/lib/hooks";
import { cn, timeAgo, toDate } from "@/lib/utils";
import type { CompilerRequest } from "@/lib/types";

const EXAMPLES = [
  { label: "a hackathon", text: "24-hour cybersecurity hackathon on 15 Nov, 200 participants, need sponsors, mentors and a venue." },
  { label: "an exhibition", text: "Photography exhibition next month in Delhi, need 2 photographers, a hall and poster design." },
  { label: "a workshop", text: "Online AI workshop next week for 80 students, need 3 mentors and social media promotion." },
];

const STEPS = ["Reading your request", "Looking for clubs that can help", "Putting the plan together"];

const STATUS_LABEL: Record<CompilerRequest["status"], string> = {
  parsed: "Draft",
  matched: "Matched",
  invites_sent: "Invites sent",
};

export default function CompilerPage() {
  const { club, isClubAdmin } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [step, setStep] = useState<number | null>(null);

  const recent = useCollection<CompilerRequest>(
    () => query(collection(clientDb(), "compilerRequests"), where("clubId", "==", club!.id)),
    `compiler-recent-${club!.id}`,
  );
  const history = [...recent.data].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)).slice(0, 6);

  async function compile() {
    if (text.trim().length < 10) return toast.error("Tell us a bit more about the event first.");
    setStep(0);
    try {
      const { reqId, parsedBy } = await api<{ reqId: string; parsedBy: string }>("/api/compiler/parse", {
        body: { rawText: text, clubId: club!.id },
      });
      if (parsedBy === "fallback") toast("Read with the built-in rules. You can fix anything on the next screen.");
      setStep(1);
      try {
        await api("/api/compiler/match", { body: { reqId } });
      } catch (e) {
        toast.error(e instanceof Error ? `Couldn't match yet: ${e.message}` : "Couldn't match yet");
      }
      setStep(2);
      router.push(`/compiler/${reqId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setStep(null);
    }
  }

  const busy = step !== null;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New collaboration"
        description="Describe the event in a sentence. Mention the date, how many people, and what you're missing."
      />

      <div className="rounded-xl bg-surface shadow-card transition-shadow duration-150 focus-within:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent)]">
        <textarea
          aria-label="Describe your event"
          rows={4}
          className="block w-full resize-none bg-transparent px-4 pt-4 text-[15px] leading-relaxed placeholder:text-muted/60 focus:outline-none"
          placeholder="We're running a 24-hour hackathon on 15 Nov for 200 people and still need…"
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) compile();
          }}
        />
        <div className="flex items-center gap-3 px-3 pb-3 pt-2">
          <span className="hidden items-center gap-1 text-xs text-muted sm:flex">
            <kbd className="rounded bg-surface-2 px-1 font-sans">Ctrl</kbd>
            <CornerDownLeft className="size-3" />
          </span>
          <Button onClick={compile} disabled={busy || !isClubAdmin} className="ml-auto">
            {busy ? <Spinner /> : null} Find partners {!busy && <ArrowRight />}
          </Button>
        </div>
      </div>

      {busy ? (
        <ol className="mt-5 space-y-1.5" aria-live="polite">
          {STEPS.map((label, i) => (
            <li key={label} className={cn("flex items-center gap-2 text-[13px] transition-colors duration-200", step! >= i ? "text-ink" : "text-muted/50")}>
              {step! > i ? <Check className="size-3.5 text-good" /> : step === i ? <Spinner /> : <span className="size-3.5" />}
              {label}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-[13px] text-muted">
          Try{" "}
          {EXAMPLES.map((ex, i) => (
            <span key={ex.label}>
              <button onClick={() => setText(ex.text)} className="text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
                {ex.label}
              </button>
              {i < EXAMPLES.length - 2 ? ", " : i === EXAMPLES.length - 2 ? " or " : "."}
            </span>
          ))}
        </p>
      )}

      {!isClubAdmin && <p className="mt-4 text-[13px] text-muted">Only club admins can start a collaboration.</p>}

      {history.length > 0 && !busy && (
        <section className="mt-14">
          <h2 className="mb-3 text-sm font-semibold">Earlier</h2>
          <ul className="divide-y divide-line">
            {history.map((r) => (
              <li key={r.id}>
                <Link href={`/compiler/${r.id}`} className="group flex items-baseline gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium group-hover:underline">{r.parsed.eventTitle}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{r.rawText}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {STATUS_LABEL[r.status]} · {timeAgo(r.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
