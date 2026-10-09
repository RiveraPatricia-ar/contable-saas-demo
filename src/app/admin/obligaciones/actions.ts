"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MODO_DEMO, MENSAJE_DEMO_BLOQUEADO } from "@/lib/demo";

export type ObligacionState = { error?: string; ok?: boolean; mensaje?: string };

/** Crea las filas del período según la configuración de cada cliente. */
export async function generarObligacionesMes(
  _prev: ObligacionState,
  formData: FormData
): Promise<ObligacionState> {
  const periodo = String(formData.get("periodo") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    return { error: "El período debe tener el formato AAAA-MM." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("generar_obligaciones_mes", {
    p_periodo: periodo,
  });

  if (error) return { error: `No se pudo generar: ${error.message}` };

  revalidatePath("/admin/obligaciones");
  const n = Number(data ?? 0);
  return {
    ok: true,
    mensaje:
      n === 0
        ? "No había obligaciones nuevas para ese período."
        : `Se crearon ${n} obligaciones para ${periodo}.`,
  };
}

/** Alterna una de las banderas de seguimiento de la obligación. */
export async function marcarObligacion(
  id: string,
  campo: "presentada" | "boleta_generada" | "enviada_al_cliente" | "boleta_pagada",
  valor: boolean
) {
  const supabase = createClient();

  // Al desmarcar hay que limpiar la fecha, si no el trigger la vuelve a dejar.
  const fechas: Record<typeof campo, string> = {
    presentada: "fecha_presentacion",
    boleta_generada: "fecha_boleta",
    enviada_al_cliente: "fecha_envio",
    boleta_pagada: "fecha_pago",
  };

  const patch: Record<string, unknown> = { [campo]: valor };
  if (!valor) patch[fechas[campo]] = null;
  if (!valor && campo === "boleta_pagada") patch.estado = "PENDIENTE";

  const { error } = await supabase
    .from("declaraciones_juradas")
    .update(patch)
    .eq("id", id);

  revalidatePath("/admin/obligaciones");
  revalidatePath("/admin");
  return error ? { error: error.message } : { ok: true };
}

/** Guarda el link de la boleta generada en el organismo. */
export async function guardarBoletaUrl(id: string, url: string) {
  const supabase = createClient();
  await supabase
    .from("declaraciones_juradas")
    .update({
      boleta_url: url.trim() || null,
      boleta_generada: url.trim().length > 0,
    })
    .eq("id", id);
  revalidatePath("/admin/obligaciones");
}

/** Activa o desactiva un impuesto en la configuración de un cliente. */
export async function configurarObligacion(
  _prev: ObligacionState,
  formData: FormData
): Promise<ObligacionState> {
  const supabase = createClient();
  const cliente_id = String(formData.get("cliente_id") ?? "");
  const impuesto_tipo = String(formData.get("impuesto_tipo") ?? "");
  const organismo = String(formData.get("organismo") ?? "ARCA");
  const dia_vencimiento = Number(formData.get("dia_vencimiento") ?? 20);

  if (!cliente_id || !impuesto_tipo) {
    return { error: "Elegí el cliente y el impuesto." };
  }
  if (!Number.isInteger(dia_vencimiento) || dia_vencimiento < 1 || dia_vencimiento > 28) {
    return { error: "El día de vencimiento debe estar entre 1 y 28." };
  }

  const { error } = await supabase
    .from("obligaciones_config")
    .upsert(
      { cliente_id, impuesto_tipo, organismo, dia_vencimiento, activo: true },
      { onConflict: "cliente_id,impuesto_tipo" }
    );

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/admin/obligaciones");
  return { ok: true, mensaje: "Impuesto agregado al seguimiento del cliente." };
}

/**
 * Borra un impuesto cargado por error a un cliente.
 * - "mes": borra solo la fila de ese período.
 * - "siempre": además lo saca de la configuración del cliente (para que
 *   «Generar obligaciones» no lo vuelva a crear) y borra las filas de ese
 *   período en adelante que todavía no se presentaron ni pagaron.
 */
export async function borrarObligacion(
  id: string,
  alcance: "mes" | "siempre"
): Promise<{ error?: string; ok?: boolean }> {
  if (MODO_DEMO) return { error: MENSAJE_DEMO_BLOQUEADO };
  const supabase = createClient();

  const { data: fila, error: errFila } = await supabase
    .from("declaraciones_juradas")
    .select("id, cliente_id, impuesto_tipo, periodo_fiscal")
    .eq("id", id)
    .single();
  if (errFila || !fila) return { error: "No se encontró el impuesto." };

  if (alcance === "siempre") {
    const { error: errCfg } = await supabase
      .from("obligaciones_config")
      .update({ activo: false })
      .eq("cliente_id", fila.cliente_id)
      .eq("impuesto_tipo", fila.impuesto_tipo);
    if (errCfg) return { error: `No se pudo quitar de la configuración: ${errCfg.message}` };

    const { error: errFut } = await supabase
      .from("declaraciones_juradas")
      .delete()
      .eq("cliente_id", fila.cliente_id)
      .eq("impuesto_tipo", fila.impuesto_tipo)
      .gt("periodo_fiscal", fila.periodo_fiscal)
      .eq("presentada", false)
      .eq("boleta_pagada", false);
    if (errFut) return { error: `No se pudieron borrar los meses siguientes: ${errFut.message}` };
  }

  const { error } = await supabase
    .from("declaraciones_juradas")
    .delete()
    .eq("id", id);
  if (error) return { error: `No se pudo borrar: ${error.message}` };

  revalidatePath(`/admin/clientes/${fila.cliente_id}`);
  revalidatePath("/admin/obligaciones");
  revalidatePath("/admin/tablero");
  revalidatePath("/admin");
  return { ok: true };
}
