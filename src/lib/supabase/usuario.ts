/**
 * Lectura del usuario autenticado tolerante a fallos pasajeros.
 *
 * `supabase.auth.getUser()` no lee la cookie y listo: hace una consulta a
 * Supabase para validar el token. Si esa consulta falla por un problema de
 * red, un corte momentáneo o un error del servidor, devuelve «no hay
 * usuario», exactamente igual que si la sesión hubiera caducado. Tratar los
 * dos casos igual es lo que hacía que el sistema echara a alguien que estaba
 * perfectamente logueado.
 *
 * Acá se distinguen: ante un error de autenticación real (token vencido o
 * inválido) se corta la sesión; ante uno pasajero se reintenta y, si vuelve a
 * fallar, se avisa para que quien llama decida.
 */

type ClienteAuth = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { status?: number; message?: string } | null;
    }>;
  };
};

export interface ResultadoUsuario {
  user: { id: string } | null;
  /** TRUE cuando no se pudo verificar por un problema técnico, no por sesión vencida. */
  fallaTransitoria: boolean;
}

/** Token vencido, inválido o ausente: la sesión realmente no sirve. */
function esErrorDeSesion(error: { status?: number; message?: string } | null) {
  if (!error) return true;
  if (error.status === 401 || error.status === 403) return true;
  const m = (error.message ?? "").toLowerCase();
  return (
    m.includes("jwt") ||
    m.includes("token") ||
    m.includes("session") ||
    m.includes("not authenticated") ||
    m.includes("auth session missing")
  );
}

export async function obtenerUsuario(
  supabase: ClienteAuth,
  intentos = 2
): Promise<ResultadoUsuario> {
  let ultimo: { status?: number; message?: string } | null = null;

  for (let i = 0; i < intentos; i++) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) return { user: data.user, fallaTransitoria: false };

      ultimo = error;
      if (esErrorDeSesion(error)) return { user: null, fallaTransitoria: false };
    } catch (e) {
      // Un fetch que no llegó a destino ni siquiera devuelve error: tira.
      ultimo = { message: e instanceof Error ? e.message : String(e) };
    }

    if (i < intentos - 1) await new Promise((r) => setTimeout(r, 300));
  }

  return { user: null, fallaTransitoria: !esErrorDeSesion(ultimo) };
}

/** ¿El navegador mandó la cookie de sesión de Supabase? */
export function hayCookieDeSesion(
  cookies: { name: string }[]
): boolean {
  return cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}
