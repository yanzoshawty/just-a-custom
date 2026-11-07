"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useId, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import { DEFAULT_BUILD, type BuildConfig } from "@/lib/build-schema";
import {
  BASE_CC,
  BASE_NAMES,
  BASE_NOTES,
  BASES,
  GROUPS,
  PART_KEY_LABEL,
  PRESETS,
  SECTIONS,
  type GroupId,
  type SectionId,
  type Style,
} from "@/lib/catalog";
import { DeltaSymbol } from "@/components/site/Symbols";
import { CanvasFailed, CanvasLoading, useWebGL } from "@/three/shell";
import { prefersReducedMotion, useMedia, useReducedMotion } from "@/three/tokens";
import { resetStage, stage as store } from "@/three/stage-store";
import { ALIRAN, CAPTIONS, optionList, presetsUsing } from "./copy";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const LandingScene = dynamic(() => import("@/three/LandingScene"), { ssr: false });

const STEPS = CAPTIONS.length;
/** Pinned-timeline progress to story step: -1 intro, 0..STEPS-1 parts, STEPS reassembled. */
function stepAt(p: number) {
  if (p < 0.1) return -1;
  if (p >= 0.92) return STEPS;
  return Math.min(STEPS - 1, Math.floor(((p - 0.1) / 0.82) * STEPS));
}

