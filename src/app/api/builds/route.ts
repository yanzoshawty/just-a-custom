import { z } from "zod";
import { CreateBuildSchema } from "@/lib/build-schema";
import { createBuild, InsertCapError } from "@/lib/builds";
import { BackendNotConfiguredError } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT = 10; // saves per IP per window
const RATE_WINDOW_MS = 60_000;

// shortcut: in-memory per-instance limit, move to Upstash/DB when deployed on multiple instances
const hits = new Map<string, { count: number; resetAt: number }>();

/** Returns seconds until retry when over the limit, else null. */
function rateLimit(ip: string): number | null {
  const now = Date.now();
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return null;
  }
  entry.count++;
  return entry.count > RATE_LIMIT ? Math.ceil((entry.resetAt - now) / 1000) : null;
}

// Stops reading once the body exceeds max bytes; Content-Length can be absent or wrong.
async function readCapped(req: Request, max: number): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? 0) > max) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const fail = (status: number, error: string, extra?: object, headers?: HeadersInit) =>
  Response.json({ error, ...extra }, { status, headers });

export async function POST(req: Request) {
  if (!/^application\/json\b/i.test(req.headers.get("content-type") ?? "")) {
    return fail(415, "unsupported_media_type");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const retryAfter = rateLimit(ip);
  if (retryAfter !== null) return fail(429, "rate_limited", undefined, { "Retry-After": String(retryAfter) });

  const raw = await readCapped(req, MAX_BODY_BYTES);
  if (raw === null) return fail(413, "payload_too_large");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, "invalid_json");
  }

  const parsed = CreateBuildSchema.safeParse(json);
  if (!parsed.success) return fail(400, "invalid_build", { issues: z.flattenError(parsed.error) });

  try {
    return Response.json(await createBuild(parsed.data), { status: 201 });
  } catch (err) {
    if (err instanceof BackendNotConfiguredError) return fail(503, "backend_not_configured");
    if (err instanceof InsertCapError) return fail(429, "rate_limited", undefined, { "Retry-After": "600" });
    console.error("[POST /api/builds]", err);
    return fail(500, "internal_error");
  }
}
