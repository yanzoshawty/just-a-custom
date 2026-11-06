"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

type Props<T extends string> = {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  labelledBy: string;
  className?: string;
  render: (v: T, checked: boolean) => { label?: string; content: ReactNode; className?: string; style?: React.CSSProperties };
};

/** WAI-ARIA radio group with roving tabindex: one tab stop, arrows move and select (UX-SPEC 7.1). */
export function RadioGroup<T extends string>({ options, value, onChange, labelledBy, className = "", render }: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  const current = value && options.includes(value) ? value : null;

  function onKey(e: KeyboardEvent, i: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let n: number | null = null;
    if (e.key in keys) n = (i + keys[e.key] + options.length) % options.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = options.length - 1;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(options[i]);
      return;
    }
    if (n === null) return;
    e.preventDefault();
    onChange(options[n]);
    root.current?.querySelectorAll<HTMLElement>("[role=radio]")[n]?.focus();
  }

  return (
    <div ref={root} role="radiogroup" aria-labelledby={labelledBy} className={className}>
      {options.map((o, i) => {
        const checked = o === current;
        const r = render(o, checked);
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={r.label}
            tabIndex={checked || (current === null && i === 0) ? 0 : -1}
            onClick={() => onChange(o)}
            onKeyDown={(e) => onKey(e, i)}
            className={r.className ?? "chip"}
            style={r.style}
          >
            {r.content}
          </button>
        );
      })}
    </div>
  );
}
