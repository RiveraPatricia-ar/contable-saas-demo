import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilaCuota } from "./fila-cuota";
import { GenerarCuotas } from "./generar-cuotas";
import { EditarPlan } from "./editar-plan";
import { ETIQUETAS_ESTADO_PLAN, RENTAS_DIAS } from "@/lib/constants";
import { formatARS, formatCUIT, formatFecha } from "@/lib/utils";
import { URL_MIS_FACILIDADES, urlBoletaRentas, urlConsultaRentas } from "@/lib/planes";
import type { CuotaPlan, PlanResumen } from "@/types/database";

export const dynamic = "force-dynamic";

/** Par etiqueta/valor de la ficha. */
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}

export default async function PlanDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [planRes, cuotasRes, clientesRes] = await Promise.all([
    supabase.from("planes_resumen").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("cuotas_plan")
      .select("*")
      .eq("plan_id", params.id)
      .order("numero_cuota"),
    supabase
      .from("clientes_estudio")
      .select("id, razon_social, cuit")
      .eq("estado_activo", true)
      .order("razon_social"),
  ]);

  const plan = planRes.data as PlanResumen | null;
  if (!plan) notFound();

  const cuotas = (cuotasRes.data ?? []) as CuotaPlan[];
  const clientes = (clientesRes.data ?? []) as {
    id: string;
    razon_social: string;
    cuit: string;
  }[];
  const esArca = plan.origen === "ARCA";
  const consulta = esArca ? URL_MIS_FACILIDADES : urlConsultaRentas(plan);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/planes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a planes
      </Link>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">
              {plan.razon_social}{" "}
              <span className="font-normal text-muted-foreground">
                {formatCUIT(plan.cuit)}
              </span>
            </CardTitle>
            <CardDescription>
              {plan.tipo_plan} · N° {plan.numero_plan}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={esArca ? "default" : "secondary"}>
              {esArca ? "ARCA — Mis Facilidades" : "Rentas Tucumán"}
            </Badge>
            <Badge variant={plan.estado === "VIGENTE" ? "default" : "destructive"}>
              {ETIQUETAS_ESTADO_PLAN[plan.estado]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Dato label="Cuotas pagadas">
              {plan.cuotas_pagadas} de {plan.cantidad_cuotas}
            </Dato>
            <Dato label="Cuotas vencidas">
              <span className={plan.cuotas_vencidas > 0 ? "text-destructive" : undefined}>
                {plan.cuotas_vencidas}
              </span>
            </Dato>
            <Dato label="Próximo vencimiento">
              {formatFecha(plan.proximo_vencimiento)}
            </Dato>
            <Dato label="Monto total">{formatARS(plan.monto_total_ars)}</Dato>
            <Dato label="Presentado">{formatFecha(plan.fecha_presentacion)}</Dato>

            {esArca ? (
              <Dato label="Vencimientos del mes">
                {plan.dia_vencimiento_1}
                {plan.dia_vencimiento_2 ? ` y ${plan.dia_vencimiento_2}` : ""}
              </Dato>
            ) : (
              <>
                <Dato label="Se paga / se envía">
                  día {plan.dia_pago ?? RENTAS_DIAS.pago} · enviar el{" "}
                  {plan.dia_envio ?? RENTAS_DIAS.envio}
                </Dato>
                <Dato label="Padrón">{plan.rentas_padron ?? "—"}</Dato>
                <Dato label="Obligación">{plan.rentas_obligacion ?? "—"}</Dato>
                <Dato label="Código pago electrónico">
                  {plan.rentas_cod_pago_elec ?? "—"}
                </Dato>
                <Dato label="Código de validación">
                  {plan.rentas_cod_validacion ?? "—"}
                </Dato>
              </>
            )}
          </div>

          {consulta ? (
            <a
              href={consulta}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {esArca
                ? "Abrir Mis Facilidades en ARCA"
                : "Abrir el plan en Rentas Tucumán"}
            </a>
          ) : null}

          {plan.notas ? (
            <p className="rounded-lg bg-muted/40 p-3 text-sm">{plan.notas}</p>
          ) : null}
        </CardContent>
      </Card>

      <EditarPlan plan={plan} clientes={clientes} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuotas</CardTitle>
          <CardDescription>
            El avión indica que la boleta ya se le envió al cliente; el tilde,
            que la cuota está paga.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0">
          <div className="px-6">
            <GenerarCuotas planId={plan.id} />
          </div>

          {cuotas.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Este plan todavía no tiene cuotas cargadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>{esArca ? "VEP" : "Boleta"}</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Envío · Pago</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuotas.map((c) => (
                  <FilaCuota
                    key={c.id}
                    cuota={c}
                    planId={plan.id}
                    esArca={esArca}
                    boletaUrl={esArca ? null : urlBoletaRentas(plan, c.numero_cuota)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
