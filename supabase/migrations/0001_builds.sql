-- Saved motorcycle builds, shared by link (/b/<slug>).
--
-- Access model: RLS is enabled with NO policies for anon/authenticated, and table
-- grants are revoked from those roles, so the anon key cannot read or write this
-- table at all. Only the Next.js server talks to it, using the service role key
-- (server-only env var, bypasses RLS), and only after validating input with zod.
-- Reason: there are no accounts, so any client-side policy would have to be
-- "anyone can insert / anyone can select all rows", which allows unvalidated writes
-- and bulk enumeration of every build. Going through the server keeps one
-- validation path, allows rate limiting, and only exposes lookup by unguessable slug.

create table public.builds (
  id         uuid primary key default gen_random_uuid(),
  -- must match SLUG_RE in src/lib/builds.ts
  slug       text not null unique check (slug ~ '^[0-9a-z]{10}$'),
  name       text not null check (char_length(name) between 1 and 60),
  builder    text check (builder is null or char_length(builder) between 1 and 40),
  config     jsonb not null check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 4096),
  created_at timestamptz not null default now()
);

-- The unique constraint on slug already creates the btree index used for lookups.
-- There is no listing/gallery query, so no other index is needed.

alter table public.builds enable row level security;

revoke all on table public.builds from anon, authenticated;
