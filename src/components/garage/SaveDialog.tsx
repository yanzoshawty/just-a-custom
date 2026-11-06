"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { BuildConfig, SavedBuild } from "@/lib/build-schema";
import { CloseSymbol } from "@/components/site/Symbols";
import { CopyLink } from "@/components/ui/CopyLink";
import { prefersReducedMotion } from "@/three/tokens";

type Failure = "invalid" | "rate" | "backend" | "other";
const FAIL_TEXT: Record<Failure, string> = {
  invalid: "Ada isian yang belum pas.",
  rate: "Terlalu sering menyimpan. Tunggu sebentar, lalu coba lagi.",
  backend: "Simpan belum aktif di server ini, jadi link belum bisa dibuat. Build-mu tetap tersimpan di browser ini.",
  other: "Gagal menyimpan. Koneksi atau server lagi bermasalah. Build-mu masih ada di sini, coba simpan lagi.",
};
const NAME_EMPTY = "Kasih nama dulu, minimal satu huruf.";
const BAD_CHARS = "Ada karakter yang tidak bisa dipakai. Pakai huruf, angka, atau emoji biasa.";

type Props = {
  open: boolean;
  onClose: () => void;
  config: BuildConfig;
  initialName: string;
  onSaved: (name: string) => void;
};

