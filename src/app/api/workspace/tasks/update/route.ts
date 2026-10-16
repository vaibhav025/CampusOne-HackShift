import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError, requireClubMember } from "@/lib/server/auth";
import { requireCollabMember } from "@/lib/server/collab";
import { body, route } from "@/lib/server/route";

/** Moves a task between columns. Any member of the collaboration can move any task. */
export const POST = route(async (req) => {
  const { club } = await requireClubMember(req);
  const input = await body(
    req,
    z.object({ taskId: z.string().min(1), status: z.enum(["todo", "doing", "done"]), order: z.number().int().min(0).optional() }),
  );
  const ref = adminDb().collection("tasks").doc(input.taskId);
  const task = (await ref.get()).data();
  if (!task) throw new HttpError(404, "Task not found");
  const { collab } = await requireCollabMember(task.collabId, club.id);
  if (collab.status !== "ongoing") throw new HttpError(409, "This collaboration is closed");

  const update: Record<string, unknown> = { status: input.status, updatedAt: FieldValue.serverTimestamp() };
  // completedAt drives the Passport's on-time metric, so it only changes when crossing "done".
  if (input.status === "done" && task.status !== "done") update.completedAt = FieldValue.serverTimestamp();
  if (input.status !== "done" && task.status === "done") update.completedAt = null;
  if (input.order !== undefined) update.order = input.order;
  await ref.update(update);
  return { ok: true };
});
