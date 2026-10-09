import { createClient } from "@/lib/supabase/server";
import type { ClienteEstudio } from "@/types/database";

/**
 * Devuelve los clientes_estudio ligados al usuario autenticado. RLS ya
 * restringe el resultado, así que no hace falta filtrar por user_id acá.
 */
export async function misClientes(): Promise<ClienteEstudio[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clientes_estudio")
    .select("*")
    .order("razon_social");
  return (data ?? []) as ClienteEstudio[];
}

export async function miClientePrincipal(): Promise<ClienteEstudio | null> {
  const clientes = await misClientes();
  return clientes[0] ?? null;
}
