import { z } from "zod";
import { requireClubMember } from "@/lib/server/auth";
import { llmJSON, LLMError } from "@/lib/server/llm";
import { body, route } from "@/lib/server/route";

const SYSTEM = `Write an engaging event description for a student club event, 60 to 110 words,
in plain prose (no markdown, no hashtags). Use only the facts given; never invent dates,
prizes or speakers. Return ONLY JSON: { "description": string }`;

/** Small AI helper: bullet points -> event description. Falls back to stitching the bullets. */
export const POST = route(async (req) => {
  const { club } = await requireClubMember(req);
  const { bullets, title } = await body(
    req,
    z.object({ bullets: z.string().trim().min(3).max(2000), title: z.string().max(120).optional() }),
  );
  try {
    const { description } = await llmJSON({
      system: SYSTEM,
      user: `Host club: ${club.name}, ${club.college}\nEvent title: ${title ?? "(untitled)"}\nNotes:\n${bullets}`,
      schema: z.object({ description: z.string().min(20) }),
    });
    return { description, generatedBy: "llm" };
  } catch (e) {
    if (!(e instanceof LLMError)) throw e;
    const lines = bullets
      .split(/\n|•|- /)
      .map((s) => s.trim().replace(/[.;]+$/, ""))
      .filter(Boolean);
    const description = `${title ? `${title} is` : "This is"} hosted by ${club.name}, ${club.college}. ${lines
      .map((l) => l.charAt(0).toUpperCase() + l.slice(1))
      .join(". ")}. Join us!`;
    return { description, generatedBy: "fallback" };
  }
});
