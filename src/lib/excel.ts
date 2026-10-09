import ExcelJS from "exceljs";
import { ESTUDIO } from "@/lib/constants";

/**
 * Armado de planillas Excel (.xlsx) para las exportaciones del panel.
 *
 * Se genera en el servidor y se descarga como archivo. No se usa CSV porque
 * el Excel en español lo abre mal (acentos rotos, columnas pegadas por el
 * separador) y no permite formatos de fecha ni de moneda.
 */

export interface Columna {
  titulo: string;
  clave: string;
  ancho?: number;
  tipo?: "texto" | "moneda" | "fecha" | "numero";
}

const AZUL = "FF1E3A5F";
const GRIS = "FFF3F4F6";

export function nuevoLibro() {
  const libro = new ExcelJS.Workbook();
  libro.creator = ESTUDIO.nombre;
  libro.created = new Date();
  return libro;
}

/** Hoja con encabezado de color, filtros y la primera fila congelada. */
export function agregarHoja(
  libro: ExcelJS.Workbook,
  nombre: string,
  columnas: Columna[],
  filas: Record<string, unknown>[]
) {
  // Excel limita el nombre de hoja a 31 caracteres y prohíbe algunos signos.
  const hoja = libro.addWorksheet(nombre.replace(/[\\/?*[\]:]/g, " ").slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  hoja.columns = columnas.map((c) => ({
    header: c.titulo,
    key: c.clave,
    width: c.ancho ?? 18,
    style:
      c.tipo === "moneda"
        ? { numFmt: '"$"#,##0.00' }
        : c.tipo === "fecha"
        ? { numFmt: "dd/mm/yyyy" }
        : {},
  }));

  for (const f of filas) hoja.addRow(f);

  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
  encabezado.alignment = { vertical: "middle", wrapText: true };
  encabezado.height = 30;

  // Filas alternadas para leer mejor.
  hoja.eachRow((fila, n) => {
    if (n > 1 && n % 2 === 0) {
      fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
    }
  });

  if (filas.length > 0) {
    hoja.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnas.length },
    };
  }

  return hoja;
}

/** Fecha ISO (AAAA-MM-DD) a Date para que Excel la reconozca como fecha. */
export function aFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const d = new Date(`${valor.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const siNo = (v: boolean | null | undefined) => (v ? "Sí" : "No");

/** Respuesta HTTP que descarga el libro con el nombre indicado. */
export async function respuestaExcel(libro: ExcelJS.Workbook, nombreArchivo: string) {
  const buffer = await libro.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Las exportaciones solo las puede bajar el estudio. Devuelve una respuesta
 * de error si no corresponde, o null si está todo bien.
 */
export async function soloEstudio(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createClient>
): Promise<Response | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!perfil || !["ADMIN", "CONTADOR_STAFF"].includes(perfil.rol)) {
    return new Response("No autorizado", { status: 403 });
  }
  return null;
}
