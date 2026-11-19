import { createAdminClient } from "@/lib/supabase/server";

/**
 * Límite de intentos de login fallidos (tabla public.intentos_login, 0015).
 *
 * - Por usuario: 5 fallos en 15 minutos bloquean ese usuario 15 minutos.
 * - Por IP: 20 fallos en 15 minutos bloquean esa conexión.
 * El login se procesa en el servidor de Vercel, así que el límite por IP que
 * trae Supabase no distingue atacantes: por eso se lleva la cuenta acá.
 *
 * Si la base no responde, se deja pasar (y se registra el error): es
 * preferible eso a que nadie pueda entrar por un problema técnico.
 */

const VENTANA_MS = 15 * 60 * 1000;
const MAX_POR_USUARIO = 5;
const MAX_POR_IP = 20;

function admin() {
  try {
    return createAdminClient();
  } catch (e) {
    console.error("[limite-login] Sin service role:", e instanceof Error ? e.message : e);
    return null;
  }
}

async function contar(cliente: NonNullable<ReturnType<typeof admin>>, clave: string) {
  const desde = new Date(Date.now() - VENTANA_MS).toISOString();
  const { count, error } = await cliente
    .from("intentos_login")
    .select("id", { count: "exact", head: true })
    .eq("clave", clave)
    .gte("creado", desde);
  if (error) throw error;
  return count ?? 0;
}

export async function loginBloqueado(usuario: string, ip: string): Promise<boolean> {
  const cliente = admin();
  if (!cliente) return false;
  try {
    const [porUsuario, porIp] = await Promise.all([
      contar(cliente, `u:${usuario}`),
      contar(cliente, `ip:${ip}`),
    ]);
    return porUsuario >= MAX_POR_USUARIO || porIp >= MAX_POR_IP;
  } catch (e) {
    console.error("[limite-login] No se pudo consultar:", e);
    return false;
  }
}

export async function registrarFallo(usuario: string, ip: string): Promise<void> {
  const cliente = admin();
  if (!cliente) return;
  const { error } = await cliente
    .from("intentos_login")
    .insert([{ clave: `u:${usuario}` }, { clave: `ip:${ip}` }]);
  if (error) console.error("[limite-login] No se pudo registrar:", error.message);

  // Limpieza: se borra lo que tenga más de un día.
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await cliente.from("intentos_login").delete().lt("creado", ayer);
}

export async function limpiarFallos(usuario: string): Promise<void> {
  const cliente = admin();
  if (!cliente) return;
  await cliente.from("intentos_login").delete().eq("clave", `u:${usuario}`);
}
