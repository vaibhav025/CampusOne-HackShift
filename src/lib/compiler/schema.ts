import { z } from "zod";
import { CAPABILITY_TYPES } from "@/lib/types";

// Zod mirror of the parse schema in spec 8.1. Lenient where models tend to
// drift (numbers as strings, unknown priority) so a near-miss still validates.

const needType = z.enum(CAPABILITY_TYPES);
const nullableInt = z.preprocess(
  (v) => (v === "" || v === undefined ? null : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) || null : v),
  z.number().int().positive().nullable(),
);

export const needSchema = z.object({
  id: z.string().min(1),
  type: needType,
  detail: z.string().trim().min(1).max(300),
  priority: z.preprocess((v) => (["high", "medium", "low"].includes(String(v)) ? v : "medium"), z.enum(["high", "medium", "low"])),
  quantity: nullableInt.optional().default(null),
});

export const parsedSchema = z.object({
  eventTitle: z.string().trim().min(1).max(160),
  eventType: z.string().trim().min(1).max(80),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .catch(null),
  city: z.string().trim().min(1).nullable().catch(null),
  expectedSize: nullableInt.catch(null),
  mode: z.enum(["offline", "online", "hybrid"]).nullable().catch(null),
  needs: z.array(needSchema).max(12),
  suggestedMissingNeeds: z
    .array(z.object({ type: needType, reason: z.string().trim().min(1).max(200) }))
    .max(3)
    .default([]),
});

export type ParsedInput = z.infer<typeof parsedSchema>;
