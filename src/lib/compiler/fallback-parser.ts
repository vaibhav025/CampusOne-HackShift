// Deterministic parser used when no LLM is configured or the LLM fails/times out.
// It understands the common shapes of a one-line event request well enough
// for the demo, and the organizer can edit every field afterwards anyway.
import type { CapabilityType, EventMode, Need, ParsedRequest } from "@/lib/types";

const NEED_PATTERNS: { type: CapabilityType; re: RegExp; detail: string }[] = [
  { type: "sponsor", re: /\bsponsor(s|ship|ships)?\b|\bfunding\b|\bprize (money|pool)\b/i, detail: "Sponsorship for prizes and logistics" },
  { type: "venue", re: /\bvenue\b|\bhall\b|\bauditorium\b|\bspace to host\b|\bplace to host\b/i, detail: "Venue to host the event" },
  { type: "mentor", re: /\bmentor(s|ship)?\b|\bjudges?\b|\bspeakers?\b/i, detail: "Mentors to guide participants" },
  { type: "camera", re: /\bcamera\b|\bphotograph(er|ers|y)\b|\bvideograph/i, detail: "Photo and video coverage" },
  { type: "social_media", re: /\bsocial media\b|\binstagram\b|\breels?\b/i, detail: "Social media coverage" },
  { type: "design", re: /\bdesign(ers?)?\b|\bposters?\b|\bbranding\b/i, detail: "Design and branding" },
  { type: "volunteers", re: /\bvolunteers?\b|\bhelpers?\b/i, detail: "Volunteers for on-ground management" },
  { type: "tech_support", re: /\btech(nical)? support\b|\bwi-?fi\b|\bsound\b|\bav setup\b|\binfra(structure)?\b/i, detail: "Technical support" },
  { type: "promotion", re: /\bpromot(e|ion)\b|\boutreach\b|\bpublicity\b|\bmarketing\b/i, detail: "Promotion to reach more students" },
];

// Noun that may follow a count, e.g. "3 mentors", "2 photographers".
const QTY_WORD: Record<CapabilityType, string> = {
  sponsor: "sponsor",
  venue: "(?:venue|hall)",
  mentor: "(?:mentor|judge|speaker)",
  camera: "(?:camera|photographer)",
  social_media: "(?:reel|post)",
  design: "(?:designer|poster)",
  volunteers: "volunteer",
  tech_support: "(?:engineer|technician)",
  promotion: "(?:post|newsletter)",
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const EVENT_TYPES = ["hackathon", "workshop", "ctf", "conference", "summit", "meetup", "fest", "bootcamp", "competition", "webinar", "panel", "seminar", "exhibition", "debate", "talk", "sprint"];

const KNOWN_CITIES = ["Delhi", "New Delhi", "Noida", "Greater Noida", "Gurugram", "Gurgaon", "Faridabad", "Ghaziabad", "Mumbai", "Bengaluru", "Bangalore", "Pune", "Hyderabad", "Chennai", "Kolkata", "Jaipur", "Chandigarh"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseDate(text: string, today: Date): string | null {
  // ISO date
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return `${iso[1]}-${pad(+iso[2])}-${pad(+iso[3])}`;

  // "15 Nov", "15th November 2026", "Nov 15", "November 15th, 2026"
  const dm = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?(?:,?\s+(20\d{2}))?/i);
  const md = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?/i);
  const m = dm ? { day: +dm[1], mon: dm[2], year: dm[3] } : md ? { day: +md[2], mon: md[1], year: md[3] } : null;
  if (m) {
    const month = MONTHS[m.mon.toLowerCase().slice(0, m.mon.toLowerCase().startsWith("sept") ? 4 : 3)];
    let year = m.year ? +m.year : today.getFullYear();
    const candidate = new Date(year, month, m.day);
    if (!m.year && candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) year += 1;
    const d = new Date(year, month, m.day);
    return d.getMonth() === month ? ymd(d) : null;
  }

  // Relative: "tomorrow", "next week", "in 10 days"
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (/\btomorrow\b/i.test(text)) return ymd(new Date(t.getTime() + 86400000));
  const inDays = text.match(/\bin (\d{1,3}) days?\b/i);
  if (inDays) return ymd(new Date(t.getTime() + +inDays[1] * 86400000));
  if (/\bnext week\b/i.test(text)) return ymd(new Date(t.getTime() + 7 * 86400000));
  if (/\bnext month\b/i.test(text)) return ymd(new Date(t.getFullYear(), t.getMonth() + 1, 1));
  return null;
}

