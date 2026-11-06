import type { Metadata } from "next";
import { GarageApp } from "@/components/garage/GarageApp";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = { title: "Garasi | Just a custom" };

export default function GaragePage() {
  return (
    <>
      <GarageApp />
      <Footer />
    </>
  );
}
