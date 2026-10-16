// Shared (client + server) Calendar helpers: MVP slot rule and the template-link fallback.

/** Next weekday at 18:00 IST, 30 minutes. */
export function nextSlot(from = new Date()) {
  const IST = 5.5 * 3600_000;
  const local = new Date(from.getTime() + IST);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 18, 0));
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  const start = new Date(d.getTime() - IST);
  return { start, end: new Date(start.getTime() + 30 * 60_000) };
}

const gcalDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function templateLink({ title, details, start, end, emails }: { title: string; details: string; start: Date; end: Date; emails: string[] }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${gcalDate(start)}/${gcalDate(end)}`,
    details,
    add: emails.filter(Boolean).join(","),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
