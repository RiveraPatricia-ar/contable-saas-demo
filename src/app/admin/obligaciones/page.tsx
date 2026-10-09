import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import Link from "next/link";
import { FileCheck2, Filter, Send, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCUIT } from "@/lib/utils";
import { ETIQUETAS_IMPUESTO, IMPUESTOS } from "@/lib/constants";
import { PanelGenerar } from "./panel-generar";
import { FilaObligacion, type ObligacionFila } from "./fila";
import type { ClienteEstudio } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ObligacionesPage({
  searchParams,
}: {
  searchParams: { periodo?: string; cliente?: string; impuesto?: string };
}) {
  const supabase = createClient();
  const periodo =
    searchParams.periodo && /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.periodo)
      ? searchParams.periodo
      : new Date().toISOString().slice(0, 7);

  const clienteId = searchParams.cliente?.trim() || "";
  const impuesto = searchParams.impuesto?.trim() || "";

  let obligQuery = supabase
    .from("declaraciones_juradas")
    .select("*, clientes_estudio(razon_social, cuit)")
    .eq("periodo_fiscal", periodo)
    .order("fecha_vencimiento");

  if (clienteId) obligQuery = obligQuery.eq("cliente_id", clienteId);
  if (impuesto) obligQuery = obligQuery.eq("impuesto_tipo", impuesto);

  const [obligRes, clientesRes] = await Promise.all([
    obligQuery,
    supabase
      .from("clientes_estudio")
      .select("id, razon_social, cuit")
      .eq("estado_activo", true)
      .order("razon_social"),
  ]);

  const obligaciones = (obligRes.data ?? []) as ObligacionFila[];
  const clientes = (clientesRes.data ?? []) as Pick<
    ClienteEstudio,
    "id" | "razon_social" | "cuit"
  >[];

  const pendientesPresentar = obligaciones.filter((o) => !o.presentada).length;
  const sinEnviar = obligaciones.filter(
    (o) => o.boleta_generada && !o.enviada_al_cliente
  ).length;
  const impagas = obligaciones.filter((o) => !o.boleta_pagada).length;

  const clienteElegido = clientes.find((c) => c.id === clienteId);
  const impuestoElegido = impuesto
    ? ETIQUETAS_IMPUESTO[impuesto] ?? impuesto
    : "";

  const titulo = [
    clienteElegido?.razon_social,
    impuestoElegido,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <PanelGenerar periodo={periodo} clientes={clientes} />

      <Card>
        <CardContent className="py-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cliente">Cliente</Label>
              <Select
                id="cliente"
                name="cliente"
                defaultValue={clienteId}
                className="w-64"
              >
                <option value="">Todos los clientes</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social} — {formatCUIT(c.cuit)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="impuesto">Impuesto</Label>
              <Select
                id="impuesto"
                name="impuesto"
                defaultValue={impuesto}
                className="w-56"
              >
                <option value="">Todos los impuestos</option>
                {IMPUESTOS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periodo-filtro">Mes (AAAA-MM)</Label>
              <Input
                id="periodo-filtro"
                name="periodo"
                defaultValue={periodo}
                className="w-36"
              />
            </div>

            <Button type="submit" variant="outline">
              <Filter className="h-4 w-4" />
              Ver
            </Button>

            {clienteId || impuesto ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/obligaciones?periodo=${periodo}`}>
                  Quitar el filtro
                </Link>
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sin presentar"
          valor={String(pendientesPresentar)}
          detalle={`Período ${periodo}`}
          icon={FileCheck2}
          tono={pendientesPresentar > 0 ? "alerta" : "positivo"}
        />
        <StatCard
          label="Boletas sin enviar"
          valor={String(sinEnviar)}
          detalle="Generadas pero no enviadas al cliente"
          icon={Send}
          tono={sinEnviar > 0 ? "alerta" : "positivo"}
        />
        <StatCard
          label="Boletas impagas"
          valor={String(impagas)}
          detalle="Todavía sin confirmar el pago"
          icon={Wallet}
          tono={impagas > 0 ? "critico" : "positivo"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {clienteElegido
              ? `${titulo} — ${periodo}`
              : impuestoElegido
              ? `${impuestoElegido} — ${periodo}`
              : `Seguimiento de ${periodo}`}
          </CardTitle>
          <CardDescription>
            Las cuatro casillas son, en orden: presentada · boleta generada ·
            enviada al cliente · pagada.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {obligaciones.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {clienteElegido
                ? impuestoElegido
                  ? `${clienteElegido.razon_social} no tiene ${impuestoElegido} cargado en ${periodo}.`
                  : `${clienteElegido.razon_social} no tiene impuestos cargados en ${periodo}.`
                : impuestoElegido
                ? `No hay obligaciones de ${impuestoElegido} cargadas para ${periodo}.`
                : `No hay obligaciones cargadas para ${periodo}. Configurá los impuestos de cada cliente y usá «Generar obligaciones».`}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Pres. · Bol. · Env. · Pago</TableHead>
                  <TableHead>Boleta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligaciones.map((o) => (
                  <FilaObligacion key={o.id} o={o} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
