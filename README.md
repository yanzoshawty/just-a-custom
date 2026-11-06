This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backend setup

Saving and sharing builds uses Supabase (Postgres). Without it the configurator still works; save/share returns 503 `backend_not_configured`.

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration `supabase/migrations/0001_builds.sql`, either:
   - paste it into Dashboard > SQL Editor and run it, or
   - with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.
3. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Dashboard > Project Settings > API). Set the same two variables in your host (e.g. Vercel) for deploys. Never expose the service role key with a `NEXT_PUBLIC_` prefix.
4. `npm test` runs the schema self-checks.

API:

- `POST /api/builds` with `Content-Type: application/json`, body `{ name, builder?, config }` (max 8 KB) returns `201` with the saved build. Errors: `400 invalid_json | invalid_build` (with `issues`), `413`, `415`, `429` (10/min per IP), `503`, `500`.
- `GET /api/builds/<slug>` returns `200` with the saved build (cached as immutable), or `404 not_found`, `503`, `500`.

The `builds` table has RLS on and no policies: only the server (service role) reads and writes it.
