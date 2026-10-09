import { CircleDollarSign, Clock, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GenerarHonorarios } from "./generar";
import { FilaHonorario } from "./fila";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatARS } from "@/lib/utils";
import type { ClienteEstudio, Honorario } from "@/types/database";

export const dynamic = "force-dynamic";

export type HonorarioConCliente = Honorario & {
  clientes_estudio: Pick<ClienteEstudio, "razon_social" | "cuit"> | null;
};

export default async function HonorariosPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("honorarios")
    .select("*, clientes_estudio(razon_social, cuit)")
    .order("periodo_fiscal", { ascending: false })
    .limit(200);

  const honorarios = (data ?? []) as HonorarioConCliente[];

  const total = (estados: string[]) =>
    honorarios
      .filter((h) => estados.includes(h.estado))
      .reduce((a, h) => a + Number(h.monto_ars), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Cobrado" valor={formatARS(total(["COBRADA"]))} icon={Wallet} tono="positivo" />
        <StatCard label="Pendiente de cobro" valor={formatARS(total(["EMITIDA"]))} icon={Clock} tono="alerta" />
        <StatCard label="Vencido" valor={formatARS(total(["VENCIDA"]))} icon={CircleDollarSign} tono="critico" />
      </div>

      <GenerarHonorarios />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facturación de honorarios</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {honorarios.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Todavía no hay honorarios generados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {honorarios.map((h) => (
                  <FilaHonorario key={h.id} honorario={h} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
