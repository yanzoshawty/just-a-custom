"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { BuildConfigSchema, DEFAULT_BUILD, type BuildConfig, type PartKey, type SavedBuild } from "@/lib/build-schema";
import { PRESETS, STYLE_NAMES, STYLES, type Finish, type GroupId, type Style } from "@/lib/catalog";
import { Header } from "@/components/site/Header";
import { DeltaSymbol } from "@/components/site/Symbols";
import { BikeStage } from "@/components/stage/BikeStage";
import { PaintPanel, PartsPanel } from "./Rail";
import { SaveDialog } from "./SaveDialog";

const DRAFT_KEY = "jac:draft:v1";
const SLUG_RE = /^[0-9a-z]{10}$/;

function readDraft(): BuildConfig | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const r = BuildConfigSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : null; // invalid drafts are discarded silently
  } catch {
    return null;
  }
}

type Banner = null | "notfound" | "error";

export function GarageApp() {
  const router = useRouter();
  const [config, setConfig] = useState<BuildConfig>(DEFAULT_BUILD);
  const [resolved, setResolved] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [exploded, setExploded] = useState(false);
  const [painted, setPainted] = useState(false);
  const [active, setActive] = useState<GroupId | null>(null);
  const [open, setOpen] = useState<GroupId>("frame");
  const [tab, setTab] = useState<"part" | "cat">("part");
  const [toast, setToast] = useState<{ style: Style; prev: BuildConfig } | null>(null);
  const [lastName, setLastName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const saveBtn = useRef<HTMLButtonElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);

  // UX-SPEC 4.1: ?from=<slug>, then ?style=, then the draft, then DEFAULT_BUILD.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const from = q.get("from");
    const style = q.get("style") as Style | null;
    const fallback = () => readDraft() ?? DEFAULT_BUILD;
    const done = (c: BuildConfig, b: Banner = null) => {
      setConfig(c);
      setBanner(b);
      setResolved(true);
      if (q.size) router.replace("/garage");
    };
    if (from) {
      if (!SLUG_RE.test(from)) return done(fallback(), "notfound");
      fetch(`/api/builds/${from}`, { signal: AbortSignal.timeout(15000) })
        .then(async (res) => {
          if (res.status === 404) return done(fallback(), "notfound");
          if (!res.ok) return done(fallback(), "error");
          const r = BuildConfigSchema.safeParse(((await res.json()) as SavedBuild).config);
          done(r.success ? r.data : fallback(), r.success ? null : "error");
        })
        .catch(() => done(fallback(), "error"));
      return;
    }
    if (style && STYLES.includes(style)) return done({ ...DEFAULT_BUILD, style, parts: { ...PRESETS[style] } });
    done(fallback());
  }, [router]);

  // Autosave the draft (debounced 300ms) so a refresh never loses a build.
  useEffect(() => {
    if (!resolved) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
      } catch {
        // storage full or blocked: the build stays in memory for this session
      }
    }, 300);
    return () => clearTimeout(t);
  }, [config, resolved]);

  const applyStyle = (style: Style) => {
    if (style === config.style) return;
    setToast({ style, prev: config });
    setConfig({ ...config, style, parts: { ...PRESETS[style] } });
  };
  const setPart = (k: PartKey, v: string) => setConfig((c) => ({ ...c, parts: { ...c.parts, [k]: v } }));
  const setPaint = (k: "tank" | "frame" | "accent", hex: string) => {
    setConfig((c) => ({ ...c, paint: { ...c.paint, [k]: hex } }));
    setPainted(true); // paint is invisible in line mode
  };
  const setFinish = (f: Finish) => {
    setConfig((c) => ({ ...c, paint: { ...c.paint, finish: f } }));
    setPainted(true);
  };

  const clearActive = () => {
    if (!hovering.current && !rail.current?.contains(document.activeElement)) setActive(null);
  };

  const tabId = useId();
  const tabs = [
    { id: "part", label: "Part" },
    { id: "cat", label: "Cat" },
  ] as const;
  function onTabKey(e: KeyboardEvent) {
    const order = ["part", "cat"] as const;
    const i = order.indexOf(tab);
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") n = (i + 1) % 2;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = 1;
    if (n < 0) return;
    e.preventDefault();
    setTab(order[n]);
    document.getElementById(`${tabId}-${order[n]}`)?.focus();
  }

  return (
    <>
      <Header
        page="garage"
        skipLabel="Langsung ke konfigurator"
        skipTarget="konfigurator"
        action={
          <button ref={saveBtn} type="button" className="btn-primary min-h-11 px-3 sm:px-5" onClick={() => setSaveOpen(true)}>
            <span className="sm:hidden">Simpan</span>
            <span className="hidden sm:inline">Simpan &amp; bagikan</span>
          </button>
        }
      />
      <main id="konfigurator" tabIndex={-1} className="flex-1 lg:grid lg:grid-cols-[minmax(600px,1fr)_400px] min-[1440px]:grid-cols-[minmax(600px,1fr)_440px]">
        <h1 className="sr-only">Garasi: konfigurator motor custom</h1>
        <BikeStage
          className="grid-paper sticky top-14 z-10 h-[45dvh] min-h-[280px] border-b border-ink sm:h-[52dvh] md:top-16 lg:relative lg:top-0 lg:h-[calc(100dvh-64px)] lg:border-b-0"
          config={config}
          exploded={exploded}
          onExploded={setExploded}
          painted={painted}
          onPainted={setPainted}
          highlight={active}
          failTail="Pilihan part dan cat tetap bisa diatur dan disimpan."
          overlay={<CanvasTitle config={config} name={lastName} />}
        />

        <div
          ref={rail}
          onPointerEnter={() => (hovering.current = true)}
          onPointerLeave={() => {
            hovering.current = false;
            clearActive();
          }}
          onBlur={(e) => {
            if (!rail.current?.contains(e.relatedTarget as Node)) clearActive();
          }}
          className="garage-rail bg-paper-sunk lg:h-[calc(100dvh-64px)] lg:overflow-y-auto lg:border-l lg:border-ink"
        >
          {banner && <BannerPlate kind={banner} onClose={() => setBanner(null)} />}
          {/* tabs on phone and desktop; tablet shows both columns side by side */}
          <div role="tablist" aria-label="Kontrol" className="flex border-b border-ink sm:max-lg:hidden" onKeyDown={onTabKey}>
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`${tabId}-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`${tabId}-${t.id}-panel`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`min-h-12 flex-1 font-semibold ${tab === t.id ? "bg-ink text-paper" : "bg-paper-sunk text-ink hover:bg-paper"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-4 sm:grid sm:grid-cols-2 sm:gap-8 sm:p-6 lg:block">
            <div
              id={`${tabId}-part-panel`}
              role="tabpanel"
              aria-labelledby={`${tabId}-part`}
              className={tab === "part" ? "" : "max-sm:hidden lg:hidden"}
            >
              <PartsPanel
                config={config}
                onStyle={applyStyle}
                onPart={setPart}
                onActive={setActive}
                open={open}
                onOpen={setOpen}
              />
            </div>
            <div
              id={`${tabId}-cat-panel`}
              role="tabpanel"
              aria-labelledby={`${tabId}-cat`}
              className={tab === "cat" ? "" : "max-sm:hidden lg:hidden"}
            >
              <PaintPanel paint={config.paint} onPaint={setPaint} onFinish={setFinish} />
            </div>
          </div>
        </div>
      </main>

      {toast && (
        <UndoToast
          key={toast.style + toast.prev.style}
          text={`Preset ${STYLE_NAMES[toast.style]} dipasang.`}
          onUndo={() => {
            setConfig((c) => ({ ...c, style: toast.prev.style, parts: toast.prev.parts }));
            setToast(null);
          }}
          onDone={() => setToast(null)}
        />
      )}

      <SaveDialog
        open={saveOpen}
        onClose={() => {
          setSaveOpen(false);
          saveBtn.current?.focus();
        }}
        config={config}
        initialName={lastName}
        onSaved={setLastName}
      />
    </>
  );
}

