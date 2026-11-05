import { createClient } from "@/lib/supabase/server";
import { aFecha, agregarHoja, nuevoLibro, respuestaExcel, siNo, soloEstudio } from "@/lib/excel";
import { ETIQUETAS_IMPUESTO } from "@/lib/constants";
import { formatCUIT } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Fila = {
  impuesto_tipo: string;
  fecha_vencimiento: string | null;
  monto_impuesto_ars: number | null;
  presentada: boolean;
  fecha_presentacion: string | null;
  boleta_generada: boolean;
  fecha_boleta: string | null;
  enviada_al_cliente: boolean;
  fecha_envio: string | null;
  boleta_pagada: boolean;
  fecha_pago: string | null;
  boleta_url: string | null;
  notas: string | null;
  clientes_estudio: { razon_social: string; cuit: string } | null;
};

/** Exporta a Excel lo mismo que muestra «Impuestos del mes» con el filtro aplicado. */
export async function GET(request: Request) {
  const supabase = createClient();
  const rechazo = await soloEstudio(supabase);
  if (rechazo) return rechazo;

  const url = new URL(request.url);
  const periodo = url.searchParams.get("periodo") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    return new Response("Período inválido", { status: 400 });
  }
  const clienteId = url.searchParams.get("cliente")?.trim() || "";
  const impuesto = url.searchParams.get("impuesto")?.trim() || "";

  let consulta = supabase
    .from("declaraciones_juradas")
    .select(
      "impuesto_tipo, fecha_vencimiento, monto_impuesto_ars, presentada, fecha_presentacion, boleta_generada, fecha_boleta, enviada_al_cliente, fecha_envio, boleta_pagada, fecha_pago, boleta_url, notas, clientes_estudio(razon_social, cuit)"
    )
    .eq("periodo_fiscal", periodo)
    .order("fecha_vencimiento");
  if (clienteId) consulta = consulta.eq("cliente_id", clienteId);
  if (impuesto) consulta = consulta.eq("impuesto_tipo", impuesto);

  const { data, error } = await consulta;
  if (error) return new Response(error.message, { status: 500 });

  // Mismo orden que en pantalla: por vencimiento.
  const filas = (data ?? []) as unknown as Fila[];

  const libro = nuevoLibro();
  agregarHoja(
    libro,
    `Impuestos ${periodo}`,
    [
      { titulo: "Cliente", clave: "cliente", ancho: 36 },
      { titulo: "CUIT", clave: "cuit", ancho: 15 },
      { titulo: "Impuesto", clave: "impuesto", ancho: 24 },
      { titulo: "Vence", clave: "vence", ancho: 12, tipo: "fecha" },
      { titulo: "Importe", clave: "importe", ancho: 15, tipo: "moneda" },
      { titulo: "Presentada", clave: "presentada", ancho: 11 },
      { titulo: "Fecha presentación", clave: "f_pres", ancho: 13, tipo: "fecha" },
      { titulo: "Boleta generada", clave: "boleta", ancho: 11 },
      { titulo: "Enviada al cliente", clave: "enviada", ancho: 11 },
      { titulo: "Fecha envío", clave: "f_envio", ancho: 13, tipo: "fecha" },
      { titulo: "Pagada", clave: "pagada", ancho: 10 },
      { titulo: "Fecha pago", clave: "f_pago", ancho: 13, tipo: "fecha" },
      { titulo: "Link boleta", clave: "link", ancho: 40 },
      { titulo: "Notas", clave: "notas", ancho: 40 },
    ],
    filas.map((o) => ({
      cliente: o.clientes_estudio?.razon_social ?? "",
      cuit: o.clientes_estudio ? formatCUIT(o.clientes_estudio.cuit) : "",
      impuesto: ETIQUETAS_IMPUESTO[o.impuesto_tipo] ?? o.impuesto_tipo,
      vence: aFecha(o.fecha_vencimiento),
      importe: Number(o.monto_impuesto_ars ?? 0),
      presentada: siNo(o.presentada),
      f_pres: aFecha(o.fecha_presentacion),
      boleta: siNo(o.boleta_generada),
      enviada: siNo(o.enviada_al_cliente),
      f_envio: aFecha(o.fecha_envio),
      pagada: siNo(o.boleta_pagada),
      f_pago: aFecha(o.fecha_pago),
      link: o.boleta_url ?? "",
      notas: o.notas ?? "",
    }))
  );

  let sufijo = "";
  if (clienteId) {
    const nombre = filas[0]?.clientes_estudio?.razon_social ?? "cliente";
    sufijo += `-${nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()}`;
  }
  if (impuesto) sufijo += `-${impuesto.toLowerCase().replace(/_/g, "-")}`;

  return respuestaExcel(libro, `impuestos-del-mes-${periodo}${sufijo}.xlsx`);
}
