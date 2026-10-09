import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuario } from "@/lib/supabase/usuario";
import type { Profile, RolUsuario } from "@/types/database";

/** Devuelve el profile del usuario autenticado, o null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  // Con reintento: un fallo de red momentáneo no debe parecer sesión vencida.
  const { user } = await obtenerUsuario(supabase);
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/**
 * Exige sesion y (opcionalmente) un rol. Redirige a /login, a
 * /cambiar-password si hay cambio pendiente, o al panel que corresponda.
 */
export async function requireProfile(
  rolesPermitidos?: RolUsuario[]
): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  if (profile.debe_cambiar_password) redirect("/cambiar-password");

  if (rolesPermitidos && !rolesPermitidos.includes(profile.rol)) {
    redirect(rutaPorRol(profile.rol));
  }

  return profile;
}

export function rutaPorRol(rol: RolUsuario): string {
  return rol === "CLIENTE" ? "/portal" : "/admin";
}

/**
 * El login acepta CUIT/DNI o email. Supabase Auth trabaja con email, asi que
 * un identificador numerico se resuelve contra profiles.username mediante la
 * funcion SECURITY DEFINER `email_por_username`, que solo devuelve el email y
 * no expone el resto del perfil.
 */
export async function identificadorAEmail(
  identificador: string
): Promise<string | null> {
  const limpio = identificador.trim();
  if (limpio.includes("@")) return limpio.toLowerCase();

  const digitos = limpio.replace(/\D/g, "");
  if (!digitos) return null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("email_por_username", {
    p_username: digitos,
  });

  if (error || !data) return null;
  return data as string;
}
