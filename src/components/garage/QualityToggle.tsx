"use client";

import { useId } from "react";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { setQualityMode, useQuality, type QualityMode } from "@/three/stage-store";

const MODES: QualityMode[] = ["auto", "high", "low"];
const LABEL: Record<QualityMode, string> = { auto: "Otomatis", high: "Tinggi", low: "Rendah" };

/** Render quality (DESIGN 7.7). The choice persists per viewer in localStorage via setQualityMode. */
export function QualityToggle() {
  const id = useId();
  const { mode } = useQuality();
  return (
    <div className="flex items-center border border-ink bg-paper-raised">
      <span id={id} className="t-label px-2 text-ink-muted">
        Kualitas
      </span>
      <RadioGroup
        options={MODES}
        value={mode}
        onChange={setQualityMode}
        labelledBy={id}
        className="flex"
        render={(m, checked) => ({
          content: LABEL[m],
          // same look as the aria-pressed toolbar toggles (Utuh/Bongkar)
          className: `btn-tool border-0 px-2.5 ${checked ? "bg-ink text-paper" : ""}`,
        })}
      />
    </div>
  );
}
