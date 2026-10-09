import { createClient } from "@/lib/supabase/server";
import { NuevaTarea } from "./nueva-tarea";
import { TableroTareas } from "./tablero";
import type { ClienteEstudio, Profile, TareaEstudio } from "@/types/database";

export const dynamic = "force-dynamic";

export type TareaConRelaciones = TareaEstudio & {
  clientes_estudio: Pick<ClienteEstudio, "razon_social"> | null;
  profiles: Pick<Profile, "nombre_completo"> | null;
};

export default async function TareasPage() {
  const supabase = createClient();

  const [tareasRes, clientesRes, staffRes] = await Promise.all([
    supabase
      .from("tareas_estudio")
      .select("*, clientes_estudio(razon_social), profiles:asignado_a(nombre_completo)")
      .order("fecha_limite", { ascending: true, nullsFirst: false })
      .limit(200),
    supabase
      .from("clientes_estudio")
      .select("id, razon_social")
      .eq("estado_activo", true)
      .order("razon_social"),
    supabase
      .from("profiles")
      .select("id, nombre_completo")
      .in("rol", ["ADMIN", "CONTADOR_STAFF"]),
  ]);

  return (
    <div className="space-y-5">
      <NuevaTarea
        clientes={(clientesRes.data ?? []) as { id: string; razon_social: string }[]}
        staff={(staffRes.data ?? []) as { id: string; nombre_completo: string }[]}
      />
      <TableroTareas tareas={(tareasRes.data ?? []) as TareaConRelaciones[]} />
    </div>
  );
}