function parseSize(text: string): number | null {
  const m =
    text.match(/(\d[\d,]*)\s*\+?\s*(participants|people|students|attendees|hackers|teams|registrations|delegates)/i) ??
    text.match(/(?:for|expecting|around|about)\s+(\d[\d,]*)\b(?!\s*(?:hours?|hrs?|days?|k\b|%))/i);
  return m ? Number(m[1].replace(/,/g, "")) || null : null;
}

function parseMode(text: string): EventMode | null {
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if (/\b(online|virtual|remote)\b/i.test(text)) return "online";
  if (/\b(offline|in[- ]person|on[- ]campus|venue)\b/i.test(text)) return "offline";
  return null;
}

function parseCity(text: string): string | null {
  for (const c of KNOWN_CITIES) if (new RegExp(`\\b${c}\\b`, "i").test(text)) return c === "Gurgaon" ? "Gurugram" : c === "New Delhi" ? "Delhi" : c;
  return null;
}

function titleCase(s: string) {
  return s.replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bCtf\b/, "CTF").replace(/\bAi\b/, "AI");
}

export function fallbackParse(rawText: string, opts: { today: Date; clubCity: string }): ParsedRequest {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const eventType = EVENT_TYPES.find((t) => new RegExp(`\\b${t}s?\\b`).test(lower)) ?? "event";

  // Title = the descriptive phrase before the first comma / "on <date>" / "need".
  const head = text
    .split(/,|\bneed(?:s|ing)?\b|\bwe need\b|\blooking for\b/i)[0]
    .replace(/\b(on|for|at|by)\s+(\d{1,2}(st|nd|rd|th)?\s+\w+|\w+\s+\d{1,2}(st|nd|rd|th)?)(\s+20\d{2})?\s*$/i, "")
    .replace(/^(we are|we're|i am|i'm|planning|organi[sz]ing|hosting|running|a|an)\s+/gi, "")
    .replace(/^(a|an)\s+/i, "")
    .replace(/\s+(next week|next month|tomorrow|in \d+ days?)\b.*$/i, "")
    .replace(new RegExp(`\\s+(in|at)\\s+(${KNOWN_CITIES.join("|")})\\b.*$`, "i"), "")
    .replace(/\s+(on|for)\s+\d.*$/i, "")
    .trim();
  const eventTitle = head.length >= 4 && head.length <= 80 ? titleCase(head) : titleCase(eventType);

  const expectedSize = parseSize(text);
  // Only the clause after "need/looking for" lists needs, so "cybersecurity hackathon" doesn't imply a mentor.
  const needClause = text.match(/\b(?:need(?:s|ing)?|looking for|require[sd]?|want)\b([\s\S]*)/i)?.[1] ?? text;
  const needs: Need[] = [];
  for (const p of NEED_PATTERNS) {
    if (!p.re.test(needClause)) continue;
    const qty = needClause.match(new RegExp(`(\\d+)\\s+(?:[a-z-]+\\s+)?${QTY_WORD[p.type]}`, "i"));
    let detail = p.detail;
    if (p.type === "venue" && expectedSize) detail = `Venue for ${expectedSize} participants`;
    if (p.type === "mentor" && eventType !== "event") detail = `Mentors for the ${eventType}`;
    needs.push({ id: `n${needs.length + 1}`, type: p.type, detail, priority: needs.length < 3 ? "high" : "medium", quantity: qty ? Number(qty[1]) : null });
  }

  // Commonly forgotten needs for this kind of event
  const has = (t: CapabilityType) => needs.some((n) => n.type === t);
  const suggestions: ParsedRequest["suggestedMissingNeeds"] = [];
  const big = (expectedSize ?? 0) >= 80;
  if (!has("volunteers") && (big || /hackathon|fest|conference|summit/.test(lower)))
    suggestions.push({ type: "volunteers", reason: `${expectedSize ? `${expectedSize} participants` : "A large event"} need registration and help-desk volunteers.` });
  if (!has("tech_support") && /hackathon|ctf|workshop|bootcamp/.test(lower))
    suggestions.push({ type: "tech_support", reason: `A ${eventType} needs reliable Wi-Fi, power and on-call tech help.` });
  if (!has("promotion") && !has("social_media"))
    suggestions.push({ type: "promotion", reason: "Cross-campus promotion helps you reach your registration target." });
  if (!has("camera") && suggestions.length < 3) suggestions.push({ type: "camera", reason: "Photos and an aftermovie make sponsors happy next year." });

  return {
    eventTitle,
    eventType,
    date: parseDate(text, opts.today),
    city: parseCity(text) ?? opts.clubCity ?? null,
    expectedSize,
    mode: parseMode(text) ?? (has("venue") ? "offline" : null),
    needs,
    suggestedMissingNeeds: suggestions.slice(0, 3),
  };
}
