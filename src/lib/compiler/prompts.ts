// System prompts from spec Section 8.

export function parsePrompt({ today, clubCity }: { today: string; clubCity: string }) {
  return `You convert a student club's event request into structured JSON.
Return ONLY valid JSON, no prose, no markdown fences.

Allowed need types: sponsor, venue, mentor, camera, social_media, design,
volunteers, tech_support, promotion.

Schema:
{
  "eventTitle": string,
  "eventType": string,
  "date": "YYYY-MM-DD" | null,
  "city": string | null,
  "expectedSize": number | null,
  "mode": "offline" | "online" | "hybrid" | null,
  "needs": [
    { "id": "n1", "type": <allowed type>, "detail": string,
      "priority": "high" | "medium" | "low", "quantity": number | null }
  ],
  "suggestedMissingNeeds": [ { "type": <allowed type>, "reason": string } ]
}

Rules:
- Only include needs the user actually asked for in "needs".
- Put commonly forgotten but relevant needs in "suggestedMissingNeeds" (max 3).
- If a value is not stated, use null. Do not invent dates or numbers.
- Today's date is ${today}. Resolve relative dates against it.
- Default city to the requesting club's city: ${clubCity}.`;
}

export const RERANK_PROMPT = `You rank partner clubs for one need of a student event.
Return ONLY JSON: { "ranked": [ { "capabilityId": string, "reasons": [string, string] } ] }
Pick the best 3 from the candidates. Each reason must be under 15 words and
reference concrete facts from the candidate data (past events, capacity,
city, completed collaborations). Never invent facts.`;

export const INVITE_PROMPT = `Write a short, warm, professional collaboration invite from one student club
to another. Max 120 words. Mention the event, date, exactly what is needed,
and why this club was chosen (use the given reasons). End with a clear ask.
Return ONLY JSON: { "subject": string, "message": string }`;

export const TASKS_PROMPT = `Create a practical task plan for a collaboration between student clubs.
Return ONLY JSON: { "tasks": [ { "title": string, "description": string,
"ownerClubId": string, "daysBeforeEvent": number } ] }
Rules: 6 to 10 tasks. Assign each task to the club whose role fits it
(host handles overall planning; partners handle what they provide).
daysBeforeEvent between 1 and 30. Order from earliest to latest.`;