function CanvasTitle({ config, name }: { config: BuildConfig; name: string }) {
  return (
    <div className="absolute top-4 left-4 z-10 hidden grid-cols-[auto_auto] border-2 border-ink bg-paper-raised sm:grid">
      <div className="border-r border-b border-ink px-3 py-2">
        <div className="t-label text-ink-muted">Gaya</div>
        <div className="font-semibold">{STYLE_NAMES[config.style]}</div>
      </div>
      <div className="border-b border-ink px-3 py-2">
        <div className="t-label text-ink-muted">Revisi</div>
        <DeltaSymbol className="mt-0.5 size-5" />
        <span className="sr-only">revisi</span>
      </div>
      <div className="col-span-2 max-w-64 px-3 py-2">
        <div className="t-label text-ink-muted">Judul</div>
        <div className="truncate font-semibold">{name || "Belum diberi nama"}</div>
      </div>
    </div>
  );
}

function BannerPlate({ kind, onClose }: { kind: "notfound" | "error"; onClose: () => void }) {
  return (
    <div role="status" className="m-4 flex flex-wrap items-center gap-3 border-2 border-ink bg-paper-raised p-3 sm:mx-6">
      <p className="min-w-0 flex-1 basis-56">
        {kind === "notfound"
          ? "Build dari link itu nggak ketemu. Kamu mulai dari draft terakhir."
          : "Build belum bisa dimuat. Coba muat ulang halaman ini."}
      </p>
      {kind === "error" && (
        <button type="button" className="btn-secondary min-h-11" onClick={() => location.reload()}>
          Muat ulang
        </button>
      )}
      <button type="button" className="btn-tool" onClick={onClose}>
        Tutup
      </button>
    </div>
  );
}

/** UX-SPEC 4.2 undo toast: 8s, pauses while hovered or focused, never steals focus. */
function UndoToast({ text, onUndo, onDone }: { text: string; onUndo: () => void; onDone: () => void }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(8000);
  const started = useRef(0);
  useEffect(() => {
    if (paused) return;
    started.current = performance.now();
    const t = setTimeout(onDone, left.current);
    return () => {
      clearTimeout(t);
      left.current -= performance.now() - started.current;
    };
  }, [paused, onDone]);
  return (
    <div
      role="status"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between gap-4 border-2 border-ink bg-paper-raised p-3 sm:right-auto sm:left-1/2 sm:w-[28rem] sm:-translate-x-1/2 lg:left-[calc(50%-200px)]"
    >
      <span>{text}</span>
      <button type="button" className="btn-secondary min-h-11" onClick={onUndo}>
        Batalkan
      </button>
    </div>
  );
}
