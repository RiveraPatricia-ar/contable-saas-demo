import Link from "next/link";
import { CalendarClock, CheckCircle2, FileWarning, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { miClientePrincipal } from "@/lib/portal";
import { EstadoBadge } from "@/components/estado-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatARS, formatCUIT, formatFecha, diasHasta } from "@/lib/utils";
import { ETIQUETAS_IIBB, ETIQUETAS_IVA } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DeclaracionJurada, EstadoTramite } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const cliente = await miClientePrincipal();

  if (!cliente) {
    return (
      <Card>
        <CardContent className="flex gap-3 pt-6 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">Todavía no hay un CUIT vinculado a tu usuario</p>
            <p className="mt-1 text-muted-foreground">
              El estudio tiene que asociar tu cuenta a tu legajo. Escribinos y
              lo resolvemos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("declaraciones_juradas")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("fecha_vencimiento", { ascending: false })
    .limit(20);

  const ddjj = (data ?? []) as DeclaracionJurada[];
  const hoy = new Date().toISOString().slice(0, 10);

  const vencidas = ddjj.filter(
    (d) =>
      d.fecha_vencimiento < hoy &&
      !["PAGADO", "FINALIZADO"].includes(d.estado)
  );
  const proximas = ddjj.filter(
    (d) =>
      d.fecha_vencimiento >= hoy &&
      diasHasta(d.fecha_vencimiento) <= 10 &&
      !["PAGADO", "FINALIZADO"].includes(d.estado)
  );

  const semaforo = vencidas.length > 0 ? "rojo" : proximas.length > 0 ? "amarillo" : "verde";

  const COPY = {
    rojo: {
      titulo: "Tenés obligaciones vencidas",
      detalle: `${vencidas.length} ${vencidas.length === 1 ? "obligación vencida" : "obligaciones vencidas"} sin registrar el pago. Conviene resolverlas cuanto antes.`,
      clase: "border-destructive/30 bg-destructive/5",
      punto: "bg-destructive",
      icon: FileWarning,
    },
    amarillo: {
      titulo: "Tenés vencimientos próximos",
      detalle: `${proximas.length} ${proximas.length === 1 ? "obligación vence" : "obligaciones vencen"} en los próximos 10 días.`,
      clase: "border-amber-500/30 bg-amber-500/5",
      punto: "bg-amber-500",
      icon: CalendarClock,
    },
    verde: {
      titulo: "Estás al día",
      detalle: "No hay obligaciones vencidas ni vencimientos inmediatos registrados.",
      clase: "border-emerald-500/30 bg-emerald-500/5",
      punto: "bg-emerald-500",
      icon: CheckCircle2,
    },
  }[semaforo];

  const Icon = COPY.icon;

  return (
    <div className="space-y-5">
      <Card className={cn("border", COPY.clase)}>
        <CardContent className="flex items-start gap-4 pt-6">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-background">
            <Icon className="h-5 w-5" />
            <span className={cn("absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-background", COPY.punto)} />
          </span>
          <div>
            <p className="font-semibold">{COPY.titulo}</p>
            <p className="mt-1 text-sm text-muted-foreground">{COPY.detalle}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{cliente.razon_social}</CardTitle>
          <CardDescription className="tabular-nums">
            CUIT {formatCUIT(cliente.cuit)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">{ETIQUETAS_IVA[cliente.condicion_iva]}</Badge>
          {cliente.categoria_monotributo && (
            <Badge>Categoría {cliente.categoria_monotributo}</Badge>
          )}
          <Badge variant="secondary">{ETIQUETAS_IIBB[cliente.condicion_iibb]}</Badge>
          {cliente.tiene_empleados && (
            <Badge variant="secondary">
              {cliente.cantidad_empleados} empleados
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Tus últimas obligaciones</CardTitle>
          <Link href="/portal/veps" className="text-sm text-primary hover:underline">
            Ver VEPs
          </Link>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {ddjj.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Todavía no hay liquidaciones cargadas para tu CUIT.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ddjj.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">
                      {d.impuesto_tipo}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {d.organismo}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {d.periodo_fiscal}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatFecha(d.fecha_vencimiento)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatARS(d.monto_vep_ars || d.monto_impuesto_ars)}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={d.estado as EstadoTramite} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
