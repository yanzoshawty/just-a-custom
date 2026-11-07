"use client";

import { useId, useState } from "react";
import { PART_OPTIONS, type BuildConfig, type PartKey } from "@/lib/build-schema";
import {
  BASE_NAMES,
  BASE_NOTES,
  BASES,
  FINISH_NAMES,
  FINISHES,
  GROUPS,
  HEX_RE,
  OPTION_NAMES,
  PART_KEY_LABEL,
  SECTIONS,
  STYLE_BLURB,
  STYLE_NAMES,
  STYLES,
  SWATCHES,
  clashesFor,
  partLabel,
  swatchName,
  type Base,
  type Finish,
  type GroupId,
  type SectionId,
  type Style,
} from "@/lib/catalog";
import { RadioGroup } from "@/components/ui/RadioGroup";

type PartsProps = {
  config: BuildConfig;
  onStyle: (s: Style) => void;
  /** Basis motor picker; hidden when the host does not handle it. */
  onBase?: (b: Base) => void;
  onPart: (k: PartKey, v: string) => void;
  onActive: (g: GroupId) => void;
  /** The group whose section starts expanded. */
  open: GroupId;
  onOpen: (g: GroupId) => void;
};

const sectionOf = (g: GroupId) => GROUPS.find((x) => x.id === g)!.section;

export function PartsPanel({ config, onStyle, onBase, onPart, onActive, open, onOpen }: PartsProps) {
  const id = useId();
  const [expanded, setExpanded] = useState<Set<SectionId>>(() => new Set([sectionOf(open)]));
  const clashes = clashesFor(config);
  const clashSet = new Set(clashes.map((c) => `${c.key}:${c.id}`));
  const toggle = (sec: SectionId) => {
    const next = new Set(expanded);
    if (next.has(sec)) next.delete(sec);
    else {
      next.add(sec);
      onOpen(GROUPS.find((x) => x.section === sec)!.id);
    }
    setExpanded(next);
  };

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={`${id}-aliran`} data-tour="style">
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
        <p className="mt-3 text-sm text-ink-muted">{STYLE_BLURB[config.style]}</p>
      </section>

      {onBase && (
        <section aria-labelledby={`${id}-basis`} data-tour="base">
          <h3 id={`${id}-basis`} className="t-h3 mb-3">
            Basis motor
          </h3>
          <RadioGroup
            options={BASES}
            value={config.base}
            onChange={onBase}
            labelledBy={`${id}-basis`}
            className="flex flex-wrap gap-2"
            render={(b) => ({ content: BASE_NAMES[b] })}
          />
          <p className="mt-3 text-sm text-ink-muted">{BASE_NOTES[config.base]}</p>
        </section>
      )}

      {/* soft style rule (report "do not include" lists): warns, never blocks, so hybrids stay possible */}
      <p role="status" aria-live="polite" className={clashes.length ? "border-2 border-ink bg-paper-raised p-3 text-sm" : "sr-only"}>
        {clashes.length > 0 &&
          `Keluar pakem ${STYLE_NAMES[config.style]}: ${clashes
            .map((c) => (c.key === "finish" ? `cat ${FINISH_NAMES[config.paint.finish]}` : `${PART_KEY_LABEL[c.key]} ${OPTION_NAMES[c.id]}`))
            .join(", ")}. Boleh, asal disengaja.`}
      </p>

      <div className="flex flex-col border-t border-ink">
        {SECTIONS.map((sec) => {
          const isOpen = expanded.has(sec.id);
          const groups = GROUPS.filter((g) => g.section === sec.id);
          const bodyId = `${id}-${sec.id}-body`;
          return (
            <section key={sec.id} aria-labelledby={`${id}-${sec.id}`} className="border-b border-ink">
              <h3 id={`${id}-${sec.id}`}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={bodyId}
                  onClick={() => toggle(sec.id)}
                  className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
                >
                  <span className="t-h3 flex-1">{sec.label}</span>
                  <span className="text-sm text-ink-muted">{groups.reduce((n, g) => n + g.keys.length, 0)} part</span>
                  <span aria-hidden="true" className="t-data w-4 text-center">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
              </h3>
              <div id={bodyId} hidden={!isOpen} className="flex flex-col gap-6 pt-2 pb-6">
                {groups.map((g) => {
                  const headId = `${id}-${g.id}`;
                  const current = g.keys.map((k) => OPTION_NAMES[config.parts[k]]).join(", ");
                  return (
                    <div key={g.id} role="group" aria-labelledby={headId} onFocus={() => onActive(g.id)} onPointerEnter={() => onActive(g.id)}>
                      <div className="mb-3 flex items-baseline gap-3">
                        <span className="t-label text-ink-muted">{g.no}</span>
                        <h4 id={headId} className="flex-1 font-semibold">
                          {g.heading}
                        </h4>
                        <span className="text-right text-sm text-ink-muted">{current}</span>
                      </div>
                      {g.keys.length === 1 ? (
                        <OptionChips k={g.keys[0]} value={config.parts[g.keys[0]]} onPart={onPart} labelledBy={headId} clash={clashSet} />
                      ) : (
                        <div className="flex flex-col gap-4">
                          {g.keys.map((k) => (
                            <div key={k}>
                              <div id={`${headId}-${k}`} className="mb-2 text-sm font-medium">
                                {partLabel(g, k)}
                              </div>
                              <OptionChips k={k} value={config.parts[k]} onPart={onPart} labelledBy={`${headId}-${k}`} clash={clashSet} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OptionChips({
  k,
  value,
  onPart,
  labelledBy,
  clash,
}: {
  k: PartKey;
  value: string;
  onPart: PartsProps["onPart"];
  labelledBy: string;
  clash: Set<string>;
}) {
  return (
    <RadioGroup
      options={PART_OPTIONS[k] as readonly string[]}
      value={value}
      onChange={(v) => onPart(k, v)}
      labelledBy={labelledBy}
      className="flex flex-wrap gap-2"
      render={(v) => {
        const off = clash.has(`${k}:${v}`);
        // dashed border marks the picked option that breaks the style's rule
        return { content: OPTION_NAMES[v], label: off ? `${OPTION_NAMES[v]}, keluar pakem aliran` : undefined, className: off ? "chip border-dashed" : "chip" };
      }}
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
          options={FINISHES}
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
