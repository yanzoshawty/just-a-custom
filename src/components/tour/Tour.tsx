"use client";

// /garage guided tour (UX-SPEC 4.7). Non-modal: the page stays usable, nothing is trapped.
// Targets are stable data-tour attributes, never class names.
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { REDUCE_QUERY } from "@/three/tokens";

export const TOUR_KEY = "jac:tour:v1";

type Step = { targets: string[]; title: string; body: string };

// First visible match wins, so one step can point at the phone and the desktop control.
export const STEPS: Step[] = [
  {
    targets: ["style", "parts"],
    title: "Mulai dari aliran.",
    body: "Pilih aliran di sini. Satu set part awal langsung terpasang, dan masih bisa dibatalkan dari notifikasi yang muncul.",
  },
  {
    targets: ["parts"],
    title: "Ganti part satu per satu.",
    body: "Tiap grup dari rangka sampai mesin punya pilihannya sendiri. Part yang lagi kamu atur ditandai warna meni di gambar.",
  },
  {
    targets: ["paint"],
    title: "Cat tangki, rangka, dan aksen.",
    body: "Warna dan finish ada di bagian Cat. Begitu kamu pilih warna, gambarnya pindah ke mode Cat.",
  },
  {
    targets: ["explode"],
    title: "Utuh atau dibongkar.",
    body: "Bongkar memisahkan tiap part lengkap dengan garis rakitnya, jadi kelihatan apa nempel di mana.",
  },
  {
    targets: ["render"],
    title: "Garis atau Cat.",
    body: "Garis menampilkan gambar teknik. Cat menampilkan warna dan finish pilihanmu.",
  },
  {
    targets: ["camera"],
    title: "Ganti sudut pandang.",
    body: "Pilih Samping, 3/4, Depan, atau Atas. Gambarnya juga bisa digeser buat diputar.",
  },
  {
    targets: ["save"],
    title: "Simpan, lalu kirim link-nya.",
    body: "Kasih nama build-mu, lalu salin link-nya buat bengkel langganan atau grup tongkrongan.",
  },
];

export function tourDone() {
  try {
    return localStorage.getItem(TOUR_KEY) === "done";
  } catch {
    return false; // storage blocked: offer the tour, it can still be skipped
  }
}
function markDone() {
  try {
    localStorage.setItem(TOUR_KEY, "done");
  } catch {
    // storage blocked: the tour may show again next visit, which is harmless
  }
}

function findTarget(names: string[]) {
  for (const n of names)
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${n}"]`)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  return null;
}

const GAP = 14;
const EDGE = 16;
const PAD = 6;

type Props = { open: boolean; onClose: () => void };

