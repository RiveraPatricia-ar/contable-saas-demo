import { AlertTriangle, ArrowUpDown, CalendarClock, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { FilaRecategorizacion, type FilaRecat } from "./fila";
import {
  MESES_RECATEGORIZACION,
  UMBRAL_AVISO_TOPE,
  VIGENCIA_DECLARADA,
  diagnosticarRecategorizacion,
  esMesDeRecategorizacion,
} from "@/lib/parametros-fiscales";

export const dynamic = "force-dynamic";

const NOMBRE_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Prioridad de aparición: primero lo que hay que resolver. */
const ORDEN: Record<string, number> = {
  EXCEDE_MONOTRIBUTO: 0,
  DEBE_SUBIR: 1,
  CERCA_DEL_TOPE: 2,
  PUEDE_BAJAR: 3,
  OK: 4,
  SIN_DATOS: 5,
};

export default async function RecategorizacionPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("recategorizacion_pendiente")
    .select("*")
    .order("razon_social");

  const filas: FilaRecat[] = ((data ?? []) as Omit<FilaRecat, "diagnostico">[])
    .map((f) => ({
      ...f,
      ventas_12m: Number(f.ventas_12m ?? 0),
      ingresos_considerados: Number(f.ingresos_considerados ?? 0),
      diagnostico: diagnosticarRecategorizacion(
        Number(f.ingresos_considerados ?? 0),
        f.categoria_monotributo
      ),
    }))
    .sort(
      (a, b) =>
        (ORDEN[a.diagnostico.estado] ?? 9) - (ORDEN[b.diagnostico.estado] ?? 9)
    );

  const debenSubir = filas.filter((f) => f.diagnostico.estado === "DEBE_SUBIR");
  const cerca = filas.filter((f) => f.diagnostico.estado === "CERCA_DEL_TOPE");
  const exceden = filas.filter(
    (f) => f.diagnostico.estado === "EXCEDE_MONOTRIBUTO"
  );
  const puedenBajar = filas.filter(
    (f) => f.diagnostico.estado === "PUEDE_BAJAR"
  );

  const esMes = esMesDeRecategorizacion();
  const meses = MESES_RECATEGORIZACION.map((m) => NOMBRE_MES[m - 1]).join(" y ");

  return (
    <div className="space-y-5">
      {esMes ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium">
              Este mes toca recategorizar.
            </p>
            <p className="text-sm text-muted-foreground">
              Revisá los {debenSubir.length + puedenBajar.length} clientes con
              cambio sugerido antes de que cierre el plazo.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Deben subir de categoría"
          valor={String(debenSubir.length)}
          detalle="Se pasaron del tope"
          icon={TrendingUp}
          tono={debenSubir.length > 0 ? "critico" : "positivo"}
        />
        <StatCard
          label="Cerca del tope"
          valor={String(cerca.length)}
          detalle={`Más del ${Math.round(UMBRAL_AVISO_TOPE * 100)}% consumido`}
          icon={AlertTriangle}
          tono={cerca.length > 0 ? "alerta" : "positivo"}
        />
        <StatCard
          label="Pueden bajar"
          valor={String(puedenBajar.length)}
          detalle="Facturaron menos que su categoría"
          icon={ArrowUpDown}
        />
        <StatCard
          label="Exceden el monotributo"
          valor={String(exceden.length)}
          detalle="Se pasaron de la categoría K"
          icon={AlertTriangle}
          tono={exceden.length > 0 ? "critico" : "neutro"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Monotributistas — últimos 12 meses
          </CardTitle>
          <CardDescription>
            Los ingresos salen de los comprobantes de venta cargados. Si un
            cliente factura fuera del sistema, escribí el monto a mano y manda
            ese. La recategorización se hace en {meses}. {VIGENCIA_DECLARADA}.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filas.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No hay monotributistas activos cargados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Ingresos 12 meses</TableHead>
                  <TableHead className="text-center">Actual</TableHead>
                  <TableHead className="text-center">Sugerida</TableHead>
                  <TableHead>Situación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <FilaRecategorizacion key={f.id} fila={f} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
