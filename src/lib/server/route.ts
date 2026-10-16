import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "@/lib/server/auth";

type Handler<C> = (req: Request, ctx: C) => Promise<Response | unknown>;

/** Wraps a route handler: JSON responses, HttpError/Zod mapping, and logging. */
export function route<C = unknown>(handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      const result = await handler(req, ctx);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: "Invalid input", issues: e.issues }, { status: 400 });
      }
      console.error(`[api] ${req.method} ${new URL(req.url).pathname}`, e);
      const message = e instanceof Error ? e.message : "Server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const json = await req.json().catch(() => ({}));
  return schema.parse(json);
}

/** Converts Firestore admin Timestamps into ISO strings so they serialise cleanly. */
export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => {
      if (v && typeof v === "object" && typeof v.toDate === "function") return v.toDate().toISOString();
      return v;
    }),
  );
}
