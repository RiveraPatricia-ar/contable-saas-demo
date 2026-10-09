import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hayCookieDeSesion, obtenerUsuario } from "@/lib/supabase/usuario";

type CookieAEscribir = { name: string; value: string; options: CookieOptions };

const RUTAS_PUBLICAS = ["/", "/login", "/auth", "/consulta"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieAEscribir[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { user, fallaTransitoria } = await obtenerUsuario(supabase);
  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  // Si no se pudo verificar por un problema técnico pero el navegador trae la
  // cookie de sesión, se deja pasar: es preferible eso a echar a alguien que
  // está trabajando. La página igual valida permisos del lado del servidor.
  if (!user && fallaTransitoria && hayCookieDeSesion(request.cookies.getAll())) {
    return response;
  }

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    // El destino final por rol lo resuelve /auth/redirect.
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/redirect";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
