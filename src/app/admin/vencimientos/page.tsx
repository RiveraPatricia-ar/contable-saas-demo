import { CalendarDays, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCUIT, formatFecha, diasHasta } from "@/lib/utils";
import type { ClienteEstudio, VencimientoCalendario } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function VencimientosPage({
  searchParams,
}: {
  searchParams: { terminacion?: string };
}) {
  const supabase = createClient();
  const terminacion = searchParams.terminacion;

  const [calRes, clientesRes] = await Promise.all([
    supabase
      .from("calendario_fiscal")
      .select("*")
      .gte("fecha_vencimiento", new Date().toISOString().slice(0, 10))
      .order("fecha_vencimiento", { ascending: true }),
    supabase
      .from("clientes_estudio")
      .select("id, razon_social, cuit, condicion_iva")
      .eq("estado_activo", true),
  ]);

  const calendario = (calRes.data ?? []) as VencimientoCalendario[];
  const clientes = (clientesRes.data ?? []) as Partial<ClienteEstudio>[];

  const filtrado = terminacion
    ? calendario.filter(
        (v) =>
          v.terminacion_cuit === null ||
          v.terminacion_cuit === Number(terminacion)
      )
    : calendario;

  const clientesPorTerminacion = clientes.reduce<Record<string, number>>(
    (acc, c) => {
      const t = (c.cuit ?? "").slice(-1);
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Calendario fiscal
          </CardTitle>
          <CardDescription>
            Filtrá por terminación de CUIT para ver qué le vence a cada grupo
            de clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/vencimientos"
              className={`rounded-lg border px-3 py-2 text-sm ${
                !terminacion ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              Todas
            </a>
            {Array.from({ length: 10 }, (_, i) => i).map((t) => (
              <a
                key={t}
                href={`/admin/vencimientos?terminacion=${t}`}
                className={`rounded-lg border px-3 py-2 text-sm tabular-nums ${
                  terminacion === String(t)
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                …{t}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({clientesPorTerminacion[String(t)] ?? 0})
                </span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Próximos vencimientos
            {terminacion && ` — CUIT terminados en ${terminacion}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filtrado.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No hay vencimientos cargados en el calendario. Se cargan en la
              tabla <code>calendario_fiscal</code>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Organismo</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Terminación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrado.map((v) => {
                  const dias = diasHasta(v.fecha_vencimiento);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatFecha(v.fecha_vencimiento)}
                        {dias <= 7 && (
                          <Badge
                            variant={dias <= 2 ? "destructive" : "warning"}
                            className="ml-2"
                          >
                            en {dias} d
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{v.organismo}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{v.impuesto_tipo}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {v.periodo_fiscal}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {v.terminacion_cuit === null
                          ? "Todas"
                          : `…${v.terminacion_cuit}`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 rounded-lg border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          El calendario se carga con los cronogramas oficiales de ARCA/AFIP y de
          cada jurisdicción (ARBA, AGIP, Comisión Arbitral), que se publican por
          resolución general y cambian todos los años. Las filas que trae el
          seed son una plantilla de ejemplo: hay que reemplazarlas por las
          fechas oficiales vigentes antes de operar con ellas.
        </span>
      </p>
    </div>
  );
}
