import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Servicios } from "@/components/landing/servicios";
import { Simulador } from "@/components/landing/simulador";
import { Planes } from "@/components/landing/planes";
import { Contacto } from "@/components/landing/contacto";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main>
        <Hero />
        <Servicios />
        <Simulador />
        <Planes />
        <Contacto />
      </main>
      <Footer />
    </div>
  );
}
