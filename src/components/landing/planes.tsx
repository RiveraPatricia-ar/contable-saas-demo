import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatARS } from "@/lib/utils";

/** Editar precios y prestaciones con los del estudio. */
const PLANES = [
  {
    nombre: "Monotributo",
    precio: 45_000,
    descripcion: "Para quienes facturan como monotributistas y quieren olvidarse del trámite.",
    features: [
      "Categorización y recategorización semestral",
      "Control de parámetros y topes de facturación",
      "Emisión de facturas y constancias",
      "Portal de clientes con VEPs y documentos",
      "Consultas por chat con el contador asignado",
    ],
    destacado: false,
  },
  {
    nombre: "Responsable Inscripto",
    precio: 120_000,
    descripcion: "IVA mensual, Libro IVA Digital e Ingresos Brutos, presentados en término.",
    features: [
      "Todo lo del plan Monotributo",
      "DDJJ de IVA mensual y Libro IVA Digital",
      "Ingresos Brutos local o Convenio Multilateral",
      "Control de retenciones y percepciones",
      "Ganancias y Bienes Personales anual",
      "Calendario de vencimientos por terminación de CUIT",
    ],
    destacado: true,
  },
  {
    nombre: "PyME con empleados",
    precio: 260_000,
    descripcion: "Para empresas con personal en relación de dependencia.",
    features: [
      "Todo lo del plan Responsable Inscripto",
      "Liquidación de sueldos y recibos",
      "F.931 de cargas sociales",
      "Altas, bajas y modificaciones en Simplificación Registral",
      "Balance anual y certificaciones de ingresos",
      "Reunión mensual de seguimiento",
    ],
    destacado: false,
  },
];

export function Planes() {
  return (
    <section id="planes" className="border-b py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Planes mensuales, sin letra chica
          </h2>
          <p className="mt-4 text-muted-foreground">
            Honorarios fijos en pesos. Sin costo de alta y sin permanencia
            mínima.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANES.map((plan) => (
            <Card
              key={plan.nombre}
              className={cn(
                "relative flex flex-col",
                plan.destacado && "border-primary shadow-lg lg:scale-[1.03]"
              )}
            >
              {plan.destacado && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Más elegido
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.nombre}</CardTitle>
                <CardDescription>{plan.descripcion}</CardDescription>
                <p className="pt-4">
                  <span className="text-3xl font-bold tabular-nums">
                    {formatARS(plan.precio)}
                  </span>
                  <span className="text-sm text-muted-foreground"> / mes + IVA</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-7 w-full"
                  variant={plan.destacado ? "default" : "outline"}
                  asChild
                >
                  <a href="#contacto">Quiero este plan</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Los honorarios se ajustan según el volumen de comprobantes y la
          cantidad de jurisdicciones. Te pasamos una propuesta cerrada después
          de la primera reunión.
        </p>
      </div>
    </section>
  );
}
