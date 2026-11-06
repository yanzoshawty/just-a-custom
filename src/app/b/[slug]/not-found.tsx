import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SheetMessage } from "@/components/site/SheetMessage";

export default function BuildNotFound() {
  return (
    <>
      <Header page="build" skipLabel="Langsung ke isi" skipTarget="isi" />
      <main id="isi" tabIndex={-1} className="flex-1">
        <SheetMessage
          title="Build nggak ketemu"
          body="Link-nya mungkin salah ketik atau kepotong. Coba cek lagi ke yang ngirim."
        />
      </main>
      <Footer />
    </>
  );
}
