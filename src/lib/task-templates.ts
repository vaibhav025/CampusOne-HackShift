// Deterministic task plan (fallback for prompt 8.4): host plans, partners deliver what they provide.
import type { CapabilityType } from "@/lib/types";

export interface PlannedTask {
  title: string;
  description: string;
  ownerClubId: string;
  daysBeforeEvent: number;
}

const HOST_TASKS: Omit<PlannedTask, "ownerClubId">[] = [
  { title: "Finalise event agenda", description: "Lock the schedule, tracks and judging criteria.", daysBeforeEvent: 21 },
  { title: "Open registrations", description: "Publish the form and share it with partner clubs.", daysBeforeEvent: 18 },
  { title: "Brief volunteers and run-of-show", description: "Share the minute-by-minute plan with every club.", daysBeforeEvent: 4 },
  { title: "Send participant reminders", description: "Email and WhatsApp reminders with venue details.", daysBeforeEvent: 2 },
];

const PARTNER_TASKS: Record<CapabilityType, Omit<PlannedTask, "ownerClubId">[]> = {
  sponsor: [
    { title: "Confirm sponsor prize pool", description: "Share prize split and payout timeline.", daysBeforeEvent: 20 },
    { title: "Send sponsor logos and swag list", description: "High-res logos for posters and certificates.", daysBeforeEvent: 12 },
  ],
  venue: [
    { title: "Confirm venue booking", description: "Written confirmation for the full event window.", daysBeforeEvent: 25 },
    { title: "Test Wi-Fi, power and AV", description: "Walkthrough with the host team.", daysBeforeEvent: 3 },
  ],
  mentor: [
    { title: "Share mentor list and slots", description: "Names, expertise and availability per track.", daysBeforeEvent: 14 },
    { title: "Run mentor briefing", description: "Align mentors on rules and judging.", daysBeforeEvent: 3 },
  ],
  camera: [{ title: "Plan photo and video coverage", description: "Shot list and crew schedule.", daysBeforeEvent: 7 }],
  social_media: [{ title: "Publish promo reels", description: "Two reels before the event, stories during.", daysBeforeEvent: 10 }],
  design: [{ title: "Deliver posters and certificates", description: "Event identity kit in the agreed sizes.", daysBeforeEvent: 15 }],
  volunteers: [{ title: "Assign volunteer shifts", description: "Registration, help desk and food shifts.", daysBeforeEvent: 6 }],
  tech_support: [{ title: "Set up judging platform and help desk", description: "Submission portal and on-call tech help.", daysBeforeEvent: 5 }],
  promotion: [{ title: "Promote to partner networks", description: "Newsletter, Discord and WhatsApp outreach.", daysBeforeEvent: 16 }],
};

export function planTasks(hostClubId: string, partners: { clubId: string; type: CapabilityType | null }[]): PlannedTask[] {
  const tasks: PlannedTask[] = HOST_TASKS.map((t) => ({ ...t, ownerClubId: hostClubId }));
  for (const p of partners) for (const t of PARTNER_TASKS[p.type ?? "volunteers"]) tasks.push({ ...t, ownerClubId: p.clubId });
  return tasks.slice(0, 10).sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);
}

/** dueDate = eventDate − daysBeforeEvent, clamped to tomorrow if in the past. */
export function dueDateFor(eventDate: Date | null, daysBeforeEvent: number, now = new Date()) {
  const base = eventDate ?? new Date(now.getTime() + 30 * 86_400_000);
  const due = new Date(base.getTime() - daysBeforeEvent * 86_400_000);
  const tomorrow = new Date(now.getTime() + 86_400_000);
  return due < tomorrow ? tomorrow : due;
}
