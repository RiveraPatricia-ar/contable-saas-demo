import { createClient } from "@/lib/supabase/server";
import { miClientePrincipal } from "@/lib/portal";
import { getProfile } from "@/lib/auth";
import { NuevaConsulta, HiloConsulta } from "./componentes";
import { Card, CardContent } from "@/components/ui/card";
import type { Consulta, ConsultaMensaje, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export type MensajeConAutor = ConsultaMensaje & {
  profiles: Pick<Profile, "nombre_completo" | "rol"> | null;
};

export default async function ConsultasPage() {
  const [cliente, profile] = await Promise.all([
    miClientePrincipal(),
    getProfile(),
  ]);

  if (!cliente) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay un CUIT vinculado a tu usuario.
      </p>
    );
  }

  const supabase = createClient();
  const { data: consultasData } = await supabase
    .from("consultas")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("updated_at", { ascending: false });

  const consultas = (consultasData ?? []) as Consulta[];

  const { data: mensajesData } = await supabase
    .from("consulta_mensajes")
    .select("*, profiles:autor_id(nombre_completo, rol)")
    .in("consulta_id", consultas.map((c) => c.id).length ? consultas.map((c) => c.id) : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: true });

  const mensajes = (mensajesData ?? []) as MensajeConAutor[];

  return (
    <div className="space-y-5">
      <NuevaConsulta clienteId={cliente.id} />

      {consultas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No abriste ninguna consulta todavía.
          </CardContent>
        </Card>
      ) : (
        consultas.map((c) => (
          <HiloConsulta
            key={c.id}
            consulta={c}
            mensajes={mensajes.filter((m) => m.consulta_id === c.id)}
            usuarioId={profile?.id ?? ""}
          />
        ))
      )}
    </div>
  );
}
