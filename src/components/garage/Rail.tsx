"use client";

import { useId, useState } from "react";
import { PART_OPTIONS, type BuildConfig, type PartKey } from "@/lib/build-schema";
import {
  FINISH_NAMES,
  GROUPS,
  HEX_RE,
  OPTION_NAMES,
  STYLE_NAMES,
  STYLES,
  SWATCHES,
  swatchName,
  type Finish,
  type GroupId,
  type Style,
} from "@/lib/catalog";
import { RadioGroup } from "@/components/ui/RadioGroup";

type PartsProps = {
  config: BuildConfig;
  onStyle: (s: Style) => void;
  onPart: (k: PartKey, v: string) => void;
  onActive: (g: GroupId) => void;
  open: GroupId;
  onOpen: (g: GroupId) => void;
};

export function PartsPanel({ config, onStyle, onPart, onActive, open, onOpen }: PartsProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={`${id}-aliran`}>
        <h3 id={`${id}-aliran`} className="t-h3 mb-3">
          Aliran
        </h3>
        <RadioGroup
          options={STYLES}
          value={config.style}
          onChange={onStyle}
          labelledBy={`${id}-aliran`}
          className="grid grid-cols-2 gap-2"
          render={(s) => ({ content: STYLE_NAMES[s] })}
        />
      </section>

      <div className="flex flex-col gap-8 max-sm:gap-0 max-sm:border-t max-sm:border-ink">
        {GROUPS.map((g) => {
          const expanded = open === g.id;
          const current = g.keys.map((k) => OPTION_NAMES[config.parts[k]]).join(", ");
          const headId = `${id}-${g.id}`;
          const bodyId = `${id}-${g.id}-body`;
          return (
            <section
              key={g.id}
              aria-labelledby={headId}
              onFocus={() => onActive(g.id)}
              onPointerEnter={() => onActive(g.id)}
              className="max-sm:border-b max-sm:border-ink"
            >
              {/* phone: accordion header; wider: plain heading row */}
              <h3 className="sm:hidden">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={bodyId}
                  onClick={() => {
                    onOpen(g.id);
                    onActive(g.id);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
                >
                  <span className="t-label text-ink-muted">{g.no}</span>
                  <span className="t-h3 flex-1">{g.heading}</span>
                  <span className="text-sm text-ink-muted">{current}</span>
                  <span aria-hidden="true" className="t-data w-4 text-center">
                    {expanded ? "−" : "+"}
                  </span>
                </button>
              </h3>
              <div className="mb-3 hidden items-baseline gap-3 sm:flex">
                <span className="t-label text-ink-muted">{g.no}</span>
                <h3 id={headId} className="t-h3 flex-1">
                  {g.heading}
                </h3>
                <span className="text-right text-sm text-ink-muted">{current}</span>
              </div>
              <div id={bodyId} className={`${expanded ? "" : "max-sm:hidden"} max-sm:pb-4`}>
                {g.keys.length === 1 ? (
                  <OptionChips k={g.keys[0]} value={config.parts[g.keys[0]]} onPart={onPart} labelledBy={headId} />
                ) : (
                  <div className="flex flex-col gap-4">
                    {g.keys.map((k) => (
                      <div key={k}>
                        <div id={`${headId}-${k}`} className="mb-2 text-sm font-medium">
                          {k === "wheels" ? "Pelek" : "Ban"}
                        </div>
                        <OptionChips k={k} value={config.parts[k]} onPart={onPart} labelledBy={`${headId}-${k}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OptionChips({ k, value, onPart, labelledBy }: { k: PartKey; value: string; onPart: PartsProps["onPart"]; labelledBy: string }) {
  return (
    <RadioGroup
      options={PART_OPTIONS[k] as readonly string[]}
      value={value}
      onChange={(v) => onPart(k, v)}
      labelledBy={labelledBy}
      className="flex flex-wrap gap-2"
      render={(v) => ({ content: OPTION_NAMES[v] })}
    />
  );
}

/* ---------------- paint ---------------- */

type PaintKey = "tank" | "frame" | "accent";
const PAINT_GROUPS: { key: PaintKey; label: string }[] = [
  { key: "tank", label: "Tangki" },
  { key: "frame", label: "Rangka" },
  { key: "accent", label: "Aksen" },
];

export function PaintPanel({
  paint,
  onPaint,
  onFinish,
}: {
  paint: BuildConfig["paint"];
  onPaint: (k: PaintKey, hex: string) => void;
  onFinish: (f: Finish) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-8">
      {PAINT_GROUPS.map((g) => (
        <SwatchGroup key={g.key} label={g.label} hex={paint[g.key]} onChange={(hex) => onPaint(g.key, hex)} />
      ))}
      <section aria-labelledby={`${id}-finish`}>
        <h3 id={`${id}-finish`} className="t-h3 mb-3">
          Finish
        </h3>
        <RadioGroup
          options={["gloss", "matte", "metal"] as const}
          value={paint.finish}
          onChange={onFinish}
          labelledBy={`${id}-finish`}
          className="flex flex-wrap gap-2"
          render={(f) => ({ content: FINISH_NAMES[f] })}
        />
      </section>
    </div>
  );
}

function SwatchGroup({ label, hex, onChange }: { label: string; hex: string; onChange: (hex: string) => void }) {
  const id = useId();
  const match = SWATCHES.find((s) => s.hex.toLowerCase() === hex.toLowerCase());
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const shownText = text || (match ? "" : hex.toUpperCase());

  function commit(v: string) {
    const t = v.trim();
    if (!t) return;
    const withHash = t.startsWith("#") ? t : `#${t}`;
    if (HEX_RE.test(withHash)) {
      setError(false);
      setText("");
      onChange(withHash.toUpperCase());
    } else setError(true); // previous color stays applied (UX-SPEC 6.12)
  }

  return (
    <section aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="t-h3 mb-3">
        {label}
      </h3>
      <RadioGroup
        options={SWATCHES.map((s) => s.hex)}
        value={match?.hex ?? null}
        onChange={(v) => {
          setError(false);
          setText("");
          onChange(v);
        }}
        labelledBy={`${id}-h`}
        className="grid w-fit grid-cols-[repeat(4,44px)] gap-2"
        render={(v, checked) => {
          const s = SWATCHES.find((x) => x.hex === v)!;
          return {
            label: `${s.name}, ${s.hex}`,
            content: null,
            className: `size-11 cursor-pointer ${
              checked ? "border-2 border-ink outline-2 -outline-offset-[6px] outline-paper-raised" : "border border-line-strong"
            }`,
            style: { background: s.hex },
          };
        }}
      />
      <p className="mt-2 text-sm">
        <span className="font-medium">{swatchName(hex)}</span> <span className="t-data text-ink-muted">{hex.toUpperCase()}</span>
      </p>
      <div className="mt-3">
        <label htmlFor={`${id}-hex`} className="mb-1 block text-sm font-medium">
          Warna lain
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            aria-label={`Pilih warna lain untuk ${label.toLowerCase()}`}
            value={hex.toLowerCase()}
            onChange={(e) => {
              setError(false);
              setText("");
              onChange(e.target.value.toUpperCase());
            }}
            className="h-12 w-12 shrink-0 cursor-pointer border border-line-strong bg-paper-raised p-1"
          />
          <input
            id={`${id}-hex`}
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={7}
            placeholder="#RRGGBB"
            value={shownText}
            aria-invalid={error}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(e.currentTarget.value);
              }
            }}
            className="field t-data uppercase"
          />
        </div>
        {error && (
          <p id={`${id}-err`} className="mt-1 text-sm text-accent">
            Format warna harus #RRGGBB, contoh #8A1F17.
          </p>
        )}
      </div>
    </section>
  );
}
