import Link from "next/link";
import type { ReactNode } from "react";
import { DeltaSymbol } from "./Symbols";

/** State pages (UX-SPEC 6.6 to 6.9) drawn as a title block, so even errors stay on the drawing sheet. */
export function SheetMessage({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1080px] px-gutter py-16 md:py-24">
      <div className="border-2 border-ink bg-paper-raised">
        <div className="border-b border-ink p-4 sm:p-6">
          <div className="t-label text-ink-muted">Judul</div>
          <h1 className={`mt-2 ${title.length > 40 ? "t-h3" : "t-h2"}`}>{title}</h1>
          {body && <p className="t-body-lg mt-3 max-w-[65ch]">{body}</p>}
        </div>
        <div className="grid sm:grid-cols-[auto_1fr]">
          <div className="border-b border-ink p-4 sm:border-r sm:border-b-0">
            <div className="t-label text-ink-muted">Revisi</div>
            <DeltaSymbol className="mt-1 size-5" />
            <span className="sr-only">revisi</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 p-4">
            {action ?? (
              <Link href="/garage" className="btn-primary">
                Mulai rakit
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
