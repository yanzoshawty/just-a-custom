"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import { DEFAULT_BUILD } from "@/lib/build-schema";
import { GROUPS, PRESETS, STYLE_NAMES, STYLES, type Style } from "@/lib/catalog";
import { DeltaSymbol } from "@/components/site/Symbols";
import { CanvasFailed, CanvasLoading, useWebGL } from "@/three/shell";
import { prefersReducedMotion, useMedia, useReducedMotion } from "@/three/tokens";
import { resetStage, stage as store } from "@/three/stage-store";
import { CAPTIONS, STYLE_COPY } from "./copy";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const LandingScene = dynamic(() => import("@/three/LandingScene"), { ssr: false });

/** Pinned-timeline progress to story step: -1 intro, 0..6 parts, 7 reassembled. */
function stepAt(p: number) {
  if (p < 0.1) return -1;
  if (p >= 0.92) return 7;
  return Math.min(6, Math.floor(((p - 0.1) / 0.82) * 7));
}

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const bongkar = useRef<HTMLElement>(null);
  const aliran = useRef<HTMLElement>(null);
  const captions = useRef<HTMLOListElement>(null);
  const heroWindow = useRef<HTMLDivElement>(null);
  const aliranWindow = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const lenis = useRef<Lenis | null>(null);
  const prevStep = useRef(-1);

  const webgl = useWebGL();
  const reduce = useReducedMotion();
  const narrow = !useMedia("(min-width: 768px)", true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(-1);
  const [aliranOn, setAliranOn] = useState(false);
  const [style, setStyle] = useState<Style>("cafe-racer");

  const canvas = webgl === true && !failed;
  // Server HTML and no-JS get the static list; the pinned story switches on once motion + WebGL are confirmed.
  const pinned = canvas && !reduce;

  // M1 Lenis + M4/M6 pinned breakdown + styles-section switches. All reverted on unmount.
  useGSAP(
    () => {
      resetStage(prefersReducedMotion());
      store.heroEl = heroWindow.current;
      store.aliranEl = aliranWindow.current;
      const mm = gsap.matchMedia();
      // the handler only runs when some condition matches, so desktop + its complement cover every screen
      mm.add({ desktop: "(min-width: 1024px)", narrow: "(max-width: 1023.98px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        const { desktop, reduce: rm } = ctx.conditions as { desktop: boolean; reduce: boolean };
        const inv = () => store.invalidate();
        let stopLenis = () => {};
        if (!rm) {
          const l = new Lenis({ lerp: 0.1 });
          l.on("scroll", ScrollTrigger.update);
          const tick = (t: number) => l.raf(t * 1000);
          gsap.ticker.add(tick);
          gsap.ticker.lagSmoothing(0);
          lenis.current = l;
          stopLenis = () => {
            gsap.ticker.remove(tick);
            gsap.ticker.lagSmoothing(500, 33);
            l.destroy();
            lenis.current = null;
          };
        }

        if (pinned && !rm && bongkar.current) {
          gsap
            .timeline({
              defaults: { ease: "none" },
              onUpdate: inv,
              scrollTrigger: {
                trigger: bongkar.current,
                start: "top top",
                end: desktop ? "+=700%" : "+=500%",
                pin: true,
                scrub: 0.6,
                onUpdate: (self) => setStep(stepAt(self.progress)),
              },
            })
            .to(store, { view: 1, dim: 0, duration: 0.1 })
            .to(store.explode, { current: 1, duration: 0.82 })
            .to(store.explode, { current: 0, duration: 0.08 });
        } else if (canvas && bongkar.current) {
          // Reduced motion: no pin, no scrub. The drawing switches state as the section arrives.
          ScrollTrigger.create({
            trigger: bongkar.current,
            start: "top 60%",
            end: "bottom 40%",
            onToggle: (self) => {
              store.explode.current = self.isActive ? 1 : 0;
              store.view = self.isActive || self.direction > 0 ? 1 : 0;
              store.dim = store.view ? 0 : 1;
              inv();
            },
          });
        }

        if (aliran.current) {
          if (rm)
            ScrollTrigger.create({
              trigger: aliran.current,
              start: "top 55%",
              onEnter: () => ((store.aliran = 1), inv()),
              onLeaveBack: () => ((store.aliran = 0), inv()),
            });
          else
            gsap.to(store, {
              aliran: 1,
              ease: "none",
              onUpdate: inv,
              scrollTrigger: { trigger: aliran.current, start: "top bottom", end: "top top", scrub: 0.6 },
            });
          ScrollTrigger.create({
            trigger: aliran.current,
            start: "top 55%",
            onEnter: () => setAliranOn(true),
            onLeaveBack: () => setAliranOn(false),
          });
        }
        if (!desktop) {
          // phones: the bike is framed into the hero / styles windows, so redraw while they scroll
          for (const el of [heroWindow.current, aliranWindow.current])
            if (el) ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onUpdate: inv });
        }
        return () => {
          stopLenis();
          store.heroEl = null;
          store.aliranEl = null;
        };
      });
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: root, dependencies: [pinned, canvas], revertOnUpdate: true },
  );

  // M2 + M3 once the canvas is ready.
  useGSAP(
    () => {
      if (!ready) return;
      const r = prefersReducedMotion();
      const inv = () => store.invalidate();
      gsap.to(store, { draw: 1, duration: r ? 0 : 0.9, ease: "power2.out", onUpdate: inv });
      gsap.to(store.intro, { current: 1, duration: r ? 0 : 0.6, ease: "power2.out", onUpdate: inv });
    },
    { dependencies: [ready] },
  );

  // M5: caption swap at step boundaries (not scrubbed, so text is never half visible).
  useGSAP(
    () => {
      if (!pinned || !captions.current) return;
      const items = Array.from(captions.current.children) as HTMLElement[];
      const idx = Math.min(step, 6);
      const prev = Math.min(prevStep.current, 6);
      prevStep.current = step;
      // fast scrubbing can skip steps: anything not involved in this swap is reset outright
      items.forEach((el, i) => i !== idx && i !== prev && gsap.set(el, { opacity: 0, y: 0, overwrite: true }));
      if (prev >= 0 && prev !== idx) gsap.to(items[prev], { opacity: 0, y: -8, duration: 0.3, ease: "power3.out", overwrite: true });
      if (idx >= 0 && idx !== prev)
        gsap.fromTo(items[idx], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out", overwrite: true });
    },
    { scope: root, dependencies: [step, pinned] },
  );

  function goBongkar(e: MouseEvent) {
    const el = bongkar.current;
    if (!el) return;
    e.preventDefault();
    const focus = () => heading.current?.focus({ preventScroll: true });
    if (lenis.current) lenis.current.scrollTo(el, { onComplete: focus });
    else {
      el.scrollIntoView();
      focus();
    }
  }

  const captionIdx = Math.min(step, 6);
  const highlight = pinned && step >= 0 && step <= 6 ? GROUPS[step].id : null;
  const config = aliranOn ? { ...DEFAULT_BUILD, style, parts: PRESETS[style] } : DEFAULT_BUILD;

  return (
    <div ref={root}>
      {canvas && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
          <LandingScene
            config={config}
            mode={aliranOn ? "painted" : "blueprint"}
            highlight={highlight}
            activeOnly={narrow}
            reduceMotion={reduce}
            onReady={() => setReady(true)}
            onLost={() => setFailed(true)}
          />
        </div>
      )}

      {/* 3.1 Hero */}
      <section
        id="mulai"
        className="relative z-10 flex min-h-[calc(100dvh-56px)] flex-col px-gutter pt-10 md:min-h-[calc(100dvh-64px)] lg:pt-24"
      >
        <div className="mx-auto w-full max-w-[1320px]">
          <h1 className="t-display max-w-[14ch] text-balance lg:max-w-[58%]">Gambar dulu, gerinda belakangan.</h1>
          <p className="t-body-lg mt-5 max-w-[46ch] lg:max-w-[40%]">
            Pilih rangka, mesin, tangki sampai knalpot. Lihat motornya utuh atau dibongkar per part, lalu kirim link-nya ke
            bengkel langgananmu.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/garage" className="btn-primary">
              Mulai rakit
            </Link>
            <a href="#bongkar" onClick={goBongkar} className="btn-secondary bg-paper">
              Lihat bongkarannya
            </a>
          </div>
        </div>
        <div ref={heroWindow} className="relative min-h-[44dvh] flex-1 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[60%]">
          {webgl === false || failed ? (
            <CanvasFailed tail="Pilihan part dan cat tetap bisa diatur dan disimpan." />
          ) : (
            !ready && <CanvasLoading />
          )}
        </div>
        <div className="mx-auto mb-8 hidden w-full max-w-[1320px] sm:block lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-8 lg:mb-0 lg:px-gutter">
          <div className="ml-auto grid w-fit grid-cols-2 gap-px border-2 border-ink bg-ink lg:pointer-events-auto">
            <HeroCell label="Judul">Cafe racer standar garasi</HeroCell>
            <HeroCell label="Gaya">Cafe racer</HeroCell>
            <HeroCell label="Skala">Tidak diskala</HeroCell>
            <HeroCell label="Revisi">
              <DeltaSymbol className="size-5" />
              <span className="sr-only">revisi</span>
            </HeroCell>
          </div>
        </div>
      </section>

      {/* 3.2 Breakdown */}
      {pinned ? (
        <section id="bongkar" ref={bongkar} className="relative z-10 h-dvh overflow-hidden" aria-labelledby="bongkar-h">
          <div
            className={`absolute transition-opacity duration-300 max-lg:inset-x-0 max-lg:bottom-0 max-lg:border-t-2 max-lg:border-ink max-lg:bg-paper-raised max-lg:p-4 max-lg:pb-[max(16px,env(safe-area-inset-bottom))] lg:top-24 lg:left-[max(var(--gutter),calc((100vw-1320px)/2+var(--gutter)))] lg:max-w-[420px] ${
              step < 0 ? "opacity-100" : "pointer-events-none opacity-0"
            } ${step === 0 ? "lg:pointer-events-auto lg:opacity-100" : ""}`}
          >
            <h2 id="bongkar-h" ref={heading} tabIndex={-1} className="t-h2">
              Dibongkar dari rangka sampai mesin.
            </h2>
            <p className="t-body-lg mt-3">
              Tiap part dilepas satu per satu, lengkap dengan pilihan yang bisa kamu pasang di garasi.
            </p>
          </div>
          <div
            className={`absolute bg-paper-raised transition-opacity duration-300 max-lg:inset-x-0 max-lg:bottom-0 max-lg:border-t-2 max-lg:border-ink max-lg:p-4 max-lg:pb-[max(16px,env(safe-area-inset-bottom))] lg:bottom-12 lg:left-[max(var(--gutter),calc((100vw-1320px)/2+var(--gutter)))] lg:w-[420px] lg:border-2 lg:border-ink lg:p-5 ${
              step >= 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <div aria-hidden="true" className="relative mb-4 h-3">
              <span className="absolute inset-y-0 left-0 w-px bg-ink" />
              <span className="absolute inset-y-0 right-0 w-px bg-ink" />
              <span className="absolute inset-x-0 top-1/2 h-px bg-ink" />
              <span
                className="absolute top-1/2 left-0 h-[3px] w-full origin-left -translate-y-1/2 bg-ink transition-transform duration-300"
                style={{ transform: `translateY(-50%) scaleX(${(Math.max(0, captionIdx) + 1) / 7})` }}
              />
            </div>
            <ol ref={captions} className="grid">
              {CAPTIONS.map((c) => (
                <li key={c.label} className="opacity-0 [grid-area:1/1]">
                  <Caption c={c} />
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : (
        <section id="bongkar" ref={bongkar} className="relative z-10 px-gutter py-16 lg:py-32" aria-labelledby="bongkar-h">
          {canvas && <div aria-hidden="true" className="h-[58dvh] lg:hidden" />}
          <div className="mx-auto max-w-[1320px]">
            <div className="lg:w-5/12">
              <h2 id="bongkar-h" ref={heading} tabIndex={-1} className="t-h2">
                Dibongkar dari rangka sampai mesin.
              </h2>
              <p className="t-body-lg mt-3">
                Tiap part dilepas satu per satu, lengkap dengan pilihan yang bisa kamu pasang di garasi.
              </p>
              <ol className="mt-8 flex flex-col gap-4">
                {CAPTIONS.map((c) => (
                  <li key={c.label} className="border-2 border-ink bg-paper-raised p-4">
                    <Caption c={c} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* 3.3 Styles */}
      <section
        id="aliran"
        ref={aliran}
        className="relative z-10 flex min-h-dvh flex-col px-gutter py-16 lg:justify-center lg:py-32"
        aria-labelledby="aliran-h"
      >
        <StyleTabs style={style} onStyle={setStyle} windowRef={aliranWindow} />
      </section>

      {/* 3.4 Closing title block */}
      <section id="garasi" className="relative z-10 bg-paper px-gutter py-16 md:py-32" aria-labelledby="garasi-h">
        <div className="mx-auto grid max-w-[1080px] gap-px border-2 border-ink bg-ink">
          <div className="bg-paper-raised p-6 md:p-10">
            <h2 id="garasi-h" className="t-h2">
              Meja gambar sudah siap.
            </h2>
            <p className="t-body-lg mt-4 max-w-[60ch]">
              Rakit di garasi, simpan, lalu kirim satu link ke bengkel atau ke grup tongkrongan. Nggak pakai daftar akun.
            </p>
          </div>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
            <HeroCell label="Digambar oleh">Kamu</HeroCell>
            <HeroCell label="Diperiksa">Bengkel langgananmu</HeroCell>
            <HeroCell label="Skala">Tidak diskala</HeroCell>
            <div className="flex items-center bg-paper-raised p-4">
              <Link href="/garage" className="btn-primary w-full sm:w-auto">
                Mulai rakit
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-paper-raised px-4 py-3">
      <div className="t-label text-ink-muted">{label}</div>
      <div className="mt-1 font-semibold">{children}</div>
    </div>
  );
}

function Caption({ c }: { c: (typeof CAPTIONS)[number] }) {
  return (
    <>
      <div className="t-label text-ink-muted">{c.label}</div>
      <h3 className="t-h3 mt-1">{c.title}</h3>
      <p className="mt-2">{c.body}</p>
      <p className="t-data mt-3 text-ink-muted">{c.options}</p>
    </>
  );
}

/** 3.3 tabs (WAI-ARIA tabs, automatic activation). */
function StyleTabs({
  style,
  onStyle,
  windowRef,
}: {
  style: Style;
  onStyle: (s: Style) => void;
  windowRef: React.RefObject<HTMLDivElement | null>;
}) {
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  function onKey(e: KeyboardEvent, i: number) {
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % STYLES.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + STYLES.length) % STYLES.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = STYLES.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onStyle(STYLES[n]);
    list.current?.querySelectorAll<HTMLElement>("[role=tab]")[n]?.focus();
  }
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col lg:flex-none">
      <div className="lg:w-5/12">
        <h2 id="aliran-h" className="t-h2">
          Pilih alirannya dulu.
        </h2>
        <p className="t-body-lg mt-3 max-w-[46ch]">
          Tiap aliran memasang satu set part awal. Setelah itu semuanya bisa kamu ganti di garasi.
        </p>
        <div ref={list} role="tablist" aria-label="Aliran" className="mt-6 grid grid-cols-2 gap-2">
          {STYLES.map((s, i) => (
            <button
              key={s}
              id={`${id}-${s}`}
              type="button"
              role="tab"
              aria-selected={style === s}
              aria-controls={`${id}-panel`}
              tabIndex={style === s ? 0 : -1}
              onClick={() => onStyle(s)}
              onKeyDown={(e) => onKey(e, i)}
              className="chip justify-center"
            >
              {STYLE_NAMES[s]}
            </button>
          ))}
        </div>
      </div>
      {/* phone/tablet: window onto the fixed drawing between tabs and copy */}
      <div ref={windowRef} aria-hidden="true" className="min-h-[34dvh] flex-1 lg:hidden" />
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${style}`}
        className="border-2 border-ink bg-paper-raised p-4 lg:mt-6 lg:w-5/12"
      >
        <p>{STYLE_COPY[style]}</p>
        <Link href={`/garage?style=${style}`} aria-label={`Mulai rakit dari preset ${STYLE_NAMES[style]}`} className="btn-primary mt-4">
          Mulai rakit
        </Link>
      </div>
    </div>
  );
}
