import type { PlanPago } from "@/types/database";

const RENTAS_BASE = "https://www.rentastucuman.gob.ar/nomina/rentastuc2";

/**
 * Formulario de consulta de Planes de Facilidades de Pago de Rentas Tucumán,
 * precargado con los datos del plan. Pide tipo, número, fecha de actualización
 * y código de validación.
 */
export function urlConsultaRentas(
  plan: Pick<PlanPago, "rentas_tipo_pp" | "rentas_nro_pp" | "rentas_cod_validacion">,
  fecha: Date = new Date()
): string | null {
  if (!plan.rentas_tipo_pp || !plan.rentas_nro_pp) return null;
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const params = new URLSearchParams({
    tipopp: plan.rentas_tipo_pp,
    nroppago: plan.rentas_nro_pp,
    fechaActu: `${dd}/${mm}/${fecha.getFullYear()}`,
    validac: plan.rentas_cod_validacion ?? "",
  });
  return `${RENTAS_BASE}/nwbolewebpp.php?${params.toString()}`;
}

/** Boleta (PDF) de una cuota puntual del plan de Rentas. */
export function urlBoletaRentas(
  plan: Pick<PlanPago, "rentas_tipo_pp" | "rentas_nro_pp">,
  numeroCuota: number
): string | null {
  if (!plan.rentas_tipo_pp || !plan.rentas_nro_pp) return null;
  const params = new URLSearchParams({
    tipopp: plan.rentas_tipo_pp,
    nroppago: plan.rentas_nro_pp,
    cuota: String(numeroCuota),
    posi: "0",
  });
  return `${RENTAS_BASE}/boleppago_ws.php?${params.toString()}`;
}

/** Portal de Mis Facilidades de ARCA (requiere clave fiscal del contribuyente). */
export const URL_MIS_FACILIDADES =
  "https://www.afip.gob.ar/misfacilidades/";

/**
 * ¿Toca enviarle al cliente la boleta de este plan de Rentas?
 * El criterio del estudio es mandarla el día 10 de cada mes.
 */
export function tocaEnviarRentas(plan: PlanPago, hoy: Date = new Date()): boolean {
  if (plan.origen !== "RENTAS" || plan.estado !== "VIGENTE") return false;
  return hoy.getDate() >= (plan.dia_envio ?? 10);
}
