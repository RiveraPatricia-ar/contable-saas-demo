import { createClient } from "@/lib/supabase/server";
import { miClientePrincipal } from "@/lib/portal";
import { BotonDescarga } from "@/components/boton-descarga";
import { EstadoBadge } from "@/components/estado-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatARS, formatFecha, diasHasta } from "@/lib/utils";
import type { DeclaracionJurada, EstadoTramite } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function VepsPage() {
  const cliente = await miClientePrincipal();
  if (!cliente) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay un CUIT vinculado a tu usuario.
      </p>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("declaraciones_juradas")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("fecha_vencimiento", { ascending: false });

  const ddjj = (data ?? []) as DeclaracionJurada[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mis VEPs y pagos</CardTitle>
        <CardDescription>
          Descargá el volante electrónico de pago y pagalo por home banking o
          en la red de cobranzas antes de la fecha límite.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {ddjj.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Todavía no hay VEPs generados para tu CUIT.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Impuesto</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Pagar antes del</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Archivos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ddjj.map((d) => {
                const dias = diasHasta(d.fecha_vencimiento);
                const pagado = ["PAGADO", "FINALIZADO"].includes(d.estado);
                return (
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
                      {!pagado && dias <= 7 && (
                        <Badge
                          variant={dias < 0 ? "destructive" : "warning"}
                          className="ml-2"
                        >
                          {dias < 0 ? "vencido" : `en ${dias} d`}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatARS(d.monto_vep_ars || d.monto_impuesto_ars)}
                      {d.codigo_vep && (
                        <p className="text-xs font-normal text-muted-foreground">
                          VEP #{d.codigo_vep}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={d.estado as EstadoTramite} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {d.path_pdf_vep && (
                          <BotonDescarga path={d.path_pdf_vep} label="VEP" />
                        )}
                        {d.path_pdf_acuse && (
                          <BotonDescarga
                            path={d.path_pdf_acuse}
                            label="Acuse"
                            variant="ghost"
                          />
                        )}
                        {!d.path_pdf_vep && !d.path_pdf_acuse && (
                          <span className="text-xs text-muted-foreground">
                            Sin adjuntos
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
