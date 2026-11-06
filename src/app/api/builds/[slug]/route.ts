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
    // Builds are never edited, but can be deleted (takedown), so caches must expire (audit-001 #5).
    return Response.json(build, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (err) {
    const noStore = { "Cache-Control": "no-store" };
    if (err instanceof BackendNotConfiguredError) {
      return Response.json({ error: "backend_not_configured" }, { status: 503, headers: noStore });
    }
    console.error("[GET /api/builds/[slug]]", err);
    return Response.json({ error: "internal_error" }, { status: 500, headers: noStore });
  }
}
