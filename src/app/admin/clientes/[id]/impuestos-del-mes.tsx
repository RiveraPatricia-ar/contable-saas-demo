import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ETIQUETAS_IMPUESTO } from "@/lib/constants";
import { cn, formatARS, formatFecha } from "@/lib/utils";
import type { DeclaracionJurada } from "@/types/database";
import { BorrarImpuesto } from "./borrar-impuesto";

/** Corre un período AAAA-MM la cantidad de meses indicada. */
function correrMes(periodo: string, meses: number): string {
  const [anio, mes] = periodo.split("-").map(Number);
  const d = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Tilde verde si está hecho, guion gris si falta. */
function Marca({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        ok ? "text-emerald-600" : "text-muted-foreground"
      )}
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

/**
 * Resumen de los impuestos del cliente en un mes. Se usa dentro de su ficha;
 * el detalle completo, con las casillas para marcar, está en
 * /admin/obligaciones.
 */
export async function ImpuestosDelMes({
  clienteId,
  periodo,
}: {
  clienteId: string;
  periodo: string;
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("declaraciones_juradas")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("periodo_fiscal", periodo)
    .order("fecha_vencimiento");

  const obligaciones = (data ?? []) as DeclaracionJurada[];
  const sinPresentar = obligaciones.filter((o) => !o.presentada).length;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Impuestos de {periodo}</CardTitle>
          <CardDescription>
            {obligaciones.length === 0
              ? "Sin impuestos cargados en este período."
              : sinPresentar === 0
              ? "Todo presentado."
              : `${sinPresentar} sin presentar.`}
          </CardDescription>
        </div>
        <Link
          href={`/admin/obligaciones?cliente=${clienteId}&periodo=${periodo}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Ver y marcar
        </Link>
        </div>

        {/* Selector de mes: navega a la misma ficha con otro período. */}
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/admin/clientes/${clienteId}?periodo=${correrMes(periodo, -1)}`}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
              {correrMes(periodo, -1)}
            </Link>
          </Button>

          <form className="flex items-center gap-2">
            <Input
              name="periodo"
              defaultValue={periodo}
              aria-label="Período (AAAA-MM)"
              className="h-9 w-28 text-center text-sm tabular-nums"
            />
            <Button type="submit" variant="ghost" size="sm">
              Ir
            </Button>
          </form>

          <Button asChild variant="outline" size="sm">
            <Link
              href={`/admin/clientes/${clienteId}?periodo=${correrMes(periodo, 1)}`}
              aria-label="Mes siguiente"
            >
              {correrMes(periodo, 1)}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      {obligaciones.length > 0 ? (
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {obligaciones.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {ETIQUETAS_IMPUESTO[o.impuesto_tipo] ?? o.impuesto_tipo}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    vence {formatFecha(o.fecha_vencimiento)} ·{" "}
                    {formatARS(o.monto_impuesto_ars)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Marca ok={o.presentada} label="Presentada" />
                  <Marca ok={o.boleta_generada} label="Boleta" />
                  <Marca ok={o.enviada_al_cliente} label="Enviada" />
                  <Badge variant={o.boleta_pagada ? "success" : "secondary"}>
                    {o.boleta_pagada ? "Pagada" : "Impaga"}
                  </Badge>
                  <BorrarImpuesto
                    id={o.id}
                    nombre={ETIQUETAS_IMPUESTO[o.impuesto_tipo] ?? o.impuesto_tipo}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
