import Link from "next/link";
import { AlertTriangle, CalendarClock, TrendingUp, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/stat-card";
import { EstadoBadge } from "@/components/estado-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatARS, formatCUIT, formatFecha, diasHasta } from "@/lib/utils";
import { ETIQUETAS_IVA } from "@/lib/constants";
import {
  diagnosticarRecategorizacion,
  esMesDeRecategorizacion,
} from "@/lib/parametros-fiscales";
import type { ClienteEstudio, DeclaracionJurada, EstadoTramite } from "@/types/database";

export const dynamic = "force-dynamic";

type DDJJConCliente = DeclaracionJurada & {
  clientes_estudio: Pick<ClienteEstudio, "razon_social" | "cuit"> | null;
};

export default async function AdminDashboard() {
  const supabase = createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const en7dias = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const [clientesRes, proximasRes, vencidasRes, honorariosRes] = await Promise.all([
    supabase
      .from("clientes_estudio")
      .select("id, razon_social, cuit, condicion_iva, estado_activo, honorario_mensual_ars")
      .eq("estado_activo", true),
    supabase
      .from("declaraciones_juradas")
      .select("*, clientes_estudio(razon_social, cuit)")
      .gte("fecha_vencimiento", hoy)
      .lte("fecha_vencimiento", en7dias)
      .order("fecha_vencimiento", { ascending: true })
      .limit(15),
    supabase
      .from("declaraciones_juradas")
      .select("id", { count: "exact", head: true })
      .lt("fecha_vencimiento", hoy)
      .in("estado", ["PENDIENTE", "EN_PROCESO", "ESPERANDO_VEP", "VENCIDO"]),
    supabase.from("honorarios").select("monto_ars, estado"),
  ]);

  // Aviso de recategorización: quiénes se pasaron del tope de su categoría.
  const recatRes = await supabase
    .from("recategorizacion_pendiente")
    .select("id, categoria_monotributo, ingresos_considerados");

  const aRecategorizar = (recatRes.data ?? []).filter((r) => {
    const d = diagnosticarRecategorizacion(
      Number(r.ingresos_considerados ?? 0),
      r.categoria_monotributo
    );
    return (
      d.estado === "DEBE_SUBIR" ||
      d.estado === "EXCEDE_MONOTRIBUTO" ||
      d.estado === "CERCA_DEL_TOPE"
    );
  }).length;

  const clientes = (clientesRes.data ?? []) as Partial<ClienteEstudio>[];
  const proximas = (proximasRes.data ?? []) as DDJJConCliente[];
  const honorarios = honorariosRes.data ?? [];

  const cobrado = honorarios
    .filter((h) => h.estado === "COBRADA")
    .reduce((a, h) => a + Number(h.monto_ars), 0);
  const pendiente = honorarios
    .filter((h) => h.estado === "EMITIDA" || h.estado === "VENCIDA")
    .reduce((a, h) => a + Number(h.monto_ars), 0);

  const porCategoria = clientes.reduce<Record<string, number>>((acc, c) => {
    const k = c.condicion_iva ?? "SIN_DATO";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const errores = [clientesRes, proximasRes, vencidasRes, honorariosRes]
    .map((r) => r.error)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {errores.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex gap-3 pt-6 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">No se pudieron leer algunos datos</p>
              <p className="mt-1 text-muted-foreground">
                Verificá que las migraciones de <code>supabase/migrations</code>{" "}
                estén aplicadas y que las variables de entorno apunten al
                proyecto correcto. Detalle: {errores[0]?.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {aRecategorizar > 0 && (
        <Link
          href="/admin/recategorizacion"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 transition-colors hover:bg-amber-500/15"
        >
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium">
              {aRecategorizar}{" "}
              {aRecategorizar === 1
                ? "monotributista necesita"
                : "monotributistas necesitan"}{" "}
              revisión de categoría
              {esMesDeRecategorizacion() ? " — y este mes toca recategorizar" : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Se pasaron del tope de su categoría o están por hacerlo. Entrá
              para ver el detalle y aplicar el cambio.
            </p>
          </div>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Clientes activos"
          valor={String(clientes.length)}
          detalle={Object.entries(porCategoria)
            .map(([k, v]) => `${v} ${ETIQUETAS_IVA[k] ?? k}`)
            .join(" · ")}
          icon={Users}
        />
        <StatCard
          label="Vencen esta semana"
          valor={String(proximas.length)}
          detalle="Obligaciones con vencimiento en 7 días"
          icon={CalendarClock}
          tono="alerta"
        />
        <StatCard
          label="Vencidas sin resolver"
          valor={String(vencidasRes.count ?? 0)}
          detalle="Requieren atención inmediata"
          icon={AlertTriangle}
          tono={(vencidasRes.count ?? 0) > 0 ? "critico" : "positivo"}
        />
        <StatCard
          label="Honorarios cobrados"
          valor={formatARS(cobrado)}
          detalle={`${formatARS(pendiente)} pendientes de cobro`}
          icon={Wallet}
          tono="positivo"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Próximos vencimientos</CardTitle>
            <CardDescription>
              Obligaciones de los próximos 7 días, ordenadas por fecha.
            </CardDescription>
          </div>
          <Link href="/admin/ddjj" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {proximas.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No hay vencimientos cargados para los próximos 7 días.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proximas.map((d) => {
                  const dias = diasHasta(d.fecha_vencimiento);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <p className="font-medium">
                          {d.clientes_estudio?.razon_social ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCUIT(d.clientes_estudio?.cuit)}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.impuesto_tipo}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {d.organismo}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {d.periodo_fiscal}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatFecha(d.fecha_vencimiento)}
                        <Badge
                          variant={dias <= 2 ? "destructive" : "warning"}
                          className="ml-2"
                        >
                          {dias === 0 ? "hoy" : `en ${dias} d`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatARS(d.monto_vep_ars || d.monto_impuesto_ars)}
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={d.estado as EstadoTramite} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
