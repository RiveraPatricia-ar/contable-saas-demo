"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TareaState = { error?: string; ok?: boolean };

export async function crearTarea(
  _prev: TareaState,
  formData: FormData
): Promise<TareaState> {
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return { error: "La tarea necesita un título." };

  const supabase = createClient();
  const { error } = await supabase.from("tareas_estudio").insert({
    titulo,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    cliente_id: String(formData.get("cliente_id") ?? "") || null,
    asignado_a: String(formData.get("asignado_a") ?? "") || null,
    prioridad: String(formData.get("prioridad") ?? "MEDIA"),
    fecha_limite: String(formData.get("fecha_limite") ?? "") || null,
  });

  if (error) return { error: `No se pudo crear: ${error.message}` };

  revalidatePath("/admin/tareas");
  return { ok: true };
}

export async function cambiarEstadoTarea(id: string, estado: string) {
  const supabase = createClient();
  await supabase
    .from("tareas_estudio")
    .update({
      estado,
      completada_at:
        estado === "FINALIZADO" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/admin/tareas");
}
