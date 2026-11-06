"use client";

import { useEffect } from "react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SheetMessage } from "@/components/site/SheetMessage";

export default function BuildError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <Header page="build" skipLabel="Langsung ke isi" skipTarget="isi" />
      <main id="isi" tabIndex={-1} className="flex-1">
        <SheetMessage
          title="Build belum bisa dimuat. Coba muat ulang halaman ini."
          action={
            <button type="button" className="btn-primary" onClick={() => retry()}>
              Muat ulang
            </button>
          }
        />
      </main>
      <Footer />
    </>
  );
}
