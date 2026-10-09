/**
 * Utilidades compartidas para comprobantes del Libro IVA.
 */

/** Supabase (PostgREST) devuelve como máximo 1000 filas por consulta. */
const TAMANO_PAGINA = 1000;

/**
 * Trae TODAS las filas de una consulta paginando de a 1000.
 * `armarConsulta` debe devolver una consulta nueva cada vez (con orden estable).
 */
export async function traerTodos<T>(
  armarConsulta: () => {
    range: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
  }
): Promise<T[]> {
  const todos: T[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await armarConsulta().range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(error.message);
    const pagina = data ?? [];
    todos.push(...pagina);
    if (pagina.length < TAMANO_PAGINA) break;
  }
  return todos;
}

/**
 * Códigos ARCA de notas de crédito (A, B, C, M, FCE A/B/C) y los códigos
 * internos del estudio (NC_A, NC_B...).
 */
const CODIGOS_NC = new Set(["3", "8", "13", "53", "113", "203", "208", "213"]);

export function esNotaCredito(tipo: string | null | undefined): boolean {
  const t = String(tipo ?? "").trim().toUpperCase();
  return CODIGOS_NC.has(t) || t.startsWith("NC");
}

/** +1 para facturas / notas de débito, -1 para notas de crédito. */
export function signoComprobante(tipo: string | null | undefined): 1 | -1 {
  return esNotaCredito(tipo) ? -1 : 1;
}

type ConIva = {
  tipo_comprobante: string;
  iva_21: number | string;
  iva_10_5: number | string;
  iva_27: number | string;
};

/** IVA del comprobante con signo (las notas de crédito restan). */
export function ivaConSigno(c: ConIva): number {
  const iva = Number(c.iva_21) + Number(c.iva_10_5) + Number(c.iva_27);
  return signoComprobante(c.tipo_comprobante) * iva;
}

/** Totales del Libro IVA de un cliente / período / libro (tabla resumen_iva_periodo). */
export type ResumenIva = {
  id: string;
  cliente_id: string;
  periodo_fiscal: string;
  tipo_operacion: "VENTA" | "COMPRA";
  cantidad_comprobantes: number;
  cantidad_notas_credito: number;
  neto_gravado: number;
  neto_no_gravado: number;
  exento: number;
  iva_21: number;
  iva_10_5: number;
  iva_27: number;
  iva_otras: number;
  iva_total: number;
  otros_tributos: number;
  total: number;
  archivo_nombre: string | null;
  updated_at: string;
};
