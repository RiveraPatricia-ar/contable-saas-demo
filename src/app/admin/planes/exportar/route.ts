import { createClient } from "@/lib/supabase/server";
import { aFecha, agregarHoja, nuevoLibro, respuestaExcel, soloEstudio } from "@/lib/excel";
import { ETIQUETAS_ESTADO_PLAN } from "@/lib/constants";
import { formatCUIT } from "@/lib/utils";
import type { PlanResumen } from "@/types/database";

export const dynamic = "force-dynamic";

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Exporta a Excel los planes de pago con la misma búsqueda y filtro de la pantalla. */
export async function GET(request: Request) {
  const supabase = createClient();
  const rechazo = await soloEstudio(supabase);
  if (rechazo) return rechazo;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const soloVencidas = url.searchParams.get("vencidas") === "1";

  const { data, error } = await supabase
    .from("planes_resumen")
    .select("*")
    .order("origen")
    .order("razon_social");
  if (error) return new Response(error.message, { status: 500 });

  let planes = (data ?? []) as PlanResumen[];

  // Mismo criterio que la pantalla: todas las palabras en el nombre, o los números en el CUIT.
  if (q) {
    const palabras = normalizar(q).split(/[^a-z0-9ñ&]+/).filter(Boolean);
    const digitos = q.replace(/\D/g, "");
    planes = planes.filter((p) => {
      const nombre = normalizar(p.razon_social ?? "");
      const porNombre = palabras.length > 0 && palabras.every((w) => nombre.includes(w));
      const porCuit = digitos.length >= 3 && (p.cuit ?? "").replace(/\D/g, "").includes(digitos);
      return porNombre || porCuit;
    });
  }
  if (soloVencidas) planes = planes.filter((p) => p.cuotas_vencidas > 0);

  const libro = nuevoLibro();
  agregarHoja(
    libro,
    soloVencidas ? "Planes con cuotas vencidas" : "Planes de pago",
    [
      { titulo: "Cliente", clave: "cliente", ancho: 36 },
      { titulo: "CUIT", clave: "cuit", ancho: 15 },
      { titulo: "Organismo", clave: "organismo", ancho: 15 },
      { titulo: "Plan", clave: "plan", ancho: 48 },
      { titulo: "N° plan", clave: "numero", ancho: 13 },
      { titulo: "Presentado", clave: "presentado", ancho: 12, tipo: "fecha" },
      { titulo: "Monto total", clave: "total", ancho: 16, tipo: "moneda" },
      { titulo: "Cuotas", clave: "cuotas", ancho: 9, tipo: "numero" },
      { titulo: "Pagadas", clave: "pagadas", ancho: 9, tipo: "numero" },
      { titulo: "Vencidas", clave: "vencidas", ancho: 9, tipo: "numero" },
      { titulo: "Pendientes", clave: "pendientes", ancho: 10, tipo: "numero" },
      { titulo: "Pagado", clave: "pagado", ancho: 16, tipo: "moneda" },
      { titulo: "Vencido impago", clave: "vencido", ancho: 16, tipo: "moneda" },
      { titulo: "Próximo vto.", clave: "proximo", ancho: 12, tipo: "fecha" },
      { titulo: "Estado", clave: "estado", ancho: 11 },
      { titulo: "Notas", clave: "notas", ancho: 40 },
    ],
    planes.map((p) => ({
      cliente: p.razon_social ?? "",
      cuit: p.cuit ? formatCUIT(p.cuit) : "",
      organismo: p.origen === "ARCA" ? "ARCA" : "Rentas Tucumán",
      plan: p.tipo_plan ?? "",
      numero: p.numero_plan ?? "",
      presentado: aFecha(p.fecha_presentacion),
      total: Number(p.monto_total_ars ?? 0),
      cuotas: Number(p.cantidad_cuotas ?? 0),
      pagadas: Number(p.cuotas_pagadas ?? 0),
      vencidas: Number(p.cuotas_vencidas ?? 0),
      pendientes: Number(p.cuotas_pendientes ?? 0),
      pagado: Number(p.pagado_ars ?? 0),
      vencido: Number(p.vencido_ars ?? 0),
      proximo: aFecha(p.proximo_vencimiento),
      estado: ETIQUETAS_ESTADO_PLAN[p.estado] ?? p.estado,
      notas: p.notas ?? "",
    }))
  );

  const hoy = new Date().toISOString().slice(0, 10);
  return respuestaExcel(
    libro,
    `planes-de-pago${soloVencidas ? "-con-vencidas" : ""}${q ? "-filtrado" : ""}-${hoy}.xlsx`
  );
}
