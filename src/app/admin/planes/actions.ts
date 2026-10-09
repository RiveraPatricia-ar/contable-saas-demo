"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MODO_DEMO, MENSAJE_DEMO_BLOQUEADO } from "@/lib/demo";
import { ARCA_DIAS_VENCIMIENTO, RENTAS_DIAS } from "@/lib/constants";

export type PlanState = { error?: string; ok?: boolean; mensaje?: string };

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const txt = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

/**
 * Alta de un plan. Si se indica el mes de la primera cuota, se generan todas
 * las cuotas de una vez con generar_cuotas_plan().
 */
export async function crearPlan(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  const supabase = createClient();

  const origen = String(formData.get("origen") ?? "ARCA") as "ARCA" | "RENTAS";
  const cliente_id = String(formData.get("cliente_id") ?? "");
  const numero_plan = String(formData.get("numero_plan") ?? "").trim();
  const tipo_plan = String(formData.get("tipo_plan") ?? "").trim();
  const cantidad_cuotas = Math.trunc(num(formData.get("cantidad_cuotas")));

  if (!cliente_id || !numero_plan || !tipo_plan) {
    return { error: "Cliente, tipo de plan y número de plan son obligatorios." };
  }
  if (cantidad_cuotas < 1 || cantidad_cuotas > 240) {
    return { error: "La cantidad de cuotas debe estar entre 1 y 240." };
  }

  const esRentas = origen === "RENTAS";
  const rentas_tipo_pp = txt(formData.get("rentas_tipo_pp"));
  const rentas_nro_pp = txt(formData.get("rentas_nro_pp")) ?? numero_plan;

  if (esRentas && !rentas_tipo_pp) {
    return { error: "Para un plan de Rentas hace falta el tipo de plan de pago (ej. 1571)." };
  }

  const { data, error } = await supabase
    .from("planes_pago")
    .insert({
      cliente_id,
      origen,
      tipo_plan,
      numero_plan,
      cantidad_cuotas,
      monto_total_ars: num(formData.get("monto_total_ars")),
      fecha_presentacion: txt(formData.get("fecha_presentacion")),
      dia_vencimiento_1: esRentas ? RENTAS_DIAS.pago : ARCA_DIAS_VENCIMIENTO.primero,
      dia_vencimiento_2: esRentas ? null : ARCA_DIAS_VENCIMIENTO.segundo,
      dia_pago: esRentas ? RENTAS_DIAS.pago : null,
      dia_envio: esRentas ? RENTAS_DIAS.envio : null,
      cbu_debito: esRentas ? null : txt(formData.get("cbu_debito")),
      rentas_tipo_pp: esRentas ? rentas_tipo_pp : null,
      rentas_nro_pp: esRentas ? rentas_nro_pp : null,
      rentas_cod_validacion: esRentas ? txt(formData.get("rentas_cod_validacion")) : null,
      rentas_padron: esRentas ? txt(formData.get("rentas_padron")) : null,
      rentas_obligacion: esRentas ? txt(formData.get("rentas_obligacion")) : null,
      rentas_cod_pago_elec: esRentas ? txt(formData.get("rentas_cod_pago_elec")) : null,
      notas: txt(formData.get("notas")),
    })
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe un plan con ese número en ese organismo."
          : `No se pudo guardar: ${error.message}`,
    };
  }

  const primerMes = txt(formData.get("primer_mes")); // YYYY-MM
  let generadas = 0;
  if (primerMes && data?.id) {
    const { data: n, error: errCuotas } = await supabase.rpc("generar_cuotas_plan", {
      p_plan_id: data.id,
      p_primer_mes: `${primerMes}-01`,
      p_importe: num(formData.get("importe_cuota")) || null,
    });
    if (errCuotas) {
      return {
        ok: true,
        mensaje: `Plan creado, pero no se pudieron generar las cuotas: ${errCuotas.message}`,
      };
    }
    generadas = Number(n ?? 0);
  }

  revalidatePath("/admin/planes");
  return {
    ok: true,
    mensaje: generadas
      ? `Plan creado con ${generadas} cuotas.`
      : "Plan creado. Generá las cuotas desde su ficha.",
  };
}

/** Genera (o completa) las cuotas de un plan ya cargado. */
export async function generarCuotas(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  const supabase = createClient();
  const plan_id = String(formData.get("plan_id") ?? "");
  const primerMes = String(formData.get("primer_mes") ?? "");

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(primerMes)) {
    return { error: "El mes de la primera cuota debe tener el formato AAAA-MM." };
  }

  const { data, error } = await supabase.rpc("generar_cuotas_plan", {
    p_plan_id: plan_id,
    p_primer_mes: `${primerMes}-01`,
    p_importe: num(formData.get("importe_cuota")) || null,
  });

  if (error) return { error: `No se pudieron generar: ${error.message}` };

  revalidatePath(`/admin/planes/${plan_id}`);
  revalidatePath("/admin/planes");
  return { ok: true, mensaje: `Se crearon ${Number(data ?? 0)} cuotas.` };
}

/** Actualiza el estado / importe / VEP de una cuota. */
export async function actualizarCuota(
  cuotaId: string,
  planId: string,
  patch: Record<string, unknown>
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("cuotas_plan")
    .update(patch)
    .eq("id", cuotaId);

  revalidatePath(`/admin/planes/${planId}`);
  revalidatePath("/admin/planes");
  return error ? { error: error.message } : { ok: true };
}

/** Marca una cuota como pagada / impaga. */
export async function marcarCuotaPagada(
  cuotaId: string,
  planId: string,
  pagada: boolean
) {
  return actualizarCuota(cuotaId, planId, {
    estado: pagada ? "PAGADA" : "PENDIENTE",
    fecha_pago: pagada ? new Date().toISOString().slice(0, 10) : null,
  });
}

