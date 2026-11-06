// Drafting symbols from DESIGN.md 6 and the brand files. Notation, not an icon set.
type P = { className?: string };
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;

export const CloseSymbol = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M6 6 18 18M18 6 6 18" />
  </svg>
);

export const DeltaSymbol = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 4 21 20H3Z" strokeLinejoin="round" />
  </svg>
);

export const CenterMark = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 5v14M5 12h14" />
    <circle cx="12" cy="12" r="7" />
  </svg>
);

/** Inline copy of public/brand/logo.svg so currentColor follows --ink. */
export const Wordmark = ({ className }: P) => (
  <svg viewBox="-3 3 216 44" className={className} aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6V24A6 6 0 0 1 0 24" />
      <path transform="translate(18 0)" d="M0 6V24A6 6 0 0 0 12 24V6" />
      <path transform="translate(36 0)" d="M11.2 9A6 6 0 1 0 6 18A6 6 0 1 1 0.8 27" />
      <path transform="translate(54 0)" d="M0 6H12M6 6V30" />
      <path className="jac-rev" transform="translate(80 0)" d="M0 30L6 6L12 30Z" />
      <path transform="translate(106 0)" d="M12 12A6 6 0 0 0 0 12V24A6 6 0 0 0 12 24" />
      <path transform="translate(124 0)" d="M0 6V24A6 6 0 0 0 12 24V6" />
      <path transform="translate(142 0)" d="M11.2 9A6 6 0 1 0 6 18A6 6 0 1 1 0.8 27" />
      <path transform="translate(160 0)" d="M0 6H12M6 6V30" />
      <path transform="translate(178 0)" d="M0 12A6 6 0 0 1 12 12V24A6 6 0 0 1 0 24Z" />
      <path transform="translate(196 0)" d="M0 30V6L7 20L14 6V30" />
    </g>
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M0 35V45M210 35V45M7 41H203" />
    </g>
    <path fill="currentColor" d="M0 41L7 38.5V43.5ZM210 41L203 38.5V43.5Z" />
  </svg>
);

/** Inline copy of public/brand/mark.svg. */
export const Mark = ({ className }: P) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="8" cy="22" r="6" strokeWidth="2" />
      <circle cx="24" cy="22" r="6" strokeWidth="2" />
      <path strokeWidth="1.5" d="M6.5 22H9.5M8 20.5V23.5M22.5 22H25.5M24 20.5V23.5" />
      <path strokeWidth="1.5" d="M8 4V13M24 4V13M11 8H21" />
    </g>
    <path fill="currentColor" d="M8 8L11.5 6V10ZM24 8L20.5 6V10Z" />
  </svg>
);
