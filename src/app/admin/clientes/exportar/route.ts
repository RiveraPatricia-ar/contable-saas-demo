import { createClient } from "@/lib/supabase/server";
import {
  agregarHoja,
  aFecha,
  nuevoLibro,
  respuestaExcel,
  siNo,
  soloEstudio,
  type Columna,
} from "@/lib/excel";
import {
  ETIQUETAS_ACTIVIDAD,
  ETIQUETAS_ESTADO_PLAN,
  ETIQUETAS_FORMA_JURIDICA,
  ETIQUETAS_IIBB,
  ETIQUETAS_IMPUESTO,
  ETIQUETAS_IVA,
  ETIQUETAS_ROL_VINCULO,
} from "@/lib/constants";
import {
  aplicarFiltrosClientes,
  filtroPorClave,
  estadoPorClave,
  sociedadesDeTitularesQueCoinciden,
} from "@/lib/filtros-clientes";
import { formatCUIT } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Exporta clientes a Excel.
 *
 *   /admin/clientes/exportar?tipo=MT&q=perez   -> la lista filtrada, una fila por cliente
 *   /admin/clientes/exportar?id=<uuid>         -> la ficha completa de un cliente
 *
 * Las claves fiscales NUNCA se exportan: están cifradas y solo se leen de a
 * una, con registro en la auditoría.
 */

// Columnas de la ficha. Se listan a mano, a propósito, en vez de volcar la
// fila entera: así ninguna columna sensible se cuela en la planilla.
const COLUMNAS_FICHA: Columna[] = [
  { titulo: "Razón social", clave: "razon_social", ancho: 34 },
  { titulo: "Nombre de fantasía", clave: "nombre_fantasia", ancho: 22 },
  { titulo: "CUIT", clave: "cuit", ancho: 15 },
  { titulo: "Tipo de persona", clave: "tipo_persona", ancho: 12 },
  { titulo: "Forma jurídica", clave: "forma_juridica", ancho: 14 },
  { titulo: "Condición IVA", clave: "condicion_iva", ancho: 22 },
  { titulo: "Categoría monotributo", clave: "categoria_monotributo", ancho: 12 },
  { titulo: "Actividad monotributo", clave: "actividad_monotributo", ancho: 20 },
  { titulo: "Condición IIBB", clave: "condicion_iibb", ancho: 20 },
  { titulo: "N° IIBB", clave: "numero_iibb", ancho: 16 },
  { titulo: "Padrón Rentas", clave: "padron_rentas", ancho: 16 },
  { titulo: "Aporta monotributo", clave: "aporta_monotributo", ancho: 12 },
  { titulo: "Aporta autónomo", clave: "aporta_autonomo", ancho: 12 },
  { titulo: "Categoría autónomo", clave: "categoria_autonomo", ancho: 12 },
  { titulo: "Actividad principal", clave: "actividad_principal", ancho: 28 },
  { titulo: "Inicio de actividades", clave: "fecha_inicio_actividades", ancho: 14, tipo: "fecha" },
  { titulo: "Tiene empleados", clave: "tiene_empleados", ancho: 10 },
  { titulo: "Cantidad de empleados", clave: "cantidad_empleados", ancho: 10, tipo: "numero" },
  { titulo: "Honorario mensual", clave: "honorario_mensual_ars", ancho: 16, tipo: "moneda" },
  { titulo: "Email", clave: "email_contacto", ancho: 28 },
  { titulo: "Teléfono", clave: "telefono_contacto", ancho: 16 },
  { titulo: "Domicilio fiscal", clave: "domicilio_fiscal", ancho: 32 },
  { titulo: "Provincia", clave: "provincia", ancho: 14 },
  { titulo: "Sociedades / titulares", clave: "vinculos", ancho: 40 },
  { titulo: "Clave fiscal cargada", clave: "tiene_clave", ancho: 12 },
  { titulo: "Alias en la planilla", clave: "alias_planilla", ancho: 28 },
  { titulo: "Estado", clave: "estado_activo", ancho: 10 },
  { titulo: "Notas internas", clave: "notas_internas", ancho: 40 },
];

const SELECCION =
  "id, razon_social, nombre_fantasia, cuit, tipo_persona, forma_juridica, condicion_iva, " +
  "categoria_monotributo, actividad_monotributo, condicion_iibb, numero_iibb, padron_rentas, " +
  "aporta_monotributo, aporta_autonomo, categoria_autonomo, actividad_principal, " +
  "fecha_inicio_actividades, tiene_empleados, cantidad_empleados, honorario_mensual_ars, " +
  "email_contacto, telefono_contacto, domicilio_fiscal, provincia, alias_planilla, " +
  "estado_activo, notas_internas, clave_fiscal_afip_enc";

