import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MATCHES = [
  { name: "CyberSec Society", college: "NIT Delhi", offer: "8 security mentors, CTF finalists", score: 81, note: "6 done · 0 dropped · 4.6★" },
  { name: "ByteForge", college: "IIIT Delhi", offer: "5 mentors for AI & security tracks", score: 76, note: "New club · verified" },
  { name: "TechNova Club", college: "Sample College", offer: "Hackathon mentors, web & app", score: 68, note: "3 done · 2 dropped", warn: true },
];

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-2xl bg-teal-900 shadow-pop">
      <div className="flex items-center gap-1.5 border-b border-line bg-teal-950/40 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-muted/25" />
        <span className="size-2.5 rounded-full bg-muted/25" />
        <span className="size-2.5 rounded-full bg-muted/25" />
        <span className="ml-3 text-xs text-muted">New collaboration</span>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <p className="text-[15px] leading-relaxed">
          24-hour cybersecurity hackathon on 15 Nov, 200 participants, need{" "}
          <mark className="rounded bg-teal-500/20 px-1 text-accent-ink">sponsors</mark>,{" "}
          <mark className="rounded bg-teal-500/20 px-1 text-accent-ink">mentors</mark> and a{" "}
          <mark className="rounded bg-teal-500/20 px-1 text-accent-ink">venue</mark>.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>Sun, 15 Nov</span>
          <span>Delhi</span>
          <span>200 people</span>
          <span className="text-warn">Also consider: volunteers</span>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Mentors · top 3 matches</p>
          <ul className="divide-y divide-line rounded-xl bg-teal-950/50 shadow-inset">
            {MATCHES.map((m) => (
              <li key={m.name} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {m.name} <span className="font-normal text-muted">· {m.college}</span>
                  </p>
                  <p className="truncate text-xs text-muted">{m.offer}</p>
                </div>
                <span className={cn("hidden text-xs sm:inline", m.warn ? "text-warn" : "text-muted")}>{m.note}</span>
                <span className="w-11 rounded-md bg-teal-500/12 py-0.5 text-center font-mono text-[13px] tabular-nums text-accent-ink">{m.score}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { title: "Write one sentence", body: "Describe the event the way you'd text a friend. We pull out the date, size, city and everything you asked for." },
  { title: "See who can help", body: "Clubs that listed a matching venue, mentor or sponsor, ranked. Hover a score to see exactly how it was worked out." },
  { title: "Invite in a click", body: "We draft the message from the match reasons. You edit it, send it, and it lands in their inbox and their email." },
  { title: "Work on one board", body: "When they accept, a kickoff call gets booked and both clubs share a task list with owners and deadlines." },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(900px_520px_at_15%_-10%,rgb(10_112_117/0.28),transparent_65%),radial-gradient(700px_420px_at_95%_10%,rgb(107_163_190/0.10),transparent_60%)]">
      <header className="sticky top-0 z-30 border-b border-line bg-teal-950/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3.5">
        <Logo href="/" />
        <nav className="flex items-center gap-1">
          <Link href="/explore" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
            Clubs
          </Link>
          <Link href="/events" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
            Events
          </Link>
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Sign in
          </Link>
        </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-teal-900/80 px-3 py-1 text-xs text-sky-soft shadow-[0_0_0_1px_var(--line),inset_0_1px_0_rgb(255_255_255/0.04)]"><span className="size-1.5 rounded-full bg-teal-500" />For the people who run student clubs</p>
          <h1 className="display mt-6 max-w-3xl text-[40px] font-semibold text-ink sm:text-[60px]">
            Don&apos;t just join a community. Connect the communities.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
            Your hackathon needs a venue, mentors and a sponsor. Another club on another campus has all three and nobody to lend them to. CampusOne finds them, introduces you, and keeps both teams on the same task list.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/compiler" className={buttonVariants({ size: "lg" })}>
              Try it with your event <ArrowRight />
            </Link>
            <Link href="#how" className={buttonVariants({ variant: "ghost", size: "lg" })}>
              How it works
            </Link>
          </div>

          <div className="mt-16 sm:mt-20">
            <ProductPreview />
          </div>
        </section>

        <section id="how" className="border-t border-line bg-teal-950/40">
          <div className="mx-auto max-w-5xl px-5 py-20">
            <h2 className="max-w-md text-2xl font-semibold">From one sentence to a shared plan</h2>
            <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-900 font-mono text-xs tabular-nums text-teal-500 shadow-card">0{i + 1}</span>
                  <div>
                    <h3 className="font-medium">{s.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid max-w-5xl gap-10 px-5 py-20 md:grid-cols-[1fr_1.1fr] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold">Followers show popularity. We show reliability.</h2>
              <p className="mt-4 text-[13px] leading-relaxed text-muted">
                Every club has a Trust Passport: how many collaborations it finished, how many it dropped, whether its tasks landed on time, and what partners said afterwards. There&apos;s no secret score. Click any number and you see the collaborations behind it.
              </p>
              <Link href="/clubs/cybersec-society-nitd" className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-accent-ink hover:underline">
                Open a real passport <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="rounded-xl bg-surface p-5 shadow-card">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">CyberSec Society</p>
                <p className="text-xs text-good">Verified · std.ggsipu.ac.in</p>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-y-5 sm:grid-cols-4">
                {[
                  ["6 / 0", "finished / dropped"],
                  ["21/24", "tasks on time"],
                  ["4.6", "partner rating"],
                  ["6h", "avg. reply"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dd className="text-xl font-semibold tabular-nums tracking-[-0.02em]">{v}</dd>
                    <dt className="mt-0.5 text-xs text-muted">{l}</dt>
                  </div>
                ))}
              </dl>
              <p className="mt-5 border-t border-line pt-4 text-[13px] text-muted">
                &ldquo;Flawless CTF infra and mentors were always available.&rdquo; <span className="text-ink">Founders&apos; Cell, JMI</span>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-5 py-6 text-xs text-muted">
          <span>Made by CodeCrunchers for clubs across Delhi NCR.</span>
          <Link href="/dashboard" className="hover:text-ink">
            Open the demo →
          </Link>
        </div>
      </footer>
    </div>
  );
}
