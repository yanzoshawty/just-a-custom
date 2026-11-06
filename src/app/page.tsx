import { Landing } from "@/components/landing/Landing";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

export default function Home() {
  return (
    <>
      <Header page="landing" skipLabel="Langsung ke isi" skipTarget="isi" />
      <main id="isi" tabIndex={-1} className="flex-1">
        <Landing />
      </main>
      <Footer />
    </>
  );
}
