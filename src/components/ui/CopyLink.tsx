"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Salin link" with the UX-SPEC 4.5 feedback: label flips for 2.5s plus a polite announcement.
 * If the Clipboard API fails, the URL text is selected and a manual-copy hint is shown.
 */
export function CopyLink({
  url,
  field,
  className = "btn-primary",
}: {
  url: string;
  /** Existing URL field to select on failure; otherwise one is rendered. */
  field?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const own = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // accepts a path; resolved against the current origin at click time
  const full = () => new URL(url, location.href).href;

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(full());
      setState("done");
      timer.current = setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("failed");
      // field renders on the failed state; select it after paint
      requestAnimationFrame(() => {
        const el = field?.current ?? own.current;
        el?.focus();
        el?.select();
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={className} onClick={copy}>
        {state === "done" ? "Link tersalin" : "Salin link"}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "done" ? "Link tersalin ke clipboard." : ""}
      </span>
      {state === "failed" && (
        <div className="flex flex-col gap-2 bg-paper-raised p-2">
          <p className="text-sm text-ink" role="status">
            Nggak bisa nyalin otomatis. Link sudah ditandai, tekan Ctrl+C atau tahan lalu pilih Salin.
          </p>
          {!field && (
            <input
              ref={own}
              readOnly
              value={full()}
              aria-label="Link build"
              className="field t-data"
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      )}
    </div>
  );
}
