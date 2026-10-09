import type { createClient } from "@/lib/supabase/server";
import { ivaConSigno, traerTodos } from "@/lib/comprobantes";

type Supabase = ReturnType<typeof createClient>;

/** Cuántos meses hacia atrás se reconstruye la cadena de saldos. */
const MESES_ATRAS = 24;

/** Resta meses a un período YYYY-MM. */
export function restarMeses(periodo: string, meses: number): string {
  const [a, m] = periodo.split("-").map(Number);
  const total = a * 12 + (m - 1) - meses;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/**
 * Devuelve el saldo a favor que corresponde descontar en `periodo`.
 *
 * - Si el estudio lo cargó a mano para ese período, se usa ese valor.
 * - Si no, se calcula a partir del período anterior:
 *     saldo anterior = débito - crédito - saldo a favor de ese período
 *   y, si dio negativo, ese importe es el saldo a favor que se arrastra.
 *   La cadena se reconstruye hasta MESES_ATRAS meses hacia atrás, tomando
 *   los valores cargados a mano cuando existen.
 */
export async function obtenerSaldoFavorAnterior(
  supabase: Supabase,
  clienteId: string,
  periodo: string
): Promise<{ valor: number; guardado: boolean }> {
  const desde = restarMeses(periodo, MESES_ATRAS);

  type FilaIva = {
    periodo_fiscal: string;
    tipo_operacion: string;
    tipo_comprobante: string;
    iva_21: number;
    iva_10_5: number;
    iva_27: number;
  };

  const [{ data: saldos }, comps, { data: resumenes }] = await Promise.all([
    supabase
      .from("saldos_iva_periodo")
      .select("periodo_fiscal, saldo_favor_anterior")
      .eq("cliente_id", clienteId)
      .gte("periodo_fiscal", desde)
      .lte("periodo_fiscal", periodo),
    // Paginado: 24 meses pueden superar las 1000 filas que devuelve Supabase.
    traerTodos<FilaIva>(() =>
      supabase
        .from("comprobantes")
        .select("periodo_fiscal, tipo_operacion, tipo_comprobante, iva_21, iva_10_5, iva_27")
        .eq("cliente_id", clienteId)
        .gte("periodo_fiscal", desde)
        .lt("periodo_fiscal", periodo)
        .order("id", { ascending: true })
    ),
    // Totales importados de ARCA: a lo sumo 2 filas por mes (48 en 24 meses).
    supabase
      .from("resumen_iva_periodo")
      .select("periodo_fiscal, tipo_operacion, iva_total")
      .eq("cliente_id", clienteId)
      .gte("periodo_fiscal", desde)
      .lt("periodo_fiscal", periodo),
  ]);

  const cargados = new Map<string, number>();
  for (const s of saldos ?? []) {
    cargados.set(s.periodo_fiscal, Number(s.saldo_favor_anterior));
  }

  if (cargados.has(periodo)) {
    return { valor: cargados.get(periodo)!, guardado: true };
  }

  // Débito - crédito de cada período.
  const neto = new Map<string, number>();
  for (const c of comps) {
    const iva = ivaConSigno(c); // las notas de crédito restan
    const signo = c.tipo_operacion === "VENTA" ? 1 : -1;
    neto.set(c.periodo_fiscal, (neto.get(c.periodo_fiscal) ?? 0) + signo * iva);
  }

  for (const r of resumenes ?? []) {
    const signo = r.tipo_operacion === "VENTA" ? 1 : -1;
    neto.set(r.periodo_fiscal, (neto.get(r.periodo_fiscal) ?? 0) + signo * Number(r.iva_total));
  }

  // Recorre del más viejo al actual arrastrando el saldo a favor.
  let arrastre = 0;
  for (let i = MESES_ATRAS; i >= 1; i--) {
    const p = restarMeses(periodo, i);
    const favor = cargados.get(p) ?? arrastre;
    const saldo = (neto.get(p) ?? 0) - favor;
    arrastre = saldo < 0 ? -saldo : 0;
  }

  return { valor: Math.round(arrastre * 100) / 100, guardado: false };
}
