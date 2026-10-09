import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImportarCSV } from "./importar-csv";
import { SaldoFavorAnterior } from "./saldo-favor";
import { obtenerSaldoFavorAnterior, restarMeses } from "./saldo-iva";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { cn, formatARS, formatCUIT } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Scale } from "lucide-react";
import type { ClienteEstudio } from "@/types/database";
import { signoComprobante, traerTodos } from "@/lib/comprobantes";

export const dynamic = "force-dynamic";

/** Meses que se muestran en el historial del cliente. */
const MESES_HISTORIAL = 12;

type Libro = { cantidad: number; total: number; neto: number; iva: number };
type Mes = { venta: Libro; compra: Libro };

const libroVacio = (): Libro => ({ cantidad: 0, total: 0, neto: 0, iva: 0 });
const redondear = (n: number) => Math.round(n * 100) / 100;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const nombrePeriodo = (p: string) => `${MESES[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;

export default async function ComprobantesPage({
  searchParams,
}: {
  searchParams: { cliente?: string; periodo?: string };
}) {
  const supabase = createClient();
  const periodo = searchParams.periodo ?? new Date().toISOString().slice(0, 7);

  const { data: clientesData } = await supabase
    .from("clientes_estudio")
    .select("id, razon_social, cuit")
    .eq("estado_activo", true)
    .order("razon_social");

  const clientes = (clientesData ?? []) as Pick<ClienteEstudio, "id" | "razon_social" | "cuit">[];
  const clienteId = searchParams.cliente ?? clientes[0]?.id;

  // Períodos del historial, del más reciente al más viejo.
  const periodos = Array.from({ length: MESES_HISTORIAL }, (_, i) => restarMeses(periodo, i));
  const desde = periodos[periodos.length - 1];

  const meses = new Map<string, Mes>(
    periodos.map((p) => [p, { venta: libroVacio(), compra: libroVacio() }])
  );
  let saldoFavorAnterior = 0;
  let saldoGuardado = false;

  if (clienteId) {
    const [saldo, { data: resumenes }, manuales] = await Promise.all([
      obtenerSaldoFavorAnterior(supabase, clienteId, periodo),
      // Totales importados de ARCA: a lo sumo 2 filas por mes.
      supabase
        .from("resumen_iva_periodo")
        .select("periodo_fiscal, tipo_operacion, cantidad_comprobantes, total, neto_gravado, iva_total")
        .eq("cliente_id", clienteId)
        .gte("periodo_fiscal", desde)
        .lte("periodo_fiscal", periodo),
      // Comprobantes cargados a mano (se suman a lo importado).
      traerTodos<{
        periodo_fiscal: string;
        tipo_operacion: string;
        tipo_comprobante: string;
        total: number;
        neto_gravado: number;
        iva_21: number;
        iva_10_5: number;
        iva_27: number;
      }>(() =>
        supabase
          .from("comprobantes")
          .select("periodo_fiscal, tipo_operacion, tipo_comprobante, total, neto_gravado, iva_21, iva_10_5, iva_27")
          .eq("cliente_id", clienteId)
          .gte("periodo_fiscal", desde)
          .lte("periodo_fiscal", periodo)
          .order("id", { ascending: true })
      ),
    ]);
    saldoFavorAnterior = saldo.valor;
    saldoGuardado = saldo.guardado;

    for (const r of resumenes ?? []) {
      const mes = meses.get(r.periodo_fiscal);
      if (!mes) continue;
      const l = r.tipo_operacion === "VENTA" ? mes.venta : mes.compra;
      l.cantidad += Number(r.cantidad_comprobantes);
      l.total += Number(r.total);
      l.neto += Number(r.neto_gravado);
      l.iva += Number(r.iva_total);
    }
    for (const c of manuales) {
      const mes = meses.get(c.periodo_fiscal);
      if (!mes) continue;
      const l = c.tipo_operacion === "VENTA" ? mes.venta : mes.compra;
      const s = signoComprobante(c.tipo_comprobante);
      l.cantidad += 1;
      l.total += s * Number(c.total);
      l.neto += s * Number(c.neto_gravado);
      l.iva += s * (Number(c.iva_21) + Number(c.iva_10_5) + Number(c.iva_27));
    }
    for (const m of Array.from(meses.values())) {
      for (const l of [m.venta, m.compra]) {
        l.total = redondear(l.total);
        l.neto = redondear(l.neto);
        l.iva = redondear(l.iva);
      }
    }
  }

  const actual = meses.get(periodo)!;
  const ivaDebito = actual.venta.iva;
  const ivaCredito = actual.compra.iva;
  // Saldo del período = débito fiscal - crédito fiscal - saldo a favor del período anterior
  const saldoPeriodo = redondear(ivaDebito - ivaCredito - saldoFavorAnterior);
  const clienteActual = clientes.find((c) => c.id === clienteId);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Libro IVA Digital</CardTitle>
          <CardDescription>Elegí el cliente y el período a revisar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-3">
            <Select name="cliente" defaultValue={clienteId}>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razon_social} — {formatCUIT(c.cuit)}
                </option>
              ))}
            </Select>
            <input
              type="month"
              name="periodo"
              defaultValue={periodo}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ver período
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="IVA débito fiscal"
          valor={formatARS(ivaDebito)}
          detalle={`${actual.venta.cantidad.toLocaleString("es-AR")} comprobantes de venta`}
          icon={ArrowUpRight}
        />
        <StatCard
          label="IVA crédito fiscal"
          valor={formatARS(ivaCredito)}
          detalle={`${actual.compra.cantidad.toLocaleString("es-AR")} comprobantes de compra`}
          icon={ArrowDownLeft}
        />
        <StatCard
          label="Saldo a favor período anterior"
          valor={formatARS(saldoFavorAnterior)}
          detalle={saldoGuardado ? "Cargado por el estudio" : "Calculado del período anterior"}
          icon={PiggyBank}
        />
        <StatCard
          label="Saldo del período"
          valor={formatARS(Math.abs(saldoPeriodo))}
          detalle={saldoPeriodo > 0 ? "A pagar" : saldoPeriodo < 0 ? "Saldo técnico a favor (pasa al período siguiente)" : "Sin saldo"}
          icon={Scale}
          tono={saldoPeriodo > 0 ? "alerta" : "positivo"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de {nombrePeriodo(periodo)}</CardTitle>
          <CardDescription>
            Notas de crédito restadas. Incluye lo importado de ARCA y lo cargado a mano.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Libro</TableHead>
                <TableHead className="text-right">Comprob.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Neto gravado</TableHead>
                <TableHead className="text-right">IVA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                [
                  ["Ventas", "Débito fiscal", actual.venta],
                  ["Compras", "Crédito fiscal", actual.compra],
                ] as const
              ).map(([nombre, etiquetaIva, l]) => (
                <TableRow key={nombre}>
                  <TableCell className="font-medium">
                    {nombre}
                    <p className="text-xs font-normal text-muted-foreground">{etiquetaIva}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.cantidad.toLocaleString("es-AR")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatARS(l.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatARS(l.neto)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatARS(l.iva)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {clienteId && (
        <SaldoFavorAnterior
          clienteId={clienteId}
          periodo={periodo}
          valor={saldoFavorAnterior}
          guardado={saldoGuardado}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Últimos {MESES_HISTORIAL} meses{clienteActual ? ` — ${clienteActual.razon_social}` : ""}
          </CardTitle>
          <CardDescription>Tocá un mes para verlo arriba. Saldo = débito − crédito (sin saldo a favor).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="align-bottom">Mes</TableHead>
                <TableHead colSpan={3} className="border-l text-center">Ventas</TableHead>
                <TableHead colSpan={3} className="border-l text-center">Compras</TableHead>
                <TableHead rowSpan={2} className="border-l text-right align-bottom">Saldo</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="border-l text-right">Total</TableHead>
                <TableHead className="text-right">Neto grav.</TableHead>
                <TableHead className="text-right">Débito</TableHead>
                <TableHead className="border-l text-right">Total</TableHead>
                <TableHead className="text-right">Neto grav.</TableHead>
                <TableHead className="text-right">Crédito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodos.map((p) => {
                const m = meses.get(p)!;
                const vacio = m.venta.cantidad === 0 && m.compra.cantidad === 0;
                const saldo = redondear(m.venta.iva - m.compra.iva);
                return (
                  <TableRow key={p} className={cn(p === periodo && "bg-muted/60", vacio && "text-muted-foreground")}>
                    <TableCell className="whitespace-nowrap font-medium">
                      <Link
                        href={`/admin/comprobantes?cliente=${clienteId ?? ""}&periodo=${p}`}
                        className="hover:underline"
                      >
                        {nombrePeriodo(p)}
                      </Link>
                    </TableCell>
                    {vacio ? (
                      <TableCell colSpan={7} className="border-l text-center text-xs">
                        Sin datos importados
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="border-l text-right tabular-nums">{formatARS(m.venta.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatARS(m.venta.neto)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatARS(m.venta.iva)}</TableCell>
                        <TableCell className="border-l text-right tabular-nums">{formatARS(m.compra.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatARS(m.compra.neto)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatARS(m.compra.iva)}</TableCell>
                        <TableCell
                          className={cn(
                            "border-l text-right font-medium tabular-nums",
                            saldo > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {formatARS(saldo)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ImportarCSV clientes={clientes} clienteSeleccionado={clienteId} />
    </div>
  );
}
