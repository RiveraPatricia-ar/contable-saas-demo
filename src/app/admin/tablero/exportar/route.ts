import type ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { nuevoLibro, respuestaExcel, soloEstudio } from "@/lib/excel";
import { aplicarFiltrosClientes, filtroPorClave } from "@/lib/filtros-clientes";
import {
  NOMBRE_MES_CORTO,
  TEXTO_ESTADO,
  coincideCliente,
  etiquetaImpuesto,
  grillaCliente,
  grillaMes,
  type Celda,
  type Obligacion,
} from "@/lib/tablero";
import { formatCUIT } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CAMPOS =
  "cliente_id, impuesto_tipo, periodo_fiscal, fecha_vencimiento, presentada, boleta_pagada, monto_impuesto_ars";

// Los mismos colores que en pantalla: verde presentada, ámbar pendiente,
// rojo vencida sin presentar.
const RELLENO: Record<Celda["estado"], string> = {
  PRESENTADA: "FFD1FAE5",
  PENDIENTE: "FFFEF3C7",
  VENCIDA: "FFFEE2E2",
};
const TINTA: Record<Celda["estado"], string> = {
  PRESENTADA: "FF065F46",
  PENDIENTE: "FF92400E",
  VENCIDA: "FF991B1B",
};

function textoCelda(c?: Celda) {
  if (!c) return "—";
  return c.pagada ? `${TEXTO_ESTADO[c.estado]} · pagada` : TEXTO_ESTADO[c.estado];
}

/** Arma una grilla con encabezado, colores por estado y referencias al pie. */
function hojaGrilla(
  libro: ExcelJS.Workbook,
  nombre: string,
  titulo: string,
  encabezados: string[],
  filas: { rotulo: string; sub?: string; celdas: (Celda | undefined)[] }[]
) {
  const hoja = libro.addWorksheet(nombre.slice(0, 31), {
    views: [{ state: "frozen", xSplit: 1, ySplit: 3 }],
  });

  hoja.getCell("A1").value = titulo;
  hoja.getCell("A1").font = { bold: true, size: 13 };
  hoja.getRow(2).height = 4;

  const enc = hoja.getRow(3);
  enc.values = ["", ...encabezados];
  enc.font = { bold: true, color: { argb: "FFFFFFFF" } };
  enc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  enc.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  enc.height = 32;

  hoja.getColumn(1).width = 36;
  encabezados.forEach((_, i) => (hoja.getColumn(i + 2).width = 16));

  filas.forEach((f, n) => {
    const fila = hoja.getRow(4 + n);
    fila.getCell(1).value = f.sub ? `${f.rotulo}\n${f.sub}` : f.rotulo;
    fila.getCell(1).alignment = { wrapText: true, vertical: "middle" };
    fila.height = f.sub ? 30 : 20;

    f.celdas.forEach((c, i) => {
      const cel = fila.getCell(i + 2);
      cel.value = textoCelda(c);
      cel.alignment = { horizontal: "center", vertical: "middle" };
      if (c) {
        cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RELLENO[c.estado] } };
        cel.font = { color: { argb: TINTA[c.estado] }, bold: c.estado === "VENCIDA" };
      } else {
        cel.font = { color: { argb: "FFBBBBBB" } };
      }
    });
  });

  const pie = 4 + filas.length + 1;
  hoja.getCell(`A${pie}`).value =
    "Presentada: ya se presentó · Pendiente: falta presentar y todavía no venció · Vencida: venció sin presentar · —: no corresponde";
  hoja.getCell(`A${pie}`).font = { italic: true, size: 9, color: { argb: "FF6B7280" } };

  return hoja;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const rechazo = await soloEstudio(supabase);
  if (rechazo) return rechazo;

  const url = new URL(request.url);
  const hoy = new Date().toISOString().slice(0, 10);
  const modo = url.searchParams.get("modo") === "cliente" ? "cliente" : "mes";
  const libro = nuevoLibro();

  if (modo === "mes") {
    const periodo = url.searchParams.get("periodo") ?? hoy.slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      return new Response("Período inválido", { status: 400 });
    }
    const filtro = filtroPorClave(url.searchParams.get("tipo") ?? undefined);

    const { data: cli } = await aplicarFiltrosClientes(
      supabase
        .from("clientes_estudio")
        .select("id, razon_social, cuit")
        .eq("estado_activo", true)
        .order("razon_social"),
      undefined,
      filtro
    );
    const q = url.searchParams.get("q") ?? "";
    const clientes = ((cli ?? []) as { id: string; razon_social: string; cuit: string }[]).filter(
      (c) => coincideCliente(c, q)
    );

    const { data } = clientes.length
      ? await supabase
          .from("declaraciones_juradas")
          .select(CAMPOS)
          .eq("periodo_fiscal", periodo)
          .in("cliente_id", clientes.map((c) => c.id))
      : { data: [] };

    const { impuestos, porCliente } = grillaMes((data ?? []) as Obligacion[], hoy);

    hojaGrilla(
      libro,
      `Impuestos ${periodo}`,
      `Impuestos de ${periodo}${filtro.clave ? ` — ${filtro.etiqueta}` : ""}`,
      impuestos.map(etiquetaImpuesto),
      clientes
        .filter((c) => porCliente.has(c.id))
        .map((c) => ({
          rotulo: c.razon_social,
          sub: formatCUIT(c.cuit),
          celdas: impuestos.map((t) => porCliente.get(c.id)?.get(t)),
        }))
    );

    const sufijo = filtro.clave ? `-${filtro.clave.toLowerCase()}` : "";
    return respuestaExcel(libro, `impuestos-${periodo}${sufijo}.xlsx`);
  }

  // Modo cliente: un año de un cliente.
  const clienteId = url.searchParams.get("cliente");
  const anio = url.searchParams.get("anio") ?? hoy.slice(0, 4);
  if (!clienteId || !/^\d{4}$/.test(anio)) {
    return new Response("Faltan el cliente o el año", { status: 400 });
  }

  const { data: cliente } = await supabase
    .from("clientes_estudio")
    .select("razon_social, cuit")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cliente) return new Response("Cliente inexistente", { status: 404 });

  const { data } = await supabase
    .from("declaraciones_juradas")
    .select(CAMPOS)
    .eq("cliente_id", clienteId)
    .gte("periodo_fiscal", `${anio}-01`)
    .lte("periodo_fiscal", `${anio}-12`);

  const { meses, impuestos, porImpuesto } = grillaCliente(
    (data ?? []) as Obligacion[],
    anio,
    hoy
  );

  hojaGrilla(
    libro,
    `${anio}`,
    `${cliente.razon_social} (${formatCUIT(cliente.cuit)}) — impuestos ${anio}`,
    NOMBRE_MES_CORTO.map((m) => `${m} ${anio}`),
    impuestos.map((t) => ({
      rotulo: etiquetaImpuesto(t),
      celdas: meses.map((m) => porImpuesto.get(t)?.get(m)),
    }))
  );

  const nombre = cliente.razon_social
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return respuestaExcel(libro, `impuestos-${nombre}-${anio}.xlsx`);
}
