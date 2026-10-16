import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Accepts Firestore Timestamps (client or admin), {seconds}, ISO strings, numbers and Dates. */
export function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object") {
    const v = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof v.toDate === "function") return v.toDate();
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
    if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
  }
  return null;
}

// All users are in India and servers run in UTC, so dates are always shown in IST.
const TZ = "Asia/Kolkata";

export function formatDate(value: unknown, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-IN", { timeZone: TZ, ...opts }) : "—";
}

export function formatDateTime(value: unknown) {
  const d = toDate(value);
  return d
    ? d.toLocaleString("en-IN", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "—";
}

export function timeAgo(value: unknown) {
  const d = toDate(value);
  if (!d) return "";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function pct(n: number | null | undefined) {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

/** Initials that survive emoji, accents and stray spaces (Array.from splits by code point). */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  const letters = words.slice(0, 2).map((w) => Array.from(w).find((ch) => /[\p{L}\p{N}]/u.test(ch)) ?? "");
  return letters.join("").toLocaleUpperCase() || "?";
}
