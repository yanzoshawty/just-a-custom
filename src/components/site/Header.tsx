import Link from "next/link";
import type { ReactNode } from "react";
import { Mark, Wordmark } from "./Symbols";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  page: "landing" | "garage" | "build";
  skipLabel: string;
  skipTarget: string;
  action?: ReactNode;
};

export function Header({ page, skipLabel, skipTarget, action }: Props) {
  const sticky = page !== "landing";
  return (
    <>
      <a href={`#${skipTarget}`} className="skip-link">
        {skipLabel}
      </a>
      <header
        className={`${sticky ? "sticky top-0" : "relative"} z-20 h-14 border-b border-ink bg-paper md:h-16`}
      >
        <div className="mx-auto flex h-full max-w-[1320px] items-center justify-between gap-3 px-gutter">
          <Link href="/" aria-label="Just a custom, ke beranda" className="-ml-1.5 flex min-h-11 items-center px-1.5">
            <Wordmark className="hidden h-8 w-auto sm:block" />
            <Mark className="size-8 sm:hidden" />
          </Link>
          <nav aria-label="Utama" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/garage"
              aria-current={page === "garage" ? "page" : undefined}
              className={`flex min-h-11 items-center px-2 font-semibold underline-offset-[6px] hover:underline ${
                page === "garage" ? "underline decoration-2" : ""
              }`}
            >
              Garasi
            </Link>
            <ThemeToggle />
            {action}
          </nav>
        </div>
      </header>
    </>
  );
}
