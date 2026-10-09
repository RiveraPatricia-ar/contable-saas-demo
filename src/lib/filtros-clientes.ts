/**
 * Filtros por tipo de cliente. Se comparten entre la pantalla de clientes y
 * su exportación a Excel, para que la planilla baje exactamente lo que se ve.
 *
 * El tipo sale de dos campos distintos: la condición frente al IVA para las
 * personas, y la forma jurídica para las sociedades.
 */
export const FILTROS_CLIENTES = [
  { clave: "", etiqueta: "Todos", campo: null, valor: null },
  { clave: "MT", etiqueta: "Monotributo", campo: "condicion_iva", valor: "MONOTRIBUTO" },
  { clave: "RI", etiqueta: "Responsable Inscripto", campo: "condicion_iva", valor: "RESPONSABLE_INSCRIPTO" },
  { clave: "SAS", etiqueta: "SAS", campo: "forma_juridica", valor: "SAS" },
  { clave: "SRL", etiqueta: "SRL", campo: "forma_juridica", valor: "SRL" },
] as const;

export type FiltroCliente = (typeof FILTROS_CLIENTES)[number];

/**
 * Filtro por estado. Por defecto se ven solo los activos: los dados de baja
 * quedan guardados con su historial pero no se mezclan con la cartera.
 */
export const ESTADOS_CLIENTES = [
  { clave: "", etiqueta: "Activos", valor: true },
  { clave: "inactivos", etiqueta: "Inactivos", valor: false },
  { clave: "todos", etiqueta: "Activos e inactivos", valor: null },
] as const;

export type EstadoCliente = (typeof ESTADOS_CLIENTES)[number];

export function estadoPorClave(clave: string | null | undefined): EstadoCliente {
  return ESTADOS_CLIENTES.find((e) => e.clave === clave) ?? ESTADOS_CLIENTES[0];
}

export function filtroPorClave(clave: string | undefined): FiltroCliente {
  return FILTROS_CLIENTES.find((f) => f.clave === clave) ?? FILTROS_CLIENTES[0];
}

/**
 * Convierte lo que se escribió en un patrón ILIKE tolerante: cada palabra
 * separada por comodines, así «molina sofia» encuentra «MOLINA, SOFÍA».
 * Se quitan los signos que rompen la sintaxis de los filtros de PostgREST.
 */
export function patronBusqueda(texto: string): string {
  const palabras = texto
    .replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ&]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return palabras.length ? `%${palabras.join("%")}%` : "";
}

/**
 * Sociedades vinculadas (titular, representante, socio, apoderado) a las
 * personas cuyo nombre o CUIT coincide con la búsqueda. Sirve para que al
 * escribir el nombre del titular aparezcan también sus sociedades.
 */
export async function sociedadesDeTitularesQueCoinciden(
  supabase: any,
  q: string | undefined
): Promise<string[]> {
  const texto = q?.trim();
  if (!texto) return [];
  const patron = patronBusqueda(texto);
  const digitos = texto.replace(/\D/g, "");
  const condiciones = [
    patron ? `razon_social.ilike.${patron}` : null,
    patron ? `alias_planilla.ilike.${patron}` : null,
    digitos.length >= 3 ? `cuit.ilike.%${digitos}%` : null,
  ].filter(Boolean);
  if (condiciones.length === 0) return [];

  const { data: personas } = await supabase
    .from("clientes_estudio")
    .select("id")
    .eq("tipo_persona", "FISICA")
    .or(condiciones.join(","));
  const ids = ((personas ?? []) as { id: string }[]).map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: vinc } = await supabase
    .from("vinculos_cliente")
    .select("sociedad_id")
    .in("persona_id", ids);
  return Array.from(
    new Set(((vinc ?? []) as { sociedad_id: string }[]).map((v) => v.sociedad_id))
  );
}

/**
 * Aplica búsqueda por texto y filtro por tipo a una consulta de
 * clientes_estudio. Genérico para no atarse al tipo exacto del builder.
 *
 * `idsExtra` son clientes que deben aparecer aunque su nombre no coincida:
 * las sociedades del titular buscado (ver sociedadesDeTitularesQueCoinciden).
 */
export function aplicarFiltrosClientes<Q extends { or: Function; ilike: Function; eq: Function }>(
  query: Q,
  q: string | undefined,
  filtro: FiltroCliente,
  idsExtra: string[] = [],
  estado: EstadoCliente = ESTADOS_CLIENTES[0]
): Q {
  let r: any = query;
  const texto = q?.trim();
  if (texto) {
    const patron = patronBusqueda(texto);
    const digitos = texto.replace(/\D/g, "");
    const condiciones = [
      patron ? `razon_social.ilike.${patron}` : null,
      patron ? `nombre_fantasia.ilike.${patron}` : null,
      digitos ? `cuit.ilike.%${digitos}%` : null,
      idsExtra.length ? `id.in.(${idsExtra.join(",")})` : null,
    ].filter(Boolean);
    // Sin condiciones válidas (solo signos), no se devuelve nada.
    r = condiciones.length ? r.or(condiciones.join(",")) : r.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  if (filtro.campo) r = r.eq(filtro.campo, filtro.valor);
  if (estado.valor !== null) r = r.eq("estado_activo", estado.valor);
  return r;
}
