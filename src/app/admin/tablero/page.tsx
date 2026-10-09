import Link from "next/link";
import { CalendarRange, FileSpreadsheet, Search, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn, formatCUIT } from "@/lib/utils";
import { FILTROS_CLIENTES, aplicarFiltrosClientes, filtroPorClave } from "@/lib/filtros-clientes";
import {
  NOMBRE_MES_CORTO,
  coincideCliente,
  etiquetaImpuesto,
  grillaCliente,
  grillaMes,
  type Obligacion,
} from "@/lib/tablero";
import { CeldaEstado, Referencias } from "./celda";

export const dynamic = "force-dynamic";

const CAMPOS =
  "cliente_id, impuesto_tipo, periodo_fiscal, fecha_vencimiento, presentada, boleta_pagada, monto_impuesto_ars";

type Params = {
  modo?: string;
  periodo?: string;
  tipo?: string;
  cliente?: string;
  anio?: string;
  q?: string;
};

function url(p: Record<string, string | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) s.set(k, v);
  const t = s.toString();
  return t ? `?${t}` : "";
}

export default async function TableroPage({ searchParams }: { searchParams: Params }) {
  const supabase = createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const modo = searchParams.modo === "cliente" ? "cliente" : "mes";

  const periodo =
    searchParams.periodo && /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.periodo)
      ? searchParams.periodo
      : hoy.slice(0, 7);
  const anio =
    searchParams.anio && /^\d{4}$/.test(searchParams.anio)
      ? searchParams.anio
      : hoy.slice(0, 4);
  const filtro = filtroPorClave(searchParams.tipo);
  const q = searchParams.q?.trim() ?? "";

  // Clientes: para el desplegable del modo cliente y para los nombres.
  const { data: clientesData } = await aplicarFiltrosClientes(
    supabase
      .from("clientes_estudio")
      .select("id, razon_social, cuit, condicion_iva, forma_juridica")
      .eq("estado_activo", true)
      .order("razon_social"),
    undefined,
    modo === "mes" ? filtro : filtroPorClave("")
  );
  const clientes = (clientesData ?? []) as {
    id: string;
    razon_social: string;
    cuit: string;
  }[];
  const nombre = new Map(clientes.map((c) => [c.id, c]));

  const clienteId = searchParams.cliente ?? clientes[0]?.id ?? "";

  const pestaña = (m: "mes" | "cliente") =>
    cn(
      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
      modo === m
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground"
    );

  // ------------------------------------------------------------ datos del modo
  let contenido: React.ReactNode = null;
  let exportar = "";

  if (modo === "mes") {
    const visibles = clientes.filter((c) => coincideCliente(c, q));
    const ids = visibles.map((c) => c.id);
    const { data } = ids.length
      ? await supabase
          .from("declaraciones_juradas")
          .select(CAMPOS)
          .eq("periodo_fiscal", periodo)
          .in("cliente_id", ids)
      : { data: [] };

    const { impuestos, porCliente } = grillaMes((data ?? []) as Obligacion[], hoy);
    const filas = visibles.filter((c) => porCliente.has(c.id));

    const conteo = { PRESENTADA: 0, PENDIENTE: 0, VENCIDA: 0 };
    // forEach en vez de for...of: el target del proyecto no itera Map directo.
    porCliente.forEach((m) => m.forEach((c) => conteo[c.estado]++));

    exportar = `/admin/tablero/exportar${url({ modo, periodo, tipo: filtro.clave, q })}`;

    contenido =
      filas.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">
          {q ? (
            <>
              Ningún cliente que coincida con «{q}» tiene impuestos cargados en{" "}
              {periodo}
              {filtro.clave ? ` (clientes ${filtro.etiqueta})` : ""}.
            </>
          ) : (
            <>
              No hay impuestos cargados para {periodo}
              {filtro.clave ? ` en clientes ${filtro.etiqueta}` : ""}. Se arman desde
              «Impuestos del mes».
            </>
          )}
        </p>
      ) : (
        <>
          <p className="px-6 pb-3 text-sm text-muted-foreground">
            {q ? `${filas.length} ${filas.length === 1 ? "cliente" : "clientes"} · ` : ""}
            {conteo.PRESENTADA} presentadas · {conteo.PENDIENTE} pendientes ·{" "}
            <span className={conteo.VENCIDA ? "font-medium text-destructive" : ""}>
              {conteo.VENCIDA} vencidas sin presentar
            </span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y bg-muted/40">
                  <th className="sticky left-0 z-10 min-w-[14rem] bg-muted/60 px-4 py-2 text-left font-medium backdrop-blur">
                    Cliente
                  </th>
                  {impuestos.map((t) => (
                    <th key={t} className="min-w-[6.5rem] px-2 py-2 text-center text-xs font-medium">
                      {etiquetaImpuesto(t).split(" — ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/30">
                    <td className="sticky left-0 z-10 bg-background px-4 py-2">
                      <Link
                        href={`/admin/tablero${url({ modo: "cliente", cliente: c.id, anio: periodo.slice(0, 4) })}`}
                        className="font-medium hover:underline"
                        title="Ver el año de este cliente"
                      >
                        {c.razon_social}
                      </Link>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatCUIT(c.cuit)}
                      </p>
                    </td>
                    {impuestos.map((t) => (
                      <td key={t} className="px-2 py-2">
                        <CeldaEstado c={porCliente.get(c.id)?.get(t)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
  } else {
    const { data } = clienteId
      ? await supabase
          .from("declaraciones_juradas")
          .select(CAMPOS)
          .eq("cliente_id", clienteId)
          .gte("periodo_fiscal", `${anio}-01`)
          .lte("periodo_fiscal", `${anio}-12`)
      : { data: [] };

    const { meses, impuestos, porImpuesto } = grillaCliente(
      (data ?? []) as Obligacion[],
      anio,
      hoy
    );
    const elegido = nombre.get(clienteId);
    exportar = `/admin/tablero/exportar${url({ modo, cliente: clienteId, anio })}`;

    contenido =
      impuestos.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">
          {elegido?.razon_social ?? "Este cliente"} no tiene impuestos cargados en {anio}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y bg-muted/40">
                <th className="sticky left-0 z-10 min-w-[12rem] bg-muted/60 px-4 py-2 text-left font-medium backdrop-blur">
                  Impuesto
                </th>
                {meses.map((m, i) => (
                  <th
                    key={m}
                    className={cn(
                      "min-w-[4.5rem] px-1.5 py-2 text-center text-xs font-medium",
                      m === hoy.slice(0, 7) && "text-primary"
                    )}
                  >
                    {NOMBRE_MES_CORTO[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {impuestos.map((t) => (
                <tr key={t} className="border-b hover:bg-muted/30">
                  <td className="sticky left-0 z-10 bg-background px-4 py-2 font-medium">
                    {etiquetaImpuesto(t)}
                  </td>
                  {meses.map((m) => (
                    <td key={m} className="px-1.5 py-2">
                      <CeldaEstado c={porImpuesto.get(t)?.get(m)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Tablero de impuestos</CardTitle>
              <CardDescription>
                Qué se presentó y qué falta, en formato planilla.
              </CardDescription>
            </div>
            <div className="inline-flex rounded-lg border p-0.5">
              <Link href={`/admin/tablero${url({ modo: "mes", periodo })}`} className={pestaña("mes")}>
                <CalendarRange className="h-3.5 w-3.5" />
                Por mes
              </Link>
              <Link
                href={`/admin/tablero${url({ modo: "cliente", cliente: clienteId, anio })}`}
                className={pestaña("cliente")}
              >
                <UserRound className="h-3.5 w-3.5" />
                Por cliente
              </Link>
            </div>
          </div>

          <form className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="modo" value={modo} />

            {modo === "mes" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="periodo">Mes (AAAA-MM)</Label>
                  <Input id="periodo" name="periodo" defaultValue={periodo} className="w-32" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tipo">Tipo de cliente</Label>
                  <Select id="tipo" name="tipo" defaultValue={filtro.clave} className="w-52">
                    {FILTROS_CLIENTES.map((f) => (
                      <option key={f.clave || "todos"} value={f.clave}>
                        {f.etiqueta}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q">Cliente (nombre o CUIT)</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="q"
                      name="q"
                      type="search"
                      defaultValue={q}
                      placeholder="Ej.: araoz"
                      className="w-60 pl-8"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select id="cliente" name="cliente" defaultValue={clienteId} className="w-72">
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razon_social} — {formatCUIT(c.cuit)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="anio">Año</Label>
                  <Input id="anio" name="anio" defaultValue={anio} className="w-24" />
                </div>
              </>
            )}

            <Button type="submit" variant="outline">
              Ver
            </Button>

            {modo === "mes" && q ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/tablero${url({ modo, periodo, tipo: filtro.clave })}`}>
                  Quitar búsqueda
                </Link>
              </Button>
            ) : null}

            {exportar ? (
              <Button asChild variant="outline" className="ml-auto">
                <a href={exportar}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar a Excel
                </a>
              </Button>
            ) : null}
          </form>

          <Referencias />
        </CardHeader>

        <CardContent className="px-0 pb-4">{contenido}</CardContent>
      </Card>
    </div>
  );
}
