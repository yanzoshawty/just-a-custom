import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SheetMessage } from "@/components/site/SheetMessage";

export default function NotFound() {
  return (
    <>
      <Header page="build" skipLabel="Langsung ke isi" skipTarget="isi" />
      <main id="isi" tabIndex={-1} className="flex-1">
        <SheetMessage title="Halaman ini nggak ada di meja gambar." />
      </main>
      <Footer />
    </>
  );
}
