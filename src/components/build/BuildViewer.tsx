"use client";

import { useState } from "react";
import type { BuildConfig } from "@/lib/build-schema";
import { BikeStage } from "@/components/stage/BikeStage";

export function BuildViewer({ config, name }: { config: BuildConfig; name: string }) {
  const [exploded, setExploded] = useState(false);
  const [painted, setPainted] = useState(false);
  return (
    <BikeStage
      className="grid-paper h-[52dvh] min-h-[300px] border-2 border-ink lg:h-[70dvh]"
      config={config}
      exploded={exploded}
      onExploded={setExploded}
      painted={painted}
      onPainted={setPainted}
      highlight={null}
      failTail="Daftar part di bawah tetap lengkap."
      loaderTitle={name}
    />
  );
}
