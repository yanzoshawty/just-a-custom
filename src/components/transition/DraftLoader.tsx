"use client";

// L1 to L4 (DESIGN 8): the drafting sequence shown while a /garage or /b/[slug] canvas starts.
// It ends on the real canvas signal (`done`), never on a timer; MIN_MS only stops a flash.
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DeltaSymbol } from "@/components/site/Symbols";
import { REDUCE_QUERY } from "@/three/tokens";

gsap.registerPlugin(useGSAP);

const MIN_MS = 900;
// One drawing across the /b Suspense fallback and the BikeStage that replaces it: the second
// instance resumes the first one's timeline instead of starting the sheet over.
const clock: { epoch: number | null } = { epoch: null };

type Props = {
  /** true once the canvas is ready or has failed (WebGL off / context lost) */
  done: boolean;
  /** JUDUL cell of the title block */
  title: string;
  /** after the overlay is gone (finished or skipped) */
  onGone?: () => void;
};

export function DraftLoader({ done, title, onGone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [ending, setEnding] = useState<null | "done" | "skip">(null);
  const [gone, setGone] = useState(false);
  const skip = () => setEnding((e) => e ?? "skip");

  // L1, L2: sheet, wheels, body, dimensions, leaders, title block.
  useGSAP(
    () => {
      const now = performance.now();
      if (clock.epoch === null || now - clock.epoch > 5000) clock.epoch = now;
      const elapsed = (now - clock.epoch) / 1000;
      const mm = gsap.matchMedia();
      mm.add({ reduce: REDUCE_QUERY, full: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (ctx.conditions?.reduce) {
          tl.current = gsap.timeline().set(".dl-stroke", { strokeDashoffset: 0 }).set(".dl-fade", { opacity: 1 });
          return;
        }
        const t = gsap.timeline({ defaults: { ease: "power2.out" } });
        t.addLabel("sheet")
          .to(".dl-sheet", { strokeDashoffset: 0, duration: 0.5, ease: "power1.inOut" }, "sheet")
          .to(".dl-ground", { strokeDashoffset: 0, duration: 0.5 }, "sheet+=0.15")
          .to(".dl-wheel", { strokeDashoffset: 0, duration: 0.55, stagger: 0.12 }, "sheet+=0.3")
          .to(".dl-body", { strokeDashoffset: 0, duration: 0.45, stagger: 0.07 }, "sheet+=0.55")
          .to(".dl-center", { opacity: 1, duration: 0.3 }, ">-0.2")
          .to(".dl-dim", { strokeDashoffset: 0, duration: 0.4, stagger: 0.06 }, "<")
          .to(".dl-head", { opacity: 1, duration: 0.15 }, ">-0.1")
          .to(".dl-leader", { strokeDashoffset: 0, duration: 0.3, stagger: 0.08 }, "<")
          .to(".dl-fade", { opacity: 1, duration: 0.25, stagger: 0.06 }, "<+0.1")
          .fromTo(".dl-cell", { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: "power3.out" }, "sheet+=0.9");
        t.time(Math.min(elapsed, t.duration()));
        tl.current = t;
      });
    },
    { scope: root },
  );

  // End only on the real signal, after a short floor so a cached canvas does not flash the sheet.
  useEffect(() => {
    if (!done) return;
    const waited = clock.epoch === null ? MIN_MS : performance.now() - clock.epoch;
    const t = setTimeout(() => setEnding((e) => e ?? "done"), Math.max(0, MIN_MS - waited));
    return () => clearTimeout(t);
  }, [done]);

  // Never trap the keyboard: focus moving into the page removes the sheet at once.
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      if (!root.current?.contains(e.target as Node)) setEnding((x) => x ?? "skip");
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);

  // L3 the drawing finishes quickly, L4 the sheet lifts off the real canvas.
  useGSAP(
    () => {
      if (!ending || !root.current) return;
      clock.epoch = null;
      const reduce = matchMedia(REDUCE_QUERY).matches;
      const t = tl.current;
      const lift = () =>
        gsap.to(root.current, {
          autoAlpha: 0,
          y: reduce ? 0 : -16,
          duration: reduce ? 0.15 : 0.35,
          ease: "power2.in",
          onComplete: () => setGone(true),
        });
      if (ending === "done" && t && t.progress() < 1 && !reduce) t.timeScale(3).eventCallback("onComplete", lift);
      else {
        t?.progress(1);
        lift();
      }
    },
    { scope: root, dependencies: [ending] },
  );

  useEffect(() => {
    if (gone) onGone?.();
  }, [gone, onGone]);

  if (gone) return null;
  return (
    <div
      ref={root}
      onPointerDown={skip}
      className="draft-loader grid-paper fixed inset-x-0 top-14 bottom-0 z-[15] flex flex-col items-center justify-center gap-6 px-gutter md:top-16"
    >
      <svg viewBox="0 0 640 340" className="w-full max-w-[720px] text-ink" fill="none" stroke="currentColor" aria-hidden="true">
        {/* sheet border and ground */}
        <rect className="dl-stroke dl-sheet" x="8" y="8" width="624" height="324" strokeWidth="2" pathLength={1} />
        <path className="dl-stroke dl-ground" d="M70 282H570" strokeWidth="2.5" pathLength={1} />
        {/* wheels and hubs */}
        <circle className="dl-stroke dl-wheel" cx="190" cy="226" r="54" strokeWidth="2" pathLength={1} />
        <circle className="dl-stroke dl-wheel" cx="450" cy="226" r="54" strokeWidth="2" pathLength={1} />
        <circle className="dl-stroke dl-wheel" cx="190" cy="226" r="34" strokeWidth="1" pathLength={1} />
        <circle className="dl-stroke dl-wheel" cx="450" cy="226" r="34" strokeWidth="1" pathLength={1} />
        {/* side elevation: frame, tank, seat, fork, engine, exhaust, bar */}
        <path className="dl-stroke dl-body" d="M190 226L238 168H312L352 214H290L238 168" strokeWidth="2" strokeLinejoin="round" pathLength={1} />
        <path className="dl-stroke dl-body" d="M312 168C322 132 392 124 420 150L414 168Z" strokeWidth="2" strokeLinejoin="round" pathLength={1} />
        <path className="dl-stroke dl-body" d="M228 164H306M228 164C214 150 204 150 196 158" strokeWidth="2" strokeLinecap="round" pathLength={1} />
        <path className="dl-stroke dl-body" d="M414 142L450 226M424 140L460 222" strokeWidth="2" strokeLinecap="round" pathLength={1} />
        <rect className="dl-stroke dl-body" x="292" y="180" width="62" height="50" strokeWidth="2" pathLength={1} />
        <path className="dl-stroke dl-body" d="M300 186H346M300 196H346M300 206H346" strokeWidth="1" pathLength={1} />
        <path className="dl-stroke dl-body" d="M300 232C276 252 232 254 168 250H130" strokeWidth="2" strokeLinecap="round" pathLength={1} />
        <path className="dl-stroke dl-body" d="M414 138L430 128H452" strokeWidth="2" strokeLinecap="round" pathLength={1} />
        {/* axle centerlines (chain dash) */}
        <path className="dl-fade dl-center" d="M190 160V292M124 226H256M450 160V292M384 226H516" strokeWidth="1" strokeDasharray="14 3 3 3" />
        {/* wheelbase dimension with arrowheads */}
        <path className="dl-stroke dl-dim" d="M190 150V70M450 120V70" strokeWidth="1" pathLength={1} />
        <path className="dl-stroke dl-dim" d="M190 80H450" strokeWidth="1" pathLength={1} />
        <path className="dl-fade dl-head" d="M190 80l12-5v10zM450 80l-12-5v10z" fill="currentColor" stroke="none" />
        {/* leader lines to part numbers 01 and 07 */}
        <path className="dl-stroke dl-leader" d="M262 198L232 120H206" strokeWidth="1" pathLength={1} />
        <path className="dl-stroke dl-leader" d="M330 218L372 304H400" strokeWidth="1" pathLength={1} />
        <circle className="dl-fade" cx="262" cy="198" r="3" fill="currentColor" stroke="none" />
        <circle className="dl-fade" cx="330" cy="218" r="3" fill="currentColor" stroke="none" />
        <g className="dl-fade" fill="currentColor" stroke="none" fontFamily="var(--font-plex-mono), monospace" fontSize="12" fontWeight="500" letterSpacing="0.06em">
          <text x="320" y="66" textAnchor="middle">JARAK SUMBU RODA</text>
          <text x="144" y="124">01 RANGKA</text>
          <text x="406" y="308">07 MESIN</text>
        </g>
      </svg>

      <div className="grid w-full max-w-[720px] grid-cols-2 gap-px border-2 border-ink bg-ink sm:grid-cols-4">
        <Cell label="Judul">{title}</Cell>
        <Cell label="Skala">Tidak diskala</Cell>
        <Cell label="Revisi">
          <DeltaSymbol className="size-5" />
          <span className="sr-only">revisi</span>
        </Cell>
        <div className="min-w-0 bg-paper-raised px-4 py-3">
          <div className="dl-cell t-label text-ink-muted">Status</div>
          <p role="status" className="dl-cell mt-1 font-semibold">
            {ending ? "Meja gambar siap." : "Menyiapkan meja gambar..."}
          </p>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-paper-raised px-4 py-3">
      <div className="dl-cell t-label text-ink-muted">{label}</div>
      <div className="dl-cell mt-1 truncate font-semibold">{children}</div>
    </div>
  );
}