/** Save & share (UX-SPEC 4.5): native modal dialog, so focus is trapped and Escape is handled by the browser. */
export function SaveDialog({ open, onClose, config, initialName, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const [step, setStep] = useState<"form" | "saving" | "done">("form");
  const [name, setName] = useState(initialName);
  const [builder, setBuilder] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [saved, setSaved] = useState<SavedBuild | null>(null);
  const [canShare, setCanShare] = useState(false);

  // Open/close the native dialog with M13 (200ms in / 150ms out); reduced motion: opacity only, 0ms.
  const { contextSafe } = useGSAP(
    () => {
      const d = dialog.current;
      const p = panel.current;
      if (!d || !p || !open || d.open) return;
      const reduce = prefersReducedMotion();
      d.showModal();
      // opacity, not autoAlpha: a visibility:hidden panel would swallow the focus() below
      gsap.fromTo(p, { opacity: 0, visibility: "visible", y: reduce ? 0 : 8 }, { opacity: 1, y: 0, duration: reduce ? 0 : 0.2, ease: "power3.out" });
      nameInput.current?.focus();
    },
    { dependencies: [open], scope: panel },
  );

  // contextSafe is applied at event time, so refs are only read in handlers
  const requestClose = () =>
    contextSafe(() => {
    if (step === "saving") return;
    const d = dialog.current;
    const p = panel.current;
    if (!d || !p) return;
    const reduce = prefersReducedMotion();
    gsap.to(p, {
      autoAlpha: 0,
      y: reduce ? 0 : 8,
      duration: reduce ? 0 : 0.15,
      ease: "power3.out",
      onComplete: () => {
        d.close();
        if (step === "done") {
          setStep("form");
          setSaved(null);
        }
        setFailure(null);
        onClose();
      },
    });
  })();

  function validateName(v: string) {
    const t = v.trim();
    const err = t.length === 0 ? NAME_EMPTY : null;
    setNameError(err);
    return !err;
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (step === "saving") return;
    if (!validateName(name)) {
      nameInput.current?.focus();
      return;
    }
    setFailure(null);
    setBuilderError(null);
    setStep("saving");
    const b = builder.trim();
    try {
      const res = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), ...(b ? { builder: b } : {}), config }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 201) {
        const build = (await res.json()) as SavedBuild;
        setSaved(build);
        setCanShare(typeof navigator.share === "function");
        setStep("done");
        onSaved(name.trim());
        requestAnimationFrame(() => urlInput.current?.focus());
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: string[] };
      if (res.status === 400) {
        const fields = body.fields ?? [];
        if (fields.includes("name")) setNameError(name.trim() ? BAD_CHARS : NAME_EMPTY);
        if (fields.includes("builder")) setBuilderError(b.length > 40 ? "Maksimal 40 huruf." : BAD_CHARS);
        setFailure("invalid");
      } else if (res.status === 429) setFailure("rate");
      else if (res.status === 503 && body.error === "backend_not_configured") setFailure("backend");
      else setFailure("other");
    } catch {
      setFailure("other");
    }
    setStep("form");
  }

  const saving = step === "saving";
  const url = saved ? `${typeof location !== "undefined" ? location.origin : ""}/b/${saved.slug}` : "";
  const retry = failure === "rate" || failure === "other";

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault(); // Escape: animate out instead of an instant close; ignored while saving
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) requestClose(); // backdrop
      }}
      className="m-auto max-h-dvh w-[min(100%-2rem,30rem)] overflow-visible bg-transparent p-0 text-ink backdrop:bg-[var(--scrim)]"
    >
      <div
        ref={panel}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-2 border-ink bg-paper-raised p-5 sm:p-6"
        style={{ boxShadow: "4px 4px 0 0 var(--ink)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={`${id}-title`} className="t-h3">
            {step === "done" ? "Build tersimpan." : "Simpan build"}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            aria-label="Tutup"
            className="-mt-2 -mr-2 inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-2 font-medium disabled:text-ink-muted"
          >
            <CloseSymbol className="size-5" />
            <span className="hidden sm:inline" aria-hidden="true">
              Tutup
            </span>
          </button>
        </div>

        {step !== "done" ? (
          <form onSubmit={submit} noValidate aria-busy={saving}>
            {failure && (
              <div role="alert" className="mb-4 border-2 border-accent bg-paper-raised p-3">
                <div className="t-label text-accent">Gagal</div>
                <p className="mt-1 text-ink">{FAIL_TEXT[failure]}</p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-name`} className="text-sm font-medium">
                Nama build
              </label>
              <input
                ref={nameInput}
                id={`${id}-name`}
                className="field"
                required
                maxLength={60}
                autoComplete="off"
                readOnly={saving}
                value={name}
                aria-invalid={!!nameError}
                aria-describedby={`${id}-count${nameError ? ` ${id}-nerr` : ""}`}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError && e.target.value.trim()) setNameError(null);
                }}
                onBlur={(e) => {
                  if (step === "form") validateName(e.target.value);
                }}
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center" })}
              />
              <div className="flex justify-between gap-3">
                {nameError ? (
                  <p id={`${id}-nerr`} className="text-sm text-accent">
                    {nameError}
                  </p>
                ) : (
                  <span />
                )}
                <span id={`${id}-count`} className="t-data text-ink-muted">
                  {name.length}/60
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <label htmlFor={`${id}-builder`} className="text-sm font-medium">
                Nama builder atau bengkel
              </label>
              <input
                id={`${id}-builder`}
                className="field"
                maxLength={40}
                autoComplete="organization"
                readOnly={saving}
                value={builder}
                aria-invalid={!!builderError}
                aria-describedby={`${id}-bhelp`}
                onChange={(e) => setBuilder(e.target.value)}
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center" })}
              />
              <p id={`${id}-bhelp`} className={`text-sm ${builderError ? "text-accent" : "text-ink-muted"}`}>
                {builderError ?? "Boleh dikosongkan. Muncul di halaman build."}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {failure === "backend" ? (
                <button type="button" className="btn-secondary" onClick={requestClose}>
                  Tutup
                </button>
              ) : (
                <>
                  <button type="submit" className="btn-primary" aria-busy={saving} disabled={saving}>
                    {saving ? "Menyimpan..." : retry ? "Coba lagi" : "Simpan build"}
                  </button>
                  <button type="button" className="btn-secondary" disabled={saving} onClick={requestClose}>
                    Batal
                  </button>
                </>
              )}
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              Tiap simpan bikin link baru. Link lama tetap menampilkan versi lamanya. Siapa pun yang punya link bisa
              melihat build ini.
            </p>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-url`} className="text-sm font-medium">
                Link build
              </label>
              <input
                ref={urlInput}
                id={`${id}-url`}
                readOnly
                value={url}
                className="field t-data"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <CopyLink url={url} field={urlInput} />
              <a href={`/b/${saved?.slug}`} className="btn-secondary">
                Buka halaman build
              </a>
              {canShare && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigator.share({ title: saved?.name, url }).catch(() => {})}
                >
                  Bagikan...
                </button>
              )}
            </div>
            <button type="button" className="btn-secondary self-start" onClick={requestClose}>
              Tutup
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