export function Tour({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const leader = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const id = useId();
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const close = () => {
    markDone();
    setStep(0);
    onClose();
  };
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  // Activity hides this page on navigation: a half-open tour is transient UI, so drop it.
  useLayoutEffect(() => () => setStep(0), []);

  useEffect(() => {
    if (!open) return;
    card.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      // a native dialog on top (save) owns Escape
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Bring the target into view, then let the frame and plate glide to it (M23).
  useEffect(() => {
    if (!open) return;
    const el = findTarget(s.targets);
    const reduce = matchMedia(REDUCE_QUERY).matches;
    el?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    const glide = [card.current, frame.current];
    glide.forEach((g) => g?.classList.add("tour-glide"));
    const path = leader.current;
    if (path && !reduce) {
      path.style.transition = "none";
      path.style.strokeDashoffset = "1";
    }
    const t = setTimeout(() => {
      glide.forEach((g) => g?.classList.remove("tour-glide"));
      if (path) {
        path.style.transition = reduce ? "none" : "stroke-dashoffset 260ms cubic-bezier(0.16, 1, 0.3, 1)";
        path.style.strokeDashoffset = "0";
      }
    }, reduce ? 0 : 400);
    return () => clearTimeout(t);
  }, [open, step, s.targets]);

  // Follow the target every frame (sticky canvas, rail scroll, layout shifts). Writes styles only, no React state.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let lastKey = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const c = card.current;
      const f = frame.current;
      const el = findTarget(s.targets);
      if (!c || !f) return;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const cw = Math.min(380, vw - EDGE * 2);
      const ch = c.offsetHeight;
      let fx = vw / 2, fy = vh / 2, fw = 0, fh = 0;
      if (el) {
        const r = el.getBoundingClientRect();
        // clip to the viewport so a tall panel still gets a visible frame
        const top = Math.max(r.top - PAD, 4);
        const bottom = Math.min(r.bottom + PAD, vh - 4);
        fx = Math.max(r.left - PAD, 4);
        fw = Math.min(r.right + PAD, vw - 4) - fx;
        fy = top;
        fh = Math.max(0, bottom - top);
      }
      const below = vh - (fy + fh);
      const side = !el ? "dock" : below >= ch + GAP + EDGE ? "below" : fy >= ch + GAP + EDGE ? "above" : "dock";
      const cy = side === "below" ? fy + fh + GAP : side === "above" ? fy - GAP - ch : vh - ch - EDGE;
      const cx = Math.min(Math.max(fx, EDGE), vw - cw - EDGE);
      const key = `${fx|0},${fy|0},${fw|0},${fh|0},${cx|0},${cy|0},${cw},${side}`;
      if (key === lastKey) return;
      lastKey = key;
      c.style.width = `${cw}px`;
      c.style.transform = `translate(${cx}px, ${cy}px)`;
      f.style.display = el ? "block" : "none";
      f.style.transform = `translate(${fx}px, ${fy}px)`;
      f.style.width = `${fw}px`;
      f.style.height = `${fh}px`;
      // leader line: dot on the frame edge, line to the plate (drafting leader, DESIGN 7.6)
      const p = leader.current;
      const d = dot.current;
      if (p && d) {
        const show = el && side !== "dock";
        p.style.display = d.style.display = show ? "" : "none";
        if (show) {
          const x = Math.min(Math.max(cx + 28, fx + 8), fx + fw - 8);
          const y0 = side === "below" ? fy + fh : fy;
          const y1 = side === "below" ? cy : cy + ch;
          p.setAttribute("d", `M${x} ${y0}V${y1}`);
          d.setAttribute("cx", String(x));
          d.setAttribute("cy", String(y0));
        }
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [open, s.targets]);

  if (!open) return null;
  return (
    <>
      <div ref={frame} aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-30 border-2 border-ink" style={{ outline: "2px solid var(--paper)", outlineOffset: 0 }} />
      <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 h-full w-full text-ink">
        <path ref={leader} stroke="currentColor" strokeWidth="1.5" fill="none" pathLength={1} strokeDasharray="1" />
        <circle ref={dot} r="4" fill="currentColor" />
      </svg>
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-b`}
        tabIndex={-1}
        className="plate-thick fixed top-0 left-0 z-30 p-4 shadow-[4px_4px_0_0_var(--ink)] focus-visible:outline-offset-4"
        style={{ width: "min(380px, calc(100vw - 32px))" }}
      >
        <div aria-live="polite">
          <p className="t-label text-ink-muted">
            <span aria-hidden="true">Panduan {step + 1}/{STEPS.length}</span>
            <span className="sr-only">Panduan, langkah {step + 1} dari {STEPS.length}</span>
          </p>
          <h2 id={`${id}-t`} className="t-h3 mt-1">
            {s.title}
          </h2>
          <p id={`${id}-b`} className="mt-2">
            {s.body}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {!last && (
            <button type="button" className="link mr-auto min-h-11 px-1 font-medium" onClick={close}>
              Lewati panduan
            </button>
          )}
          {step > 0 && (
            <button type="button" className="btn-tool border-ink" onClick={() => setStep(step - 1)}>
              Kembali
            </button>
          )}
          <button type="button" className="btn-ink" onClick={() => (last ? close() : setStep(step + 1))}>
            {last ? "Selesai" : "Lanjut"}
          </button>
        </div>
      </div>
    </>
  );
}
