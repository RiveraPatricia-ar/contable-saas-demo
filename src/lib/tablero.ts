import { ETIQUETAS_IMPUESTO, IMPUESTOS } from "@/lib/constants";

/**
 * Cálculo de las grillas del tablero de impuestos. Lo usan la pantalla y la
 * exportación a Excel, para que las dos muestren exactamente lo mismo.
 */

export type EstadoCelda = "PRESENTADA" | "PENDIENTE" | "VENCIDA";

export interface Celda {
  estado: EstadoCelda;
  pagada: boolean;
  vencimiento: string;
  importe: number;
}

export interface Obligacion {
  cliente_id: string;
  impuesto_tipo: string;
  periodo_fiscal: string;
  fecha_vencimiento: string;
  presentada: boolean;
  boleta_pagada: boolean;
  monto_impuesto_ars: number | null;
}

export function estadoDe(o: Obligacion, hoy: string): EstadoCelda {
  if (o.presentada) return "PRESENTADA";
  return o.fecha_vencimiento < hoy ? "VENCIDA" : "PENDIENTE";
}

function celda(o: Obligacion, hoy: string): Celda {
  return {
    estado: estadoDe(o, hoy),
    pagada: o.boleta_pagada,
    vencimiento: o.fecha_vencimiento,
    importe: Number(o.monto_impuesto_ars ?? 0),
  };
}

/** Ordena los impuestos como están en la lista del sistema, no alfabético. */
export function ordenarImpuestos(tipos: string[]): string[] {
  const orden = IMPUESTOS.map((i) => i.value as string);
  return [...tipos].sort((a, b) => {
    const ia = orden.indexOf(a);
    const ib = orden.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export const etiquetaImpuesto = (t: string) => ETIQUETAS_IMPUESTO[t] ?? t;

/** Grilla de un mes: una fila por cliente, una columna por impuesto. */
export function grillaMes(obligaciones: Obligacion[], hoy: string) {
  const impuestos = ordenarImpuestos(
    Array.from(new Set(obligaciones.map((o) => o.impuesto_tipo)))
  );
  const porCliente = new Map<string, Map<string, Celda>>();

  for (const o of obligaciones) {
    if (!porCliente.has(o.cliente_id)) porCliente.set(o.cliente_id, new Map());
    porCliente.get(o.cliente_id)!.set(o.impuesto_tipo, celda(o, hoy));
  }

  return { impuestos, porCliente };
}

/** Grilla anual de un cliente: una fila por impuesto, una columna por mes. */
export function grillaCliente(obligaciones: Obligacion[], anio: string, hoy: string) {
  const meses = Array.from({ length: 12 }, (_, i) =>
    `${anio}-${String(i + 1).padStart(2, "0")}`
  );
  const impuestos = ordenarImpuestos(
    Array.from(new Set(obligaciones.map((o) => o.impuesto_tipo)))
  );
  const porImpuesto = new Map<string, Map<string, Celda>>();

  for (const o of obligaciones) {
    if (!porImpuesto.has(o.impuesto_tipo)) porImpuesto.set(o.impuesto_tipo, new Map());
    porImpuesto.get(o.impuesto_tipo)!.set(o.periodo_fiscal, celda(o, hoy));
  }

  return { meses, impuestos, porImpuesto };
}

export const NOMBRE_MES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export const TEXTO_ESTADO: Record<EstadoCelda, string> = {
  PRESENTADA: "Presentada",
  PENDIENTE: "Pendiente",
  VENCIDA: "Vencida",
};

/** Saca tildes y pasa a minúsculas para comparar nombres. */
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Filtro por nombre o CUIT. Busca cada palabra por separado, así
 * "araoz julio" o "julio araoz" encuentran a ARAOZ JULIO CESAR, y
 * "20127328" o "20-20127328-6" lo encuentran por CUIT.
 */
export function coincideCliente(
  c: { razon_social: string; cuit: string },
  q: string | null | undefined
): boolean {
  const busca = normalizar(q ?? "");
  if (!busca) return true;
  const nombre = normalizar(c.razon_social ?? "");
  const cuit = (c.cuit ?? "").replace(/\D/g, "");
  return busca.split(/\s+/).every((p) => {
    if (nombre.includes(p)) return true;
    const dig = p.replace(/[-.]/g, "");
    return /^\d{3,}$/.test(dig) && cuit.includes(dig);
  });
}
