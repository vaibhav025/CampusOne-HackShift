import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubAdmin } from "@/lib/server/auth";
import { embedCapability } from "@/lib/server/capabilities";
import { body, route } from "@/lib/server/route";
import { CAPABILITY_TYPES } from "@/lib/types";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

const schema = z
  .object({
    id: z.string().optional(),
    type: z.enum(CAPABILITY_TYPES),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(600).default(""),
    city: z.string().trim().min(2).max(60),
    capacity: z.number().int().positive().max(100000).nullable().optional(),
    availableFrom: dateStr,
    availableTo: dateStr,
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10).default([]),
    active: z.boolean().default(true),
  })
  .refine((c) => !c.availableFrom || !c.availableTo || c.availableFrom <= c.availableTo, {
    message: "Available-from must be before available-to",
  });

/** Create or update one of my club's capabilities, then (re)compute its embedding. */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const { id, availableFrom, availableTo, ...input } = await body(req, schema);
  const col = adminDb().collection("capabilities");
  const data = {
    ...input,
    capacity: input.capacity ?? null,
    availableFrom: availableFrom ? new Date(`${availableFrom}T00:00:00`) : null,
    availableTo: availableTo ? new Date(`${availableTo}T23:59:59`) : null,
  };

  let ref;
  if (id) {
    ref = col.doc(id);
    const existing = (await ref.get()).data();
    if (!existing || existing.clubId !== club.id) throw new HttpError(404, "Capability not found");
    await ref.update(data);
  } else {
    ref = col.doc();
    await ref.set({ ...data, clubId: club.id, createdAt: FieldValue.serverTimestamp() });
  }
  const embedded = await embedCapability(ref.id).catch(() => false);
  return { id: ref.id, embedded };
});

export const DELETE = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new HttpError(400, "Missing id");
  const ref = adminDb().collection("capabilities").doc(id);
  if ((await ref.get()).data()?.clubId !== club.id) throw new HttpError(404, "Capability not found");
  await ref.delete();
  return { ok: true };
});
