import { z } from "zod";
import { requireClubAdmin } from "@/lib/server/auth";
import { requireCollabMember } from "@/lib/server/collab";
import { body, route } from "@/lib/server/route";
import { generateTasksForCollab } from "@/lib/server/tasks";

/** LLM call #4: (re)writes the task plan. Tasks someone already started are kept. */
export const POST = route(async (req) => {
  const { club } = await requireClubAdmin(req);
  const { collabId } = await body(req, z.object({ collabId: z.string().min(1) }));
  await requireCollabMember(collabId, club.id);
  return generateTasksForCollab(collabId, { replace: true });
});
