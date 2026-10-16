import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { TASKS_PROMPT } from "@/lib/compiler/prompts";
import { adminDb } from "@/lib/firebase/admin";
import { llmJSON, LLMError } from "@/lib/server/llm";
import { dueDateFor, planTasks, type PlannedTask } from "@/lib/task-templates";
import { toDate } from "@/lib/utils";
import type { CapabilityType, Club, Collaboration, CollabRequest } from "@/lib/types";

const tasksSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(120),
        description: z.string().trim().max(400).default(""),
        ownerClubId: z.string(),
        daysBeforeEvent: z.coerce.number().int().min(1).max(30),
      }),
    )
    .min(1)
    .max(12),
});

/** The capability type each partner was invited for, from the accepted requests. */
async function partnerRoles(collab: Collaboration) {
  const db = adminDb();
  const reqs = collab.compilerRequestId
    ? (await db.collection("collabRequests").where("compilerRequestId", "==", collab.compilerRequestId).get()).docs.map(
        (d) => d.data() as CollabRequest,
      )
    : [];
  return collab.clubIds
    .filter((id) => id !== collab.hostClubId)
    .map((clubId) => ({
      clubId,
      type: (reqs.find((r) => r.toClubId === clubId && r.status === "accepted")?.needType ?? null) as CapabilityType | null,
    }));
}

/**
 * LLM call #4: writes the task plan for a collaboration. `onlyForClubId` adds
 * tasks for a partner who joined later without touching the existing plan.
 * Falls back to the template plan when the model is unavailable.
 */
export async function generateTasksForCollab(collabId: string, opts: { onlyForClubId?: string; replace?: boolean } = {}) {
  const db = adminDb();
  const ref = db.collection("collaborations").doc(collabId);
  const collab = { id: collabId, ...(await ref.get()).data() } as Collaboration;
  if (!collab.clubIds) throw new Error("Collaboration not found");

  const existing = await db.collection("tasks").where("collabId", "==", collabId).get();
  // Tasks someone already started (or any task, when adding a joiner's tasks) must not be re-planned.
  const keep = existing.docs.filter((d) => !opts.replace || d.data().status !== "todo").map((d) => d.data().title as string);

  const clubSnaps = await Promise.all(collab.clubIds.map((id) => db.collection("clubs").doc(id).get()));
  const clubs = Object.fromEntries(clubSnaps.map((s) => [s.id, { id: s.id, ...s.data() } as Club]));
  const partners = await partnerRoles(collab);
  const eventDate = toDate(collab.eventDate);

  let plan: PlannedTask[] = [];
  let generatedBy: "llm" | "template" = "llm";
  try {
    const members = collab.clubIds.map((id) => ({
      clubId: id,
      clubName: clubs[id]?.name ?? id,
      role: id === collab.hostClubId ? "host (overall planning)" : `partner providing ${partners.find((p) => p.clubId === id)?.type ?? "support"}`,
    }));
    const res = await llmJSON({
      system: TASKS_PROMPT,
      user: `Event: ${collab.title}
Event date: ${eventDate ? eventDate.toISOString().slice(0, 10) : "not set (assume about 30 days away)"}
Clubs: ${JSON.stringify(members)}${opts.onlyForClubId ? `\nOnly create tasks owned by ${opts.onlyForClubId}; they just joined an existing plan.` : ""}${keep.length ? `\nThese tasks already exist; do not repeat or rephrase them: ${JSON.stringify(keep)}` : ""}`,
      schema: tasksSchema,
    });
    plan = res.tasks.filter((t) => collab.clubIds.includes(t.ownerClubId));
    if (plan.length === 0) throw new LLMError("No tasks with valid owners");
  } catch (e) {
    if (!(e instanceof LLMError)) throw e;
    generatedBy = "template";
    plan = planTasks(collab.hostClubId, partners);
  }
  if (opts.onlyForClubId) plan = plan.filter((t) => t.ownerClubId === opts.onlyForClubId);
  // Template fallback can't read the instruction above, so drop exact-title repeats.
  plan = plan.filter((t) => !keep.some((k) => k.toLowerCase() === t.title.toLowerCase()));
  plan.sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);

  const batch = db.batch();
  let order = 0;
  if (opts.replace) {
    // Keep anything someone already started; replace untouched to-dos.
    existing.docs.filter((d) => d.data().status === "todo").forEach((d) => batch.delete(d.ref));
    order = Math.max(0, ...existing.docs.filter((d) => d.data().status !== "todo").map((d) => (d.data().order ?? 0) + 1));
  } else {
    order = Math.max(0, ...existing.docs.map((d) => (d.data().order ?? 0) + 1));
  }

  const created = plan.map((t, i) => {
    const docRef = db.collection("tasks").doc();
    const data = {
      collabId,
      title: t.title,
      description: t.description,
      ownerClubId: t.ownerClubId,
      dueDate: dueDateFor(eventDate, t.daysBeforeEvent),
      status: "todo" as const,
      completedAt: null,
      order: order + i,
      updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(docRef, data);
    return { id: docRef.id, ...data, dueDate: data.dueDate.toISOString(), updatedAt: undefined };
  });
  await batch.commit();
  return { tasks: created, generatedBy };
}
