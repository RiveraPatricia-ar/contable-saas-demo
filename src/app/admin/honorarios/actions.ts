"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type HonorarioState = { error?: string; ok?: string };

/**
 * Genera los honorarios del período para todos los clientes activos que
 * tengan un honorario mensual configurado. No duplica los ya generados.
 */
export async function generarHonorariosDelPeriodo(
  _prev: HonorarioState,
  formData: FormData
): Promise<HonorarioState> {
  const periodo = String(formData.get("periodo_fiscal") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    return { error: "El período debe tener el formato AAAA-MM." };
  }

  const supabase = createClient();
  const { data: clientes, error } = await supabase
    .from("clientes_estudio")
    .select("id, honorario_mensual_ars")
    .eq("estado_activo", true)
    .gt("honorario_mensual_ars", 0);

  if (error) return { error: error.message };
  if (!clientes || clientes.length === 0) {
    return { error: "No hay clientes activos con honorario mensual cargado." };
  }

  const [anio, mes] = periodo.split("-").map(Number);
  const vencimiento = new Date(Date.UTC(anio, mes - 1, 10))
    .toISOString()
    .slice(0, 10);

  const filas = clientes.map((c) => ({
    cliente_id: c.id,
    periodo_fiscal: periodo,
    concepto: "Honorarios profesionales",
    monto_ars: c.honorario_mensual_ars,
    estado: "EMITIDA" as const,
    fecha_emision: new Date().toISOString().slice(0, 10),
    fecha_vencimiento: vencimiento,
  }));

  const { error: insertError } = await supabase
    .from("honorarios")
    .upsert(filas, {
      onConflict: "cliente_id,periodo_fiscal,concepto",
      ignoreDuplicates: true,
    });

  if (insertError) return { error: insertError.message };

  revalidatePath("/admin/honorarios");
  return { ok: `Se generaron honorarios para ${filas.length} clientes.` };
}

export async function cambiarEstadoHonorario(id: string, estado: string) {
  const supabase = createClient();
  await supabase
    .from("honorarios")
    .update({
      estado,
      fecha_cobro:
        estado === "COBRADA" ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", id);
  revalidatePath("/admin/honorarios");
  revalidatePath("/admin");
}