/** Traduce los códigos internos a texto legible para la planilla. */
function filaLegible(c: any, vinculos: string) {
  return {
    razon_social: c.razon_social,
    nombre_fantasia: c.nombre_fantasia,
    cuit: formatCUIT(c.cuit),
    tipo_persona: c.tipo_persona === "JURIDICA" ? "Jurídica" : "Física",
    forma_juridica: ETIQUETAS_FORMA_JURIDICA[c.forma_juridica] ?? c.forma_juridica,
    condicion_iva: ETIQUETAS_IVA[c.condicion_iva] ?? c.condicion_iva,
    categoria_monotributo: c.categoria_monotributo,
    actividad_monotributo:
      c.condicion_iva === "MONOTRIBUTO"
        ? ETIQUETAS_ACTIVIDAD[c.actividad_monotributo] ?? c.actividad_monotributo
        : null,
    condicion_iibb: ETIQUETAS_IIBB[c.condicion_iibb] ?? c.condicion_iibb,
    numero_iibb: c.numero_iibb,
    padron_rentas: c.padron_rentas,
    aporta_monotributo: siNo(c.aporta_monotributo),
    aporta_autonomo: siNo(c.aporta_autonomo),
    categoria_autonomo: c.categoria_autonomo,
    actividad_principal: c.actividad_principal,
    fecha_inicio_actividades: aFecha(c.fecha_inicio_actividades),
    tiene_empleados: siNo(c.tiene_empleados),
    cantidad_empleados: c.cantidad_empleados,
    honorario_mensual_ars: Number(c.honorario_mensual_ars ?? 0),
    email_contacto: c.email_contacto,
    telefono_contacto: c.telefono_contacto,
    domicilio_fiscal: c.domicilio_fiscal,
    provincia: c.provincia,
    vinculos,
    // Solo se informa SI hay clave, nunca cuál es.
    tiene_clave: siNo(Boolean(c.clave_fiscal_afip_enc)),
    alias_planilla: c.alias_planilla,
    estado_activo: c.estado_activo ? "Activo" : "Inactivo",
    notas_internas: c.notas_internas,
  };
}

