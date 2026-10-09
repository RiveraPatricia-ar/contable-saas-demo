import Link from "next/link";
import { ArrowRight, CalendarCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />

      <div className="container relative py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-float mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Compatible con AFIP, ARBA, AGIP y Convenio Multilateral
          </div>

          <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
            Tus impuestos al día,{" "}
            <span className="text-primary">sin sobresaltos</span> y sin perseguir
            vencimientos
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Gestión contable, liquidación de impuestos (IVA, IIBB, 931) y
            facturación en un solo lugar con la supervisión de contadores
            expertos en Argentina.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/login">
                Iniciar sesión
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#contacto">
                <CalendarCheck className="h-4 w-4" />
                Agendar consulta contable
              </a>
            </Button>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            Portal de clientes incluido: VEPs, acuses y documentación siempre a mano
          </p>
        </div>

        <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-4">
          {[
            ["Monotributo", "Categorización y recategorización semestral"],
            ["Responsable Inscripto", "Libro IVA Digital compras y ventas"],
            ["Ingresos Brutos", "Local y Convenio Multilateral"],
            ["Sueldos", "Liquidación y F.931 de cargas sociales"],
          ].map(([titulo, detalle]) => (
            <div key={titulo} className="bg-card p-5 text-left">
              <dt className="text-sm font-semibold">{titulo}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {detalle}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
