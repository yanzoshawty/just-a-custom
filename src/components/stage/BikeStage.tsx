"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { BuildConfig } from "@/lib/build-schema";
import { describeBuild, type GroupId } from "@/lib/catalog";
import { CenterMark } from "@/components/site/Symbols";
import { CanvasFailed, CanvasLoading, GLBoundary, useWebGL } from "@/three/shell";
import { useMedia, useReducedMotion } from "@/three/tokens";
import type { Preset, ViewerApi } from "@/three/Viewer";

const Viewer = dynamic(() => import("@/three/Viewer"), { ssr: false });

const PRESET_LABELS: { id: Preset; label: string }[] = [
  { id: "samping", label: "Samping" },
  { id: "34", label: "3/4" },
  { id: "depan", label: "Depan" },
  { id: "atas", label: "Atas" },
];

type Props = {
  config: BuildConfig;
  exploded: boolean;
  onExploded: (v: boolean) => void;
  painted: boolean;
  onPainted: (v: boolean) => void;
  highlight: GroupId | null;
  failTail: string;
  /** Top-left overlay (garage title block). */
  overlay?: ReactNode;
  className?: string;
};

export function BikeStage({ config, exploded, onExploded, painted, onPainted, highlight, failTail, overlay, className = "" }: Props) {
  const api = useRef<ViewerApi | null>(null);
  const webgl = useWebGL();
  const reduce = useReducedMotion();
  const narrow = !useMedia("(min-width: 768px)", true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const hintId = useId();
  const broken = webgl === false || failed;

  // UX-SPEC 7.2 canvas keys; only handled keys are prevented.
  function onKey(e: KeyboardEvent) {
    const a = api.current;
    if (!a || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    const map: Record<string, () => void> = {
      ArrowLeft: () => a.orbit(-Math.PI / 12, 0),
      ArrowRight: () => a.orbit(Math.PI / 12, 0),
      ArrowUp: () => a.orbit(0, -Math.PI / 18),
      ArrowDown: () => a.orbit(0, Math.PI / 18),
      "+": () => a.zoom(0.88),
      "=": () => a.zoom(0.88),
      "-": () => a.zoom(1.14),
      "1": () => a.preset("samping"),
      "2": () => a.preset("34"),
      "3": () => a.preset("depan"),
      "4": () => a.preset("atas"),
      "0": () => a.reset(),
      e: () => onExploded(!exploded),
      E: () => onExploded(!exploded),
    };
    if (map[k]) {
      e.preventDefault();
      map[k]();
    }
  }

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      {overlay}
      <Toolbar
        exploded={exploded}
        onExploded={onExploded}
        painted={painted}
        onPainted={onPainted}
        onPreset={(p) => api.current?.preset(p)}
        onReset={() => api.current?.reset()}
        disabled={broken}
      />
      <div
        role="img"
        aria-label={describeBuild(config, exploded, painted)}
        aria-describedby={hintId}
        tabIndex={broken ? -1 : 0}
        onKeyDown={onKey}
        className="absolute inset-0 -z-10 focus-visible:outline-offset-[-4px]"
      >
        {!broken && webgl && (
          <GLBoundary onError={() => setFailed(true)}>
            <Viewer
              config={config}
              exploded={exploded}
              mode={painted ? "painted" : "blueprint"}
              highlight={highlight}
              activeOnly={narrow}
              reduceMotion={reduce}
              apiRef={api}
              onReady={() => setReady(true)}
              onLost={() => setFailed(true)}
            />
          </GLBoundary>
        )}
      </div>
      <span id={hintId} className="sr-only">
        Panah untuk memutar, plus dan minus untuk zoom, angka 1 sampai 4 untuk sudut pandang.
      </span>
      {broken ? <CanvasFailed tail={failTail} /> : !ready && <CanvasLoading />}
    </div>
  );
}

function Toolbar({
  exploded,
  onExploded,
  painted,
  onPainted,
  onPreset,
  onReset,
  disabled,
}: {
  exploded: boolean;
  onExploded: (v: boolean) => void;
  painted: boolean;
  onPainted: (v: boolean) => void;
  onPreset: (p: Preset) => void;
  onReset: () => void;
  disabled: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex flex-wrap items-end gap-2 sm:inset-x-4 sm:bottom-4 [&>*]:pointer-events-auto">
      <div className="flex border border-ink bg-paper-raised" role="group" aria-label="Tampilan">
        <button type="button" className="btn-tool border-0" aria-pressed={!exploded} onClick={() => onExploded(false)}>
          Utuh
        </button>
        <button type="button" className="btn-tool border-0" aria-pressed={exploded} onClick={() => onExploded(true)}>
          Bongkar
        </button>
      </div>
      <div className="flex border border-ink bg-paper-raised" role="group" aria-label="Mode gambar">
        <button type="button" className="btn-tool border-0" aria-pressed={!painted} onClick={() => onPainted(false)}>
          Garis
        </button>
        <button type="button" className="btn-tool border-0" aria-pressed={painted} onClick={() => onPainted(true)}>
          Cat
        </button>
      </div>
      {!disabled && (
        <>
          <div className="hidden gap-1 border border-ink bg-paper-raised sm:flex" role="group" aria-label="Sudut pandang">
            {PRESET_LABELS.map((p) => (
              <button key={p.id} type="button" className="btn-tool border-0" onClick={() => onPreset(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-tool hidden border-ink sm:inline-flex" onClick={onReset}>
            <CenterMark className="size-4" />
            Reset kamera
          </button>
          <CameraMenu onPreset={onPreset} onReset={onReset} />
        </>
      )}
    </div>
  );
}

/** Mobile camera menu (UX-SPEC 4.4, 7.1). */
function CameraMenu({ onPreset, onReset }: { onPreset: (p: Preset) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const away = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };
  const choose = (fn: () => void) => {
    fn();
    close();
  };
  function onMenuKey(e: KeyboardEvent) {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[n]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      items[e.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (e.key === "Tab") setOpen(false);
  }

  return (
    <div className="relative sm:hidden">
      <button
        ref={btn}
        type="button"
        className="btn-tool border-ink"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        Kamera
      </button>
      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label="Kamera"
          onKeyDown={onMenuKey}
          className="absolute bottom-full left-0 mb-2 flex w-44 flex-col border-2 border-ink bg-paper-raised"
        >
          {PRESET_LABELS.map((p) => (
            <button key={p.id} type="button" role="menuitem" tabIndex={-1} className="min-h-11 px-3 text-left hover:bg-paper-sunk" onClick={() => choose(() => onPreset(p.id))}>
              {p.label}
            </button>
          ))}
          <button type="button" role="menuitem" tabIndex={-1} className="flex min-h-11 items-center gap-2 border-t border-ink px-3 text-left hover:bg-paper-sunk" onClick={() => choose(onReset)}>
            <CenterMark className="size-4" />
            Reset kamera
          </button>
        </div>
      )}
    </div>
  );
}
