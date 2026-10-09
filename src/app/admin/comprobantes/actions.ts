"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ImportState = { error?: string; ok?: string };

/** Separa una línea de CSV respetando comillas dobles. */
function partirLinea(linea: string, sep: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let entreComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (c === sep && !entreComillas) {
      campos.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos.map((c) => c.trim());
}

/** Convierte "1.234,56" o "1234.56" a número. */
function aNumero(valor: string): number {
  if (!valor) return 0;
  const limpio = valor.replace(/\s|\$/g, "");
  const conComa = /,\d{1,2}$/.test(limpio);
  const normalizado = conComa
    ? limpio.replace(/\./g, "").replace(",", ".")
    : limpio.replace(/,/g, "");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

/** Acepta dd/mm/aaaa, aaaa-mm-dd y aaaammdd. */
function aFecha(valor: string): string | null {
  const v = valor.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const barras = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (barras) {
    return `${barras[3]}-${barras[2].padStart(2, "0")}-${barras[1].padStart(2, "0")}`;
  }
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6)}`;
  return null;
}

/**
 * Cabeceras normalizadas (minúsculas, sin acentos, sin puntos ni signos).
 * Ej.: "Imp. Neto Gravado Total" -> "imp neto gravado total",
 *      "IVA 10,5%" -> "iva 10 5".
 */
const ALIAS: Record<string, string> = {
  fecha: "fecha_emision",
  "fecha de emision": "fecha_emision",
  "fecha emision": "fecha_emision",
  tipo: "tipo_comprobante",
  "tipo de comprobante": "tipo_comprobante",
  "punto de venta": "punto_de_venta",
  numero: "numero_comprobante",
  "numero desde": "numero_comprobante",
  "nro comprobante": "numero_comprobante",
  // Contraparte: en "Recibidos" vienen emisor y receptor; en "Emitidos" solo receptor.
  cuit: "cuit_contraparte",
  "nro doc": "cuit_contraparte",
  "nro doc emisor": "doc_emisor",
  "nro doc receptor": "doc_receptor",
  denominacion: "razon_social_contraparte",
  "razon social": "razon_social_contraparte",
  "denominacion emisor": "nombre_emisor",
  "denominacion receptor": "nombre_receptor",
  // Importes
  "neto gravado": "neto_gravado",
  "imp neto gravado": "neto_gravado",
  "imp neto gravado total": "neto_gravado",
  "neto no gravado": "neto_no_gravado",
  "imp neto no gravado": "neto_no_gravado",
  "imp op exentas": "exento",
  exento: "exento",
  iva: "iva_21",
  "iva 21": "iva_21",
  "iva 10 5": "iva_10_5",
  "iva 27": "iva_27",
  "iva 2 5": "iva_2_5",
  "iva 5": "iva_5",
  "percepcion iibb": "percepcion_iibb",
  "percepcion iva": "percepcion_iva",
  total: "total",
  "imp total": "total",
};

function normalizarCabecera(h: string): string {
  const k = h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ALIAS[k] ?? k.replace(/ /g, "_");
}

const redondear = (n: number) => Math.round(n * 100) / 100;

const CODIGOS_NC = new Set(["3", "8", "13", "53", "113", "203", "208", "213"]);
const esNC = (tipo: string) => {
  const t = tipo.trim().toUpperCase();
  return CODIGOS_NC.has(t) || t.startsWith("NC");
};

type Acumulado = {
  cantidad_comprobantes: number;
  cantidad_notas_credito: number;
  neto_gravado: number;
  neto_no_gravado: number;
  exento: number;
  iva_21: number;
  iva_10_5: number;
  iva_27: number;
  iva_otras: number;
  otros_tributos: number;
  total: number;
};

/**
 * Importa un CSV de "Mis Comprobantes" de ARCA (Emitidos o Recibidos) o una
 * planilla propia, y guarda SOLO LOS TOTALES por período en
 * `resumen_iva_periodo` (una fila por cliente / período / libro).
 * Las notas de crédito restan. Reimportar el mismo período lo reemplaza.
 */
export async function importarComprobantes(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const clienteId = String(formData.get("cliente_id") ?? "");
  let tipoOperacion = String(formData.get("tipo_operacion") ?? "VENTA");
  const archivo = formData.get("archivo") as File | null;

  if (!clienteId) return { error: "Elegí el cliente." };
  if (!archivo || archivo.size === 0) return { error: "Elegí un archivo CSV." };
  if (archivo.size > 5 * 1024 * 1024) return { error: "El archivo supera los 5 MB." };

  const texto = (await archivo.text()).replace(/^\uFEFF/, "");
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return { error: "El archivo no tiene filas de datos." };

  const sep = (lineas[0].match(/;/g)?.length ?? 0) > (lineas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const cabeceras = partirLinea(lineas[0], sep).map(normalizarCabecera);

  // Detección automática del libro con los archivos de ARCA:
  // "Recibidos" trae columnas del emisor; "Emitidos" solo del receptor.
  let aviso = "";
  const tieneEmisor = cabeceras.includes("doc_emisor");
  const tieneReceptor = cabeceras.includes("doc_receptor");
  if (tieneEmisor || tieneReceptor) {
    const detectado = tieneEmisor ? "COMPRA" : "VENTA";
    if (detectado !== tipoOperacion) {
      aviso = ` El archivo es de comprobantes ${tieneEmisor ? "recibidos" : "emitidos"}, así que se cargó en el libro de ${detectado === "COMPRA" ? "Compras" : "Ventas"}.`;
      tipoOperacion = detectado;
    }
  }

  const porPeriodo = new Map<string, Acumulado>();
  const errores: string[] = [];

  for (let i = 1; i < lineas.length; i++) {
    const campos = partirLinea(lineas[i], sep);
    const row: Record<string, string> = {};
    cabeceras.forEach((h, j) => (row[h] = campos[j] ?? ""));

    const fecha = aFecha(row.fecha_emision ?? "");
    if (!fecha) {
      errores.push(`Fila ${i + 1}: fecha inválida`);
      continue;
    }

    const periodo = fecha.slice(0, 7);
    let acc = porPeriodo.get(periodo);
    if (!acc) {
      acc = {
        cantidad_comprobantes: 0, cantidad_notas_credito: 0,
        neto_gravado: 0, neto_no_gravado: 0, exento: 0,
        iva_21: 0, iva_10_5: 0, iva_27: 0, iva_otras: 0,
        otros_tributos: 0, total: 0,
      };
      porPeriodo.set(periodo, acc);
    }

    const nc = esNC(row.tipo_comprobante ?? "");
    const s = nc ? -1 : 1;
    acc.cantidad_comprobantes++;
    if (nc) acc.cantidad_notas_credito++;
    acc.neto_gravado += s * aNumero(row.neto_gravado ?? "");
    acc.neto_no_gravado += s * aNumero(row.neto_no_gravado ?? "");
    acc.exento += s * aNumero(row.exento ?? "");
    acc.iva_21 += s * aNumero(row.iva_21 ?? "");
    acc.iva_10_5 += s * aNumero(row.iva_10_5 ?? "");
    acc.iva_27 += s * aNumero(row.iva_27 ?? "");
    acc.iva_otras += s * (aNumero(row.iva_2_5 ?? "") + aNumero(row.iva_5 ?? ""));
    acc.otros_tributos += s * aNumero(row.otros_tributos ?? "");
    acc.total += s * aNumero(row.total ?? "");
  }

  if (porPeriodo.size === 0) {
    return { error: `No se pudo interpretar ninguna fila. ${errores.slice(0, 3).join("; ")}` };
  }

  const filas = Array.from(porPeriodo.entries()).map(([periodo, a]) => {
    const iva_21 = redondear(a.iva_21);
    const iva_10_5 = redondear(a.iva_10_5);
    const iva_27 = redondear(a.iva_27);
    const iva_otras = redondear(a.iva_otras);
    return {
      cliente_id: clienteId,
      periodo_fiscal: periodo,
      tipo_operacion: tipoOperacion,
      cantidad_comprobantes: a.cantidad_comprobantes,
      cantidad_notas_credito: a.cantidad_notas_credito,
      neto_gravado: redondear(a.neto_gravado),
      neto_no_gravado: redondear(a.neto_no_gravado),
      exento: redondear(a.exento),
      iva_21,
      iva_10_5,
      iva_27,
      iva_otras,
      iva_total: redondear(iva_21 + iva_10_5 + iva_27 + iva_otras),
      otros_tributos: redondear(a.otros_tributos),
      total: redondear(a.total),
      archivo_nombre: archivo.name.slice(0, 255),
    };
  });

  const supabase = createClient();
  const { error } = await supabase
    .from("resumen_iva_periodo")
    .upsert(filas, { onConflict: "cliente_id,periodo_fiscal,tipo_operacion" });

  if (error) return { error: `No se pudo importar: ${error.message}` };

  revalidatePath("/admin/comprobantes");
  const libro = tipoOperacion === "COMPRA" ? "Compras" : "Ventas";
  const detalle = filas
    .sort((x, y) => x.periodo_fiscal.localeCompare(y.periodo_fiscal))
    .map((f) => `${f.periodo_fiscal}: ${f.cantidad_comprobantes} comprobantes, IVA $ ${f.iva_total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`)
    .join(" · ");
  return {
    ok:
      `Libro ${libro} actualizado — ${detalle}.` +
      aviso +
      (errores.length ? ` ${errores.length} filas se omitieron por datos inválidos.` : ""),
  };
}

export type SaldoState = { error?: string; ok?: string };

/** Guarda el saldo a favor de IVA que viene del período anterior. */
export async function guardarSaldoFavorAnterior(
  _prev: SaldoState,
  formData: FormData
): Promise<SaldoState> {
  const clienteId = String(formData.get("cliente_id") ?? "");
  const periodo = String(formData.get("periodo") ?? "");
  const monto = aNumero(String(formData.get("saldo_favor_anterior") ?? ""));

  if (!clienteId) return { error: "Elegí el cliente." };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) return { error: "Período inválido." };
  if (monto < 0) return { error: "El saldo a favor no puede ser negativo." };

  const supabase = createClient();
  const { error } = await supabase
    .from("saldos_iva_periodo")
    .upsert(
      { cliente_id: clienteId, periodo_fiscal: periodo, saldo_favor_anterior: monto },
      { onConflict: "cliente_id,periodo_fiscal" }
    );

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/admin/comprobantes");
  return { ok: "Saldo a favor guardado." };
}
