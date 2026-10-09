import {
  Building2,
  FileSpreadsheet,
  Landmark,
  Receipt,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

const SERVICIOS = [
  {
    icon: Receipt,
    titulo: "Gestión de Monotributo",
    detalle:
      "Alta, categorización y recategorización semestral. Controlamos los parámetros de facturación, superficie y energía para que nunca quedes fuera de categoría.",
  },
  {
    icon: FileSpreadsheet,
    titulo: "Responsable Inscripto",
    detalle:
      "Libro IVA Digital de ventas y compras, DDJJ de IVA mensual, control de saldos técnicos y de libre disponibilidad, percepciones y retenciones.",
  },
  {
    icon: Landmark,
    titulo: "Ingresos Brutos",
    detalle:
      "Régimen local en ARBA y AGIP, o Convenio Multilateral con presentación de CM03 y CM05 vía SIFERE. Coeficientes unificados calculados y documentados.",
  },
  {
    icon: Users,
    titulo: "Sueldos y F.931",
    detalle:
      "Liquidación de haberes según la Ley de Contrato de Trabajo y el convenio aplicable, recibos, cargas sociales y presentación del F.931 en término.",
  },
  {
    icon: Building2,
    titulo: "Balances y certificaciones",
    detalle:
      "Estados contables, certificaciones de ingresos para bancos y consulados, y presentaciones societarias ante el organismo de contralor.",
  },
];

export function Servicios() {
  return (
    <section id="servicios" className="border-b py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Todo lo que tu situación fiscal necesita
          </h2>
          <p className="mt-4 text-muted-foreground">
            Un equipo contable que conoce el régimen argentino, con un sistema
            que te muestra en qué estado está cada obligación.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SERVICIOS.map(({ icon: Icon, titulo, detalle }) => (
            <Card key={titulo} className="transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <span className="mb-4 inline-grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <CardTitle className="text-base">{titulo}</CardTitle>
                <CardDescription className="mt-2 leading-relaxed">
                  {detalle}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