// UX-SPEC 3.6: donor bikes from the catalog; BASE_CC draws the dimension lines to scale.
const CC = BASE_CC;
const SHEETS = BASES.filter((b) => CC[b]).map((b) => ({ id: b, name: BASE_NAMES[b], note: BASE_NOTES[b], cc: CC[b]! }));
const MAX_CC = Math.max(...SHEETS.map((b) => b.cc));
const ccLabel = (n: number) => `${String(n).replace(".", ",")} cc`;

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const bongkar = useRef<HTMLElement>(null);
  const aliran = useRef<HTMLElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const gudang = useRef<HTMLElement>(null);
  const captions = useRef<HTMLOListElement>(null);
  const heroWindow = useRef<HTMLDivElement>(null);
  const aliranWindow = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const lenis = useRef<Lenis | null>(null);
  const aliranST = useRef<ScrollTrigger | null>(null);
  const prevStep = useRef(-1);

  const webgl = useWebGL();
  const reduce = useReducedMotion();
  const narrow = !useMedia("(min-width: 768px)", true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(-1);
  const [aliranOn, setAliranOn] = useState(false);
  const [style, setStyle] = useState<Style>(ALIRAN[0].id);
  const [group, setGroup] = useState<GroupId>(GROUPS[0].id);
  const [gudangOn, setGudangOn] = useState(false);

  const canvas = webgl === true && !failed;
  // Server HTML and no-JS get the static layouts; the pinned story switches on once motion + WebGL are confirmed.
  const pinned = canvas && !reduce;
  const styleIdx = Math.max(0, ALIRAN.findIndex((a) => a.id === style));

  // M1 Lenis, M4/M6 breakdown pin, M15 to M17 aliran walk, framing switches. All reverted on unmount
  // and when Activity hides the page on navigation (effects clean up), so no trigger outlives the route.
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

        // M15 + M17: vertical scroll walks the aliran cards sideways; the card in the left slot drives the bike.
        const tr = track.current;
        if (pinned && !rm && aliran.current && tr) {
          const items = tr.children as HTMLCollectionOf<HTMLElement>;
          const n = items.length;
          const dist = () => items[n - 1].offsetLeft - items[0].offsetLeft;
          const walk = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: aliran.current,
              start: "top top",
              end: () => `+=${Math.max(dist() * 1.15, innerHeight * 2)}`,
              pin: true,
              scrub: 0.6,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const i = Math.round(self.progress * (n - 1));
                setStyle(ALIRAN[i].id);
              },
            },
          });
          walk.to(tr, { x: () => -dist() }, 0).fromTo(".aliran-fill", { scaleX: 1 / n }, { scaleX: 1 }, 0);
          aliranST.current = walk.scrollTrigger ?? null;
        }

        // Desktop only: the transparent parts section lights the chosen group on the bike (M18).
        if (desktop && canvas && gudang.current)
          ScrollTrigger.create({
            trigger: gudang.current,
            start: "top 55%",
            end: "bottom 45%",
            onToggle: (self) => setGudangOn(self.isActive),
          });

        if (!rm) {
          // M20: the culture headline rises out of its line masks once, the one loud beat of that section
          gsap.from(".harian-line", {
            yPercent: 105,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.12,
            scrollTrigger: { trigger: "#harian", start: "top 70%", once: true },
          });
          // M21: each base sheet is laid on the table, then its displacement line is drafted to scale
          gsap.utils.toArray<HTMLElement>(".base-sheet").forEach((el) => {
            gsap.from(el, { x: 48, autoAlpha: 0, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } });
            gsap.from(el.querySelectorAll(".base-dim"), {
              scaleX: 0,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top 80%", end: "top 45%", scrub: 0.6 },
            });
          });
          // M22: the closing title block fills in cell by cell, like the loader's block
          gsap.from(".close-cell", {
            autoAlpha: 0,
            y: 8,
            duration: 0.35,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: "#garasi", start: "top 70%", once: true },
          });
        }

        if (!desktop) {
          // phones: the bike is framed into the hero / styles windows, so redraw while they scroll
          for (const el of [heroWindow.current, aliranWindow.current])
            if (el) ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onUpdate: inv });
        }
        return () => {
          stopLenis();
          aliranST.current = null;
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
      const idx = Math.min(step, STEPS - 1);
      const prev = Math.min(prevStep.current, STEPS - 1);
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

  // A card's CTA can be reached by Tab while it sits off to the right: scroll the walk to that card.
  function onTrackFocus(e: FocusEvent<HTMLOListElement>) {
    const st = aliranST.current;
    const li = (e.target as HTMLElement).closest("li");
    if (!st || !li || !track.current) return;
    const i = Array.prototype.indexOf.call(track.current.children, li);
    const y = st.start + (i / Math.max(1, ALIRAN.length - 1)) * (st.end - st.start);
    if (lenis.current) lenis.current.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  }

  const captionIdx = Math.min(step, STEPS - 1);
  const highlight = pinned && step >= 0 && step < STEPS ? CAPTIONS[step].id : gudangOn ? group : null;
  const config: BuildConfig = aliranOn ? ({ ...DEFAULT_BUILD, style, parts: PRESETS[style] } as BuildConfig) : DEFAULT_BUILD;

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
            <Cell label="Judul">Cafe racer standar garasi</Cell>
            <Cell label="Gaya">Cafe racer</Cell>
            <Cell label="Skala">Tidak diskala</Cell>
            <Cell label="Revisi">
              <DeltaSymbol className="size-5" />
              <span className="sr-only">revisi</span>
            </Cell>
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
            <Ruler fill={(Math.max(0, captionIdx) + 1) / STEPS} />
            <ol ref={captions} className="grid">
              {CAPTIONS.map((c) => (
                <li key={c.id} className="opacity-0 [grid-area:1/1]">
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
                  <li key={c.id} className="border-2 border-ink bg-paper-raised p-4">
                    <Caption c={c} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* 3.3 Aliran: pinned horizontal walk, or tabs when there is no pin */}
      {pinned ? (
        <section id="aliran" ref={aliran} className="relative z-10 h-dvh overflow-clip" aria-labelledby="aliran-h">
          <div className="mx-auto flex h-full max-w-[1320px] flex-col px-gutter pt-6 pb-[max(20px,env(safe-area-inset-bottom))] lg:pt-20 lg:pb-10">
            <div className="lg:w-5/12">
              <h2 id="aliran-h" className="t-h2">
                Pilih alirannya dulu.
              </h2>
              <p className="t-body-lg mt-3 max-w-[46ch] max-lg:hidden">
                Tiap aliran memasang satu set part awal. Setelah itu semuanya bisa kamu ganti di garasi.
              </p>
            </div>
            {/* phone/tablet: window onto the fixed drawing; desktop: spacer, the bike sits right */}
            <div ref={aliranWindow} aria-hidden="true" className="min-h-0 flex-1" />
            {/* desktop: the walk runs inside the left column so the bike on the right stays clear; clip (not hidden) so focus cannot scroll it */}
            <div className="lg:-mt-3 lg:w-[44%] lg:overflow-clip lg:pt-3 lg:[mask-image:linear-gradient(90deg,#000_78%,transparent)]">
              <ol ref={track} onFocus={onTrackFocus} aria-label="Aliran" className="flex gap-4 will-change-transform [--card:min(84vw,330px)]">
                {ALIRAN.map((a, i) => (
                  <li
                    key={a.id}
                    data-active={i === styleIdx}
                    aria-current={i === styleIdx ? "true" : undefined}
                    className="aliran-card flex w-[var(--card)] shrink-0 flex-col border border-line-strong bg-paper-raised p-4"
                  >
                    <AliranCard a={a} />
                  </li>
                ))}
              </ol>
            </div>
            <div aria-hidden="true" className="relative mt-4 h-3 w-[min(100%,560px)] lg:w-[44%]">
              <span className="absolute inset-y-0 left-0 w-px bg-ink" />
              <span className="absolute inset-y-0 right-0 w-px bg-ink" />
              <span className="absolute inset-x-0 top-1/2 h-px bg-ink" />
              <span className="aliran-fill absolute top-1/2 left-0 h-[3px] w-full origin-left -translate-y-1/2 bg-ink" />
            </div>
          </div>
        </section>
      ) : (
        <section
          id="aliran"
          ref={aliran}
          className="relative z-10 flex min-h-dvh flex-col px-gutter py-16 lg:justify-center lg:py-32"
          aria-labelledby="aliran-h"
        >
          <StyleTabs style={style} onStyle={setStyle} windowRef={aliranWindow} />
        </section>
      )}

      {/* 3.5 Parts store: solid on phones, transparent on desktop so the chosen group lights on the bike */}
      <section id="gudang" ref={gudang} className="relative z-10 bg-paper px-gutter py-16 lg:bg-transparent lg:py-32" aria-labelledby="gudang-h">
        <div className="mx-auto max-w-[1320px]">
          <Gudang group={group} onGroup={setGroup} />
        </div>
      </section>

      {/* 3.6 Daily custom culture */}
      <section id="harian" className="relative z-10 bg-paper px-gutter py-16 md:py-32" aria-labelledby="harian-h">
        <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <h2 id="harian-h" className="t-h2">
              <span className="block overflow-hidden pb-1">
                <span className="harian-line block">Motor harian juga</span>
              </span>
              <span className="block overflow-hidden pb-1">
                <span className="harian-line block">layak digambar.</span>
              </span>
            </h2>
            <p className="t-body-lg mt-5 max-w-[48ch]">
              Custom nggak harus nunggu motor tua. Motor 150-an yang tiap hari dipakai ke kantor atau kampus juga bisa
              digarap pelan-pelan: jok dulu, lalu stang, knalpot, dan ban.
            </p>
            <p className="mt-4 max-w-[48ch] text-ink-muted">
              Motor dasar ini bisa kamu pilih sebagai basis di garasi. Isi silinder sesuai spesifikasi pabrik; gambarnya
              tetap gambar gaya, bukan replika pabrik.
            </p>
          </div>
          <ul className="flex flex-col gap-5 lg:col-span-7">
            {SHEETS.map((b, i) => (
              <li key={b.id} className="base-sheet border-2 border-ink bg-paper-raised lg:ml-[calc(var(--i)*6%)]" style={{ "--i": i } as React.CSSProperties}>
                <div className="grid sm:grid-cols-[minmax(9rem,1fr)_2fr]">
                  <div className="border-b border-ink p-4 sm:border-r sm:border-b-0">
                    <div className="t-label text-ink-muted">Motor dasar</div>
                    <h3 className="t-h3 mt-1">{b.name}</h3>
                  </div>
                  <div className="p-4">
                    <div className="t-label text-ink-muted">Catatan</div>
                    <p className="mt-1">{b.note}</p>
                  </div>
                </div>
                {/* displacement drawn to scale against the largest base, as a dimension line (no track) */}
                <div className="border-t border-ink px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="t-label text-ink-muted">Isi silinder</span>
                    <span className="t-data font-medium text-ink">{ccLabel(b.cc)}</span>
                  </div>
                  <div aria-hidden="true" className="mt-2 h-3" style={{ width: `${(b.cc / MAX_CC) * 100}%` }}>
                    <div className="base-dim relative h-full origin-left">
                      <span className="absolute inset-y-0 left-0 w-px bg-ink" />
                      <span className="absolute inset-y-0 right-0 w-px bg-ink" />
                      <span className="absolute inset-x-0 top-1/2 h-px bg-ink" />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3.4 Closing title block */}
      <section id="garasi" className="relative z-10 bg-paper px-gutter py-16 md:py-32" aria-labelledby="garasi-h">
        <div className="mx-auto grid max-w-[1080px] gap-px border-2 border-ink bg-ink">
          <div className="close-cell bg-paper-raised p-6 md:p-10">
            <h2 id="garasi-h" className="t-h2">
              Meja gambar sudah siap.
            </h2>
            <p className="t-body-lg mt-4 max-w-[60ch]">
              Rakit di garasi, simpan, lalu kirim satu link ke bengkel atau ke grup tongkrongan. Nggak pakai daftar akun.
            </p>
          </div>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
            <Cell label="Digambar oleh" className="close-cell">
              Kamu
            </Cell>
            <Cell label="Diperiksa" className="close-cell">
              Bengkel langgananmu
            </Cell>
            <Cell label="Skala" className="close-cell">
              Tidak diskala
            </Cell>
            <div className="close-cell flex items-center bg-paper-raised p-4">
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

function Cell({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 bg-paper-raised px-4 py-3 ${className}`}>
      <div className="t-label text-ink-muted">{label}</div>
      <div className="mt-1 font-semibold">{children}</div>
    </div>
  );
}

function Ruler({ fill }: { fill: number }) {
  return (
    <div aria-hidden="true" className="relative mb-4 h-3">
      <span className="absolute inset-y-0 left-0 w-px bg-ink" />
      <span className="absolute inset-y-0 right-0 w-px bg-ink" />
      <span className="absolute inset-x-0 top-1/2 h-px bg-ink" />
      <span
        className="absolute top-1/2 left-0 h-[3px] w-full origin-left -translate-y-1/2 bg-ink transition-transform duration-300"
        style={{ transform: `translateY(-50%) scaleX(${fill})` }}
      />
    </div>
  );
}

function Caption({ c }: { c: (typeof CAPTIONS)[number] }) {
  return (
    <>
      <div className="t-label text-ink-muted">{c.label}</div>
      <h3 className="t-h3 mt-1">{c.title}</h3>
      {c.body && <p className="mt-2">{c.body}</p>}
      <p className="t-data mt-3 text-ink-muted">{c.options}</p>
    </>
  );
}

function AliranCard({ a }: { a: (typeof ALIRAN)[number] }) {
  return (
    <>
      <h3 className="t-h3">{a.name}</h3>
      <p className="mt-2 line-clamp-3 text-[0.9375rem]">{a.blurb}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 max-sm:hidden">
        {a.spec.slice(0, 4).map((x) => (
          <div key={x.label} className="min-w-0">
            <dt className="t-label text-ink-muted">{x.label}</dt>
            <dd className="truncate text-sm font-medium">{x.value}</dd>
          </div>
        ))}
      </dl>
      <Link href={`/garage?style=${a.id}`} aria-label={`Mulai rakit dari preset ${a.name}`} className="btn-primary mt-auto self-start max-sm:mt-4 sm:mt-4">
        Mulai rakit
      </Link>
    </>
  );
}

/** Roving keys shared by the two tab lists (WAI-ARIA tabs, automatic activation). */
function tabKey<T>(e: KeyboardEvent, i: number, list: readonly T[], set: (v: T) => void, host: HTMLElement | null) {
  let n = -1;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % list.length;
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + list.length) % list.length;
  if (e.key === "Home") n = 0;
  if (e.key === "End") n = list.length - 1;
  if (n < 0) return;
  e.preventDefault();
  set(list[n]);
  host?.querySelectorAll<HTMLElement>("[role=tab]")[n]?.focus();
}

/** 3.3 fallback (reduced motion, no WebGL): tabs over the same catalog. */
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
  const ids = ALIRAN.map((a) => a.id);
  const active = ALIRAN.find((a) => a.id === style) ?? ALIRAN[0];
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col lg:flex-none">
      <div className="lg:w-5/12">
        <h2 id="aliran-h" className="t-h2">
          Pilih alirannya dulu.
        </h2>
        <p className="t-body-lg mt-3 max-w-[46ch]">
          Tiap aliran memasang satu set part awal. Setelah itu semuanya bisa kamu ganti di garasi.
        </p>
        <div ref={list} role="tablist" aria-label="Aliran" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALIRAN.map((a, i) => (
            <button
              key={a.id}
              id={`${id}-${a.id}`}
              type="button"
              role="tab"
              aria-selected={style === a.id}
              aria-controls={`${id}-panel`}
              tabIndex={style === a.id ? 0 : -1}
              onClick={() => onStyle(a.id)}
              onKeyDown={(e) => tabKey(e, i, ids, onStyle, list.current)}
              className="chip justify-center"
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>
      {/* phone/tablet: window onto the fixed drawing between tabs and copy */}
      <div ref={windowRef} aria-hidden="true" className="min-h-[34dvh] flex-1 lg:hidden" />
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${active.id}`}
        className="border-2 border-ink bg-paper-raised p-4 lg:mt-6 lg:w-5/12"
      >
        <p>{active.blurb}</p>
        <Link href={`/garage?style=${active.id}`} aria-label={`Mulai rakit dari preset ${active.name}`} className="btn-primary mt-4">
          Mulai rakit
        </Link>
      </div>
    </div>
  );
}

/** 3.5 Gudang part: sections, then one group's options and which aliran start with each (derived from presets). */
function Gudang({ group, onGroup }: { group: GroupId; onGroup: (g: GroupId) => void }) {
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const g = GROUPS.find((x) => x.id === group) ?? GROUPS[0];
  const section = g.section;
  const sectionIds = SECTIONS.map((x) => x.id);
  const inSection = GROUPS.filter((x) => x.section === section);
  const openSection = (sid: SectionId) => onGroup(GROUPS.find((x) => x.section === sid)!.id);

  // M18: the new group's options are set down one after another, so the swap reads as a new shelf
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".gudang-card", { y: 14, autoAlpha: 0, duration: 0.35, ease: "power3.out", stagger: 0.04 });
      });
    },
    { scope: panel, dependencies: [group], revertOnUpdate: true },
  );

  return (
    <div className="lg:w-[40%]">
      <h2 id="gudang-h" className="t-h2">
        Isi gudang part.
      </h2>
      <p className="t-body-lg mt-3 max-w-[46ch]">
        Semua yang bisa kamu pasang di garasi, per grup. Tiap pilihan ditandai aliran mana yang memakainya dari awal.
      </p>
      <div ref={list} role="tablist" aria-label="Bagian motor" className="mt-6 flex flex-wrap gap-2">
        {SECTIONS.map((x, i) => (
          <button
            key={x.id}
            id={`${id}-${x.id}`}
            type="button"
            role="tab"
            aria-selected={section === x.id}
            aria-controls={`${id}-panel`}
            tabIndex={section === x.id ? 0 : -1}
            onClick={() => openSection(x.id)}
            onKeyDown={(e) => tabKey(e, i, sectionIds, openSection, list.current)}
            className="chip"
          >
            {x.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${section}`} className="mt-6 border-2 border-ink bg-paper-raised">
        <div role="group" aria-label="Grup part" className="flex flex-wrap gap-2 border-b border-ink p-3">
          {inSection.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === g.id} onClick={() => onGroup(x.id)} className="btn-tool gap-2">
              <span className="t-label">{x.no}</span>
              {x.heading.split(" (")[0]}
            </button>
          ))}
        </div>
        <div ref={panel} className="flex flex-col gap-5 p-4">
          {g.keys.map((k) => (
            <div key={k}>
              <h3 className="t-label mb-2 text-ink-muted">
                {g.no} {g.keys.length > 1 ? PART_KEY_LABEL[k] : g.label}
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {optionList(k).map((o) => {
                  const users = presetsUsing(k, o.id);
                  return (
                    <li key={o.id} className="gudang-card border border-line-strong bg-paper p-3">
                      <div className="font-display text-xl leading-tight font-semibold">{o.name}</div>
                      <div className="t-label mt-2 text-ink-muted">Part awal aliran</div>
                      <p className="mt-0.5 text-sm">{users.length ? users.join(", ") : "Belum ada. Pasang sendiri di garasi."}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
