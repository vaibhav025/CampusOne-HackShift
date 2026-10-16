import type { ParsedRequest } from "@/lib/types";

/** Post-processes a parse (LLM or fallback): stable ids, default city, no duplicate suggestions. */
export function normalizeParsed(p: ParsedRequest, clubCity: string): ParsedRequest {
  const needs = p.needs.map((n, i) => ({ ...n, id: `n${i + 1}`, quantity: n.quantity ?? null }));
  const needTypes = new Set(needs.map((n) => n.type));
  const seen = new Set<string>();
  const suggestedMissingNeeds = (p.suggestedMissingNeeds ?? []).filter((s) => {
    if (needTypes.has(s.type) || seen.has(s.type)) return false;
    seen.add(s.type);
    return true;
  });
  return {
    eventTitle: p.eventTitle,
    eventType: p.eventType,
    date: p.date ?? null,
    city: p.city || clubCity || null,
    expectedSize: p.expectedSize ?? null,
    mode: p.mode ?? null,
    needs,
    suggestedMissingNeeds: suggestedMissingNeeds.slice(0, 3),
  };
}