export async function GET(request: Request) {
  const supabase = createClient();
  const rechazo = await soloEstudio(supabase);
  if (rechazo) return rechazo;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const hoy = new Date().toISOString().slice(0, 10);

  // Vínculos persona <-> sociedad, para describirlos en texto.
  const { data: vinc } = await supabase
    .from("vinculos_cliente")
    .select(
      "persona_id, sociedad_id, rol_vinculo, persona:persona_id(razon_social), sociedad:sociedad_id(razon_social)"
    );

  const vinculosDe = (clienteId: string) =>
    ((vinc ?? []) as any[])
      .filter((v) => v.persona_id === clienteId || v.sociedad_id === clienteId)
      .map((v) =>
        v.persona_id === clienteId
          ? `${ETIQUETAS_ROL_VINCULO[v.rol_vinculo] ?? v.rol_vinculo} de ${v.sociedad?.razon_social ?? "—"}`
          : `${v.persona?.razon_social ?? "—"} (${(ETIQUETAS_ROL_VINCULO[v.rol_vinculo] ?? v.rol_vinculo).toLowerCase()})`
      )
      .join(" · ");

  // ------------------------------------------------------------------ un cliente
  if (id) {
    const { data: c } = await supabase
      .from("clientes_estudio")
      .select(SELECCION)
      .eq("id", id)
      .maybeSingle();

    if (!c) return new Response("Cliente inexistente", { status: 404 });
    const cliente = c as any;

    const libro = nuevoLibro();
    const legible = filaLegible(cliente, vinculosDe(cliente.id));

    // Hoja 1: la ficha en vertical, campo | valor, que para un solo cliente
    // se lee mucho mejor que una fila de 28 columnas.
    agregarHoja(
      libro,
      "Ficha",
      [
        { titulo: "Campo", clave: "campo", ancho: 26 },
        { titulo: "Valor", clave: "valor", ancho: 50 },
      ],
      COLUMNAS_FICHA.map((col) => ({
        campo: col.titulo,
        valor: (legible as any)[col.clave] ?? "",
      }))
    );

    // Hoja 2: impuestos del año en curso.
    const anio = hoy.slice(0, 4);
    const { data: imp } = await supabase
      .from("declaraciones_juradas")
      .select("*")
      .eq("cliente_id", id)
      .gte("periodo_fiscal", `${anio}-01`)
      .lte("periodo_fiscal", `${anio}-12`)
      .order("periodo_fiscal")
      .order("impuesto_tipo");

    agregarHoja(
      libro,
      `Impuestos ${anio}`,
      [
        { titulo: "Período", clave: "periodo", ancho: 10 },
        { titulo: "Impuesto", clave: "impuesto", ancho: 30 },
        { titulo: "Organismo", clave: "organismo", ancho: 12 },
        { titulo: "Vencimiento", clave: "vencimiento", ancho: 13, tipo: "fecha" },
        { titulo: "Importe", clave: "importe", ancho: 15, tipo: "moneda" },
        { titulo: "Presentada", clave: "presentada", ancho: 11 },
        { titulo: "Boleta generada", clave: "boleta", ancho: 11 },
        { titulo: "Enviada", clave: "enviada", ancho: 10 },
        { titulo: "Pagada", clave: "pagada", ancho: 10 },
      ],
      ((imp ?? []) as any[]).map((o) => ({
        periodo: o.periodo_fiscal,
        impuesto: ETIQUETAS_IMPUESTO[o.impuesto_tipo] ?? o.impuesto_tipo,
        organismo: o.organismo,
        vencimiento: aFecha(o.fecha_vencimiento),
        importe: Number(o.monto_impuesto_ars ?? 0),
        presentada: siNo(o.presentada),
        boleta: siNo(o.boleta_generada),
        enviada: siNo(o.enviada_al_cliente),
        pagada: siNo(o.boleta_pagada),
      }))
    );

    // Hoja 3: planes de pago.
    const { data: planes } = await supabase
      .from("planes_resumen")
      .select("*")
      .eq("cliente_id", id);

    agregarHoja(
      libro,
      "Planes de pago",
      [
        { titulo: "Organismo", clave: "origen", ancho: 12 },
        { titulo: "Tipo de plan", clave: "tipo", ancho: 42 },
        { titulo: "Número", clave: "numero", ancho: 14 },
        { titulo: "Cuotas", clave: "cuotas", ancho: 9, tipo: "numero" },
        { titulo: "Pagadas", clave: "pagadas", ancho: 9, tipo: "numero" },
        { titulo: "Vencidas", clave: "vencidas", ancho: 9, tipo: "numero" },
        { titulo: "Próximo vencimiento", clave: "proximo", ancho: 14, tipo: "fecha" },
        { titulo: "Estado", clave: "estado", ancho: 12 },
      ],
      ((planes ?? []) as any[]).map((p) => ({
        origen: p.origen === "ARCA" ? "ARCA" : "Rentas",
        tipo: p.tipo_plan,
        numero: p.numero_plan,
        cuotas: p.cantidad_cuotas,
        pagadas: Number(p.cuotas_pagadas ?? 0),
        vencidas: Number(p.cuotas_vencidas ?? 0),
        proximo: aFecha(p.proximo_vencimiento),
        estado: ETIQUETAS_ESTADO_PLAN[p.estado] ?? p.estado,
      }))
    );

    const nombre = cliente.razon_social
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    return respuestaExcel(libro, `ficha-${nombre}-${hoy}.xlsx`);
  }

  // ------------------------------------------------------------------ la lista
  const filtro = filtroPorClave(url.searchParams.get("tipo") ?? undefined);
  const qTexto = url.searchParams.get("q") ?? undefined;
  const estado = estadoPorClave(url.searchParams.get("estado"));
  const query = aplicarFiltrosClientes(
    supabase.from("clientes_estudio").select(SELECCION).order("razon_social"),
    qTexto,
    filtro,
    await sociedadesDeTitularesQueCoinciden(supabase, qTexto),
    estado
  );

  const { data, error } = await query;
  if (error) return new Response(`No se pudo leer: ${error.message}`, { status: 500 });

  const libro = nuevoLibro();
  agregarHoja(
    libro,
    filtro.clave ? `Clientes ${filtro.etiqueta}` : "Clientes",
    COLUMNAS_FICHA,
    ((data ?? []) as any[]).map((c) => filaLegible(c, vinculosDe(c.id)))
  );

  const sufijo =
    (filtro.clave ? `-${filtro.clave.toLowerCase()}` : "") +
    (estado.clave ? `-${estado.clave}` : "");
  return respuestaExcel(libro, `clientes${sufijo}-${hoy}.xlsx`);
}
