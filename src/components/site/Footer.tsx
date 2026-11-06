import { Mark } from "./Symbols";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-ink bg-paper">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-gutter py-6 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex items-center gap-2 font-semibold">
          <Mark className="size-6" />
          Just a custom
        </span>
        <p className="text-sm text-ink-muted">
          Gambar di sini bukan gambar kerja. Ukuran asli tetap urusan bengkelmu.
        </p>
      </div>
    </footer>
  );
}