/** Marca la cuota como enviada al cliente. */
export async function marcarCuotaEnviada(
  cuotaId: string,
  planId: string,
  enviada: boolean,
  canal: string = "WHATSAPP"
) {
  return actualizarCuota(cuotaId, planId, {
    enviada,
    canal_envio: enviada ? canal : null,
    fecha_envio: enviada ? new Date().toISOString().slice(0, 10) : null,
  });
}

/** Recalcula las cuotas vencidas de todos los planes. */
export async function recalcularVencidas(): Promise<PlanState> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("marcar_cuotas_vencidas");
  if (error) return { error: error.message };
  revalidatePath("/admin/planes");
  return { ok: true, mensaje: `${Number(data ?? 0)} cuotas pasaron a vencidas.` };
}

// ---------------------------------------------------------------------------
// Correcciones sobre un plan ya cargado
// ---------------------------------------------------------------------------

/**
 * Corrige los datos de cabecera de un plan. No toca las cuotas: si cambia la
 * cantidad, hay que regenerarlas con borrarCuotas() + generarCuotas().
 */
export async function actualizarPlan(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  const supabase = createClient();
  const id = String(formData.get("plan_id") ?? "");
  const origen = String(formData.get("origen") ?? "ARCA") as "ARCA" | "RENTAS";
  const numero_plan = String(formData.get("numero_plan") ?? "").trim();
  const tipo_plan = String(formData.get("tipo_plan") ?? "").trim();
  const cantidad_cuotas = Math.trunc(num(formData.get("cantidad_cuotas")));

  if (!id) return { error: "Falta el plan a editar." };
  if (!numero_plan || !tipo_plan) {
    return { error: "El tipo y el número de plan son obligatorios." };
  }
  if (cantidad_cuotas < 1 || cantidad_cuotas > 240) {
    return { error: "La cantidad de cuotas debe estar entre 1 y 240." };
  }

  const esRentas = origen === "RENTAS";
  const rentas_tipo_pp = txt(formData.get("rentas_tipo_pp"));
  if (esRentas && !rentas_tipo_pp) {
    return { error: "Para un plan de Rentas hace falta el tipo de plan de pago (ej. 1571)." };
  }

  const { error } = await supabase
    .from("planes_pago")
    .update({
      cliente_id: String(formData.get("cliente_id") ?? ""),
      origen,
      tipo_plan,
      numero_plan,
      cantidad_cuotas,
      monto_total_ars: num(formData.get("monto_total_ars")),
      fecha_presentacion: txt(formData.get("fecha_presentacion")),
      estado: String(formData.get("estado") ?? "VIGENTE"),
      cbu_debito: esRentas ? null : txt(formData.get("cbu_debito")),
      rentas_tipo_pp: esRentas ? rentas_tipo_pp : null,
      rentas_nro_pp: esRentas
        ? txt(formData.get("rentas_nro_pp")) ?? numero_plan
        : null,
      rentas_cod_validacion: esRentas ? txt(formData.get("rentas_cod_validacion")) : null,
      rentas_padron: esRentas ? txt(formData.get("rentas_padron")) : null,
      rentas_obligacion: esRentas ? txt(formData.get("rentas_obligacion")) : null,
      rentas_cod_pago_elec: esRentas ? txt(formData.get("rentas_cod_pago_elec")) : null,
      dia_vencimiento_1: Math.trunc(num(formData.get("dia_vencimiento_1"))) || 16,
      dia_vencimiento_2: esRentas
        ? null
        : Math.trunc(num(formData.get("dia_vencimiento_2"))) || null,
      dia_pago: esRentas ? Math.trunc(num(formData.get("dia_pago"))) || 15 : null,
      dia_envio: esRentas ? Math.trunc(num(formData.get("dia_envio"))) || 10 : null,
      notas: txt(formData.get("notas")),
    })
    .eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe otro plan con ese número en ese organismo."
          : `No se pudo guardar: ${error.message}`,
    };
  }

  revalidatePath(`/admin/planes/${id}`);
  revalidatePath("/admin/planes");
  return { ok: true, mensaje: "Plan actualizado." };
}

/**
 * Borra las cuotas del plan para volver a generarlas. Por seguridad no borra
 * las que ya están pagadas: esas hay que corregirlas a mano.
 */
export async function borrarCuotas(planId: string): Promise<PlanState> {
  if (MODO_DEMO) return { error: MENSAJE_DEMO_BLOQUEADO };
  const supabase = createClient();

  const { count } = await supabase
    .from("cuotas_plan")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId)
    .eq("estado", "PAGADA");

  if (count && count > 0) {
    return {
      error: `Hay ${count} cuota${count === 1 ? "" : "s"} marcada${
        count === 1 ? "" : "s"
      } como pagada${count === 1 ? "" : "s"}. Desmarcala${
        count === 1 ? "" : "s"
      } antes de regenerar, para no perder ese dato.`,
    };
  }

  const { error } = await supabase
    .from("cuotas_plan")
    .delete()
    .eq("plan_id", planId);

  if (error) return { error: `No se pudieron borrar: ${error.message}` };

  revalidatePath(`/admin/planes/${planId}`);
  revalidatePath("/admin/planes");
  return { ok: true, mensaje: "Cuotas borradas. Generalas de nuevo abajo." };
}

/** Elimina el plan entero con todas sus cuotas. No se puede deshacer. */
export async function eliminarPlan(planId: string): Promise<PlanState> {
  if (MODO_DEMO) return { error: MENSAJE_DEMO_BLOQUEADO };
  const supabase = createClient();
  const { error } = await supabase.from("planes_pago").delete().eq("id", planId);
  if (error) return { error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/admin/planes");
  return { ok: true, mensaje: "Plan eliminado." };
}
