"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RecatState = { error?: string; ok?: boolean; mensaje?: string };

/** Aplica la categoría sugerida al legajo y deja registrada la fecha. */
export async function aplicarCategoria(clienteId: string, categoria: string) {
  if (!/^[A-K]$/.test(categoria)) return { error: "Categoría inválida." };

  const supabase = createClient();
  const { error } = await supabase
    .from("clientes_estudio")
    .update({
      categoria_monotributo: categoria,
      fecha_ultima_recategorizacion: new Date().toISOString().slice(0, 10),
    })
    .eq("id", clienteId);

  revalidatePath("/admin/recategorizacion");
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin");
  return error ? { error: error.message } : { ok: true };
}

/**
 * Carga a mano los ingresos de los últimos 12 meses. Tiene prioridad sobre la
 * suma de comprobantes, para los clientes que no facturan dentro del sistema.
 * Un valor vacío vuelve a dejar que mande el sistema.
 */
export async function guardarIngresosManuales(
  clienteId: string,
  valor: number | null
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("clientes_estudio")
    .update({ ingresos_12m_manual: valor })
    .eq("id", clienteId);

  revalidatePath("/admin/recategorizacion");
  return error ? { error: error.message } : { ok: true };
}

/** Saca al cliente del tablero de avisos. */
export async function excluirDeRecategorizacion(clienteId: string) {
  const supabase = createClient();
  await supabase
    .from("clientes_estudio")
    .update({ excluir_de_recategorizacion: true })
    .eq("id", clienteId);

  revalidatePath("/admin/recategorizacion");
}
