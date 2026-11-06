import "server-only";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { BuildConfigSchema, type CreateBuild, type SavedBuild } from "@/lib/build-schema";
import { getSupabase } from "@/lib/supabase/server";

// Keep in sync with the slug check in supabase/migrations/0001_builds.sql
const SLUG_RE = /^[0-9a-z]{10}$/;
const newSlug = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

const COLUMNS = "slug, name, builder, config, created_at";

// The DB is untrusted on read too: re-validate every row before handing it out.
const RowSchema = z.object({
  slug: z.string().regex(SLUG_RE),
  name: z.string(),
  builder: z.string().nullable(),
  config: BuildConfigSchema,
  created_at: z.string(),
});

export const isValidSlug = (slug: string) => SLUG_RE.test(slug);

/** The global hourly insert cap in 0002_builds_insert_cap.sql was hit. */
export class InsertCapError extends Error {}

/** Input must already be parsed with CreateBuildSchema. Throws on DB failure or missing env. */
export async function createBuild(input: CreateBuild): Promise<SavedBuild> {
  const db = getSupabase();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db
      .from("builds")
      .insert({ slug: newSlug(), name: input.name, builder: input.builder || null, config: input.config })
      .select(COLUMNS)
      .single();
    if (!error) return RowSchema.parse(data);
    if (error.code === "P0001") throw new InsertCapError("builds insert cap reached");
    // 23505 = unique_violation (slug collision): retry with a fresh slug
    if (error.code !== "23505") throw new Error(`createBuild failed: ${error.code} ${error.message}`);
  }
  throw new Error("createBuild failed: slug collided 3 times");
}

/**
 * Safe to call from server components. Returns null for malformed or unknown slugs.
 * Throws BackendNotConfiguredError when env is missing, Error on DB/validation failure.
 */
export async function getBuild(slug: string): Promise<SavedBuild | null> {
  if (!isValidSlug(slug)) return null;
  const { data, error } = await getSupabase().from("builds").select(COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getBuild failed: ${error.code} ${error.message}`);
  return data ? RowSchema.parse(data) : null;
}
