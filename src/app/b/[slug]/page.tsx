import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { z } from "zod";
import type { SavedBuild } from "@/lib/build-schema";
import { getBuild } from "@/lib/builds";
import { BackendNotConfiguredError } from "@/lib/supabase/server";
import { FINISH_NAMES, STYLE_NAMES, specRows, swatchName } from "@/lib/catalog";
import { BuildViewer } from "@/components/build/BuildViewer";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SheetMessage } from "@/components/site/SheetMessage";
import { DeltaSymbol } from "@/components/site/Symbols";
import { CopyLink } from "@/components/ui/CopyLink";
import { DraftLoader } from "@/components/transition/DraftLoader";

type Loaded = { kind: "ok"; build: SavedBuild } | { kind: "missing" } | { kind: "backend" } | { kind: "corrupt" };

// One DB read shared by generateMetadata and the page. getBuild throws when Supabase env is missing.
const load = cache(async (slug: string): Promise<Loaded> => {
  try {
    const build = await getBuild(slug);
    return build ? { kind: "ok", build } : { kind: "missing" };
  } catch (err) {
    if (err instanceof BackendNotConfiguredError) return { kind: "backend" };
    if (err instanceof z.ZodError) {
      console.error(`[/b/${slug}] stored build failed schema`, err.issues);
      return { kind: "corrupt" };
    }
    throw err; // error.tsx (UX-SPEC 6.9)
  }
});

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = await load(slug).catch(() => null);
  if (r?.kind !== "ok") return { title: "Build | Just a custom", robots: { index: false } };
  const { name, builder, config } = r.build;
  const style = STYLE_NAMES[config.style];
  return {
    title: `${name} | Just a custom`,
    description: builder ? `Build ${style} oleh ${builder}` : `Build ${style}`,
    // Builds are shared by link, not published: keep user-written titles out of search (audit-001 #5).
    robots: { index: false },
  };
}

export default function BuildPage({ params }: PageProps<"/b/[slug]">) {
  return (
    <>
      <Header page="build" skipLabel="Langsung ke isi" skipTarget="isi" />
      <main id="isi" tabIndex={-1} className="flex-1">
        {/* the stage's own loader resumes this drawing once the build arrives */}
        <Suspense fallback={<DraftLoader done={false} title="Build kiriman" />}>
          <BuildContent params={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function BuildContent({ params }: { params: PageProps<"/b/[slug]">["params"] }) {
  const { slug } = await params;
  const r = await load(slug);
  if (r.kind === "missing") notFound();
  // shortcut: rendered with the streamed 200 status (Next cannot set 503 after streaming starts); noindex via metadata
  if (r.kind === "backend")
    return <SheetMessage title="Halaman build belum bisa dibuka karena penyimpanan di server ini belum disambungkan." />;
  if (r.kind === "corrupt") return <SheetMessage title="Data build ini rusak, jadi nggak bisa digambar." />;
  return <BuildSheet build={r.build} />;
}

const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });

function BuildSheet({ build }: { build: SavedBuild }) {
  const { config } = build;
  // data-driven from catalog GROUPS (plus the base row), so new categories need no page edit
  const rows = specRows(config);
  const paints = [
    { part: "Tangki", hex: config.paint.tank },
    { part: "Rangka", hex: config.paint.frame },
    { part: "Aksen", hex: config.paint.accent },
  ];
  const th = "t-label border-b border-ink px-3 py-2 text-left font-medium text-ink-muted";
  const td = "px-3 py-2 align-top";

  return (
    <div className="mx-auto grid max-w-[1320px] gap-8 px-gutter py-6 lg:grid-cols-12 lg:py-10">
      <div className="lg:col-span-7">
        <BuildViewer config={config} name={build.name} />
      </div>
      <div className="flex flex-col gap-8 lg:col-span-5">
        <div className="grid grid-cols-2 border-2 border-ink bg-paper-raised">
          <div className="col-span-2 border-b border-ink p-4">
            <div className="t-label text-ink-muted">Judul</div>
            <h1 className="t-h2 mt-1 break-words">{build.name}</h1>
          </div>
          <Field label="Dirakit oleh" className="border-r border-b">
            {build.builder || "Tanpa nama"}
          </Field>
          <Field label="Gaya" className="border-b">
            {STYLE_NAMES[config.style]}
          </Field>
          <Field label="Tanggal" className="border-r">
            {dateFmt.format(new Date(build.created_at))}
          </Field>
          <Field label="Revisi">
            <DeltaSymbol className="size-5" />
            <span className="sr-only">revisi</span>
          </Field>
        </div>

        <table className="w-full border border-ink bg-paper-raised">
          <caption className="t-h3 mb-3 text-left">Daftar part</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>No.</th>
              <th scope="col" className={`${th} border-l`}>Part</th>
              <th scope="col" className={`${th} border-l`}>Pilihan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.part}>
                <td className={`${td} t-data whitespace-nowrap`}>{r.no}</td>
                <td className={`${td} border-l border-ink`}>{r.part}</td>
                <td className={`${td} border-l border-ink font-medium`}>{r.choice}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="w-full border border-ink bg-paper-raised">
          <caption className="t-h3 mb-3 text-left">Cat</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Bagian</th>
              <th scope="col" className={`${th} border-l`}>Warna</th>
            </tr>
          </thead>
          <tbody>
            {paints.map((p) => (
              <tr key={p.part}>
                <td className={td}>{p.part}</td>
                <td className={`${td} border-l border-ink`}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span aria-hidden="true" className="inline-block size-6 shrink-0 border border-line-strong" style={{ background: p.hex }} />
                    <span className="font-medium">{swatchName(p.hex)}</span>
                    <span className="t-data text-ink-muted">{p.hex.toUpperCase()}</span>
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <td className={td}>Finish</td>
              <td className={`${td} border-l border-ink font-medium`}>{FINISH_NAMES[config.paint.finish]}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex flex-wrap items-start gap-3">
          <CopyLink url={`/b/${build.slug}`} />
          <Link href={`/garage?from=${build.slug}`} className="btn-secondary">
            Rakit versi saya
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 border-ink p-4 ${className}`}>
      <div className="t-label text-ink-muted">{label}</div>
      <div className="mt-1 font-semibold break-words">{children}</div>
    </div>
  );
}
