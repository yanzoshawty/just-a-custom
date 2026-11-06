import type { Style } from "@/lib/catalog";

// Final copy from docs/UX-SPEC.md 3.2 and 3.3.
export const CAPTIONS = [
  {
    label: "01 RANGKA",
    title: "Semua mulai dari rangka.",
    body: "Rangka nentuin posisi semua part lain. Double cradle buat cafe racer klasik, trellis yang rangkanya sengaja kelihatan, atau hardtail tanpa per belakang buat bobber.",
    options: "Double cradle, Trellis, Hardtail",
  },
  {
    label: "02 TANGKI",
    title: "Tangki bikin siluet.",
    body: "Dari samping, tangki yang paling dulu kelihatan. Teardrop yang membulat, peanut yang ramping, atau flat box ala brat.",
    options: "Teardrop, Peanut, Flat box",
  },
  {
    label: "03 JOK",
    title: "Jok ngatur garis belakang.",
    body: "Cafe hump dengan buntut naik, solo bobber yang duduk di atas per, atau brat flat yang rata sampai ujung.",
    options: "Cafe hump, Solo bobber, Brat flat",
  },
  {
    label: "04 STANG",
    title: "Stang ngatur posisi badan.",
    body: "Clip-on bikin nunduk, drag bar lurus dan rendah, tracker bar lebar buat jalan tanah.",
    options: "Clip-on, Drag bar, Tracker bar",
  },
  {
    label: "05 RODA & BAN",
    title: "Roda dan ban, beda jalan.",
    body: "Pelek jari-jari, racing, atau disc cover. Ban street buat aspal, ban pacul buat yang suka trabas.",
    options: "Jari-jari, Racing (cast), Disc cover. Street, Pacul (knobby)",
  },
  {
    label: "06 KNALPOT",
    title: "Knalpot, lewat mana jalurnya.",
    body: "Low pipe lewat bawah, high pipe scrambler naik di samping jok, atau fishtail yang ujungnya melebar.",
    options: "Low pipe, High pipe scrambler, Fishtail",
  },
  {
    label: "07 MESIN",
    title: "Jantungnya dipasang terakhir.",
    // second sentence holds: frame engine mounts follow the engine width (ENGINE_HALF in parts.tsx)
    body: "Single silinder, parallel twin, atau V-twin. Mesin yang kamu pilih ikut ngubah bentuk rangka di sekitarnya.",
    options: "Single silinder, Parallel twin, V-twin",
  },
] as const;

export const STYLE_COPY: Record<Style, string> = {
  "cafe-racer":
    "Nunduk, ramping, buntut jok naik. Clip-on dan tangki teardrop, dibikin buat ngebut pendek dari satu kafe ke kafe lain.",
  bobber: "Yang nggak perlu dipotong. Hardtail, jok solo di atas per, stang drag, posisi rendah.",
  scrambler: "Knalpot naik ke samping, ban pacul, stang lebar. Siap lewat jalan tanah.",
  brat: "Jok rata panjang, tangki flat box, tampilan bersih tanpa basa-basi.",
};
