import { getBuild, isValidSlug } from "@/lib/builds";
import { BackendNotConfiguredError } from "@/lib/supabase/server";

const notFound = () =>
  Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return notFound();
  try {
    const build = await getBuild(slug);
    if (!build) return notFound();
    // Builds are never updated, so a slug's response never changes.
    return Response.json(build, { headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch (err) {
    if (err instanceof BackendNotConfiguredError) {
      return Response.json({ error: "backend_not_configured" }, { status: 503 });
    }
    console.error("[GET /api/builds/[slug]]", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
