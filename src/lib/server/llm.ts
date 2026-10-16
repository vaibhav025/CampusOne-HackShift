import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

// One JSON-in/JSON-out helper for every AI call (spec Section 8), with the
// provider chosen by LLM_PROVIDER. Callers catch LLMError and use their
// deterministic fallback, so the demo never depends on the network.

export class LLMError extends Error {}

type Provider = "claude" | "gemini";

export function llmProvider(): Provider | null {
  const p = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  if (p === "claude" && process.env.ANTHROPIC_API_KEY) return "claude";
  if (p === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

/** Strips ```json fences and any prose around the outermost JSON object. */
export function extractJSON(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new LLMError("No JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Models that support the server-side refusal fallback (`fallbacks: "default"`).
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

async function callClaude(system: string, user: string, timeoutMs: number): Promise<string> {
  const model = process.env.LLM_MODEL || "claude-opus-5-5";
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: timeoutMs, maxRetries: 0 });
  const supportsEffort = !/haiku-4|-3-/.test(model);
  try {
    const res = await client.beta.messages.create({
      model,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: user }],
      // Short structured tasks: low effort keeps latency near the ~5 s budget.
      ...(supportsEffort ? { output_config: { effort: "low" as const } } : {}),
      ...(FALLBACK_MODELS.has(model)
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
    });
    if (res.stop_reason === "refusal") throw new LLMError("Model declined the request");
    if (res.stop_reason === "max_tokens") throw new LLMError("Model output was truncated");
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  } catch (e) {
    if (e instanceof LLMError) throw e;
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new LLMError("Claude timed out");
    if (e instanceof Anthropic.RateLimitError) throw new LLMError("Claude rate limited");
    if (e instanceof Anthropic.APIError) throw new LLMError(`Claude API error ${e.status}: ${e.message}`);
    throw new LLMError(e instanceof Error ? e.message : "Claude call failed");
  }
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";

// Tried in order. Flash-Lite answered our parse prompt correctly in ~2 s; the
// others are backups for when a model is overloaded (503) or retired (404).
const GEMINI_FALLBACKS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"];

async function callGemini(system: string, user: string, timeoutMs: number): Promise<string> {
  const models = [...new Set([process.env.LLM_MODEL, ...GEMINI_FALLBACKS].filter(Boolean) as string[])];
  const deadline = Date.now() + timeoutMs;
  let lastError: LLMError | null = null;
  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    try {
      return await callGeminiModel(model, system, user, remaining);
    } catch (e) {
      lastError = e instanceof LLMError ? e : new LLMError(String(e));
      // Only "this model can't serve right now" is worth trying another model for.
      if (!/error (404|429|500|503)\b/.test(lastError.message)) throw lastError;
      console.warn(`[llm] ${model} unavailable, trying next model`);
    }
  }
  throw lastError ?? new LLMError("Gemini timed out");
}

async function callGeminiModel(model: string, system: string, user: string, timeoutMs: number): Promise<string> {
  try {
    const res = await fetch(`${GEMINI}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new LLMError(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const parts: { text?: string }[] = data.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p) => p.text ?? "").join("");
  } catch (e) {
    if (e instanceof LLMError) throw e;
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new LLMError("Gemini timed out");
    throw new LLMError(e instanceof Error ? e.message : "Gemini call failed");
  }
}

/**
 * Asks the configured model for JSON and validates it with Zod.
 * Retries once on a parse/validation failure; network errors and timeouts are not retried.
 */
export async function llmJSON<T>({
  system,
  user,
  schema,
  timeoutMs = 8000,
}: {
  system: string;
  user: string;
  schema: ZodType<T>;
  timeoutMs?: number;
}): Promise<T> {
  const provider = llmProvider();
  if (!provider) throw new LLMError("No LLM configured");
  const call = provider === "claude" ? callClaude : callGemini;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await call(
      system,
      attempt === 0 ? user : `${user}\n\nYour previous reply was not valid JSON for the schema. Return ONLY the JSON object.`,
      timeoutMs,
    );
    try {
      return schema.parse(extractJSON(text));
    } catch (e) {
      lastError = e;
    }
  }
  throw new LLMError(`Invalid JSON from model: ${lastError instanceof Error ? lastError.message.slice(0, 200) : ""}`);
}

/** Embeds texts with the provider's embedding endpoint. Returns null when unavailable (tag fallback takes over). */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (!texts.length || !process.env.GEMINI_API_KEY) return null;
  // Claude has no embedding endpoint; Gemini embeddings work whichever provider handles chat.
  const model = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
  try {
    const res = await fetch(`${GEMINI}/${model}:batchEmbedContents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        requests: texts.map((t) => ({ model: `models/${model}`, content: { parts: [{ text: t }] } })),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn("[embed] failed", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    const vectors: number[][] = (data.embeddings ?? []).map((e: { values: number[] }) => e.values);
    return vectors.length === texts.length ? vectors : null;
  } catch (e) {
    console.warn("[embed] error", e);
    return null;
  }
}

export function capabilityText(c: { type: string; title: string; description?: string; tags?: string[] }) {
  return `${c.type.replace("_", " ")}: ${c.title}. ${c.description ?? ""} Tags: ${(c.tags ?? []).join(", ")}`;
}
