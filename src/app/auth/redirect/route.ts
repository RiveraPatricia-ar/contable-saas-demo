import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rutaPorRol } from "@/lib/auth";
import type { RolUsuario } from "@/types/database";

/** Envia al usuario al panel que corresponde a su rol. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(`${origin}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, debe_cambiar_password")
    .eq("id", user.id)
    .single();

  if (profile?.debe_cambiar_password) {
    return NextResponse.redirect(`${origin}/cambiar-password`);
  }

  return NextResponse.redirect(
    `${origin}${rutaPorRol((profile?.rol ?? "CLIENTE") as RolUsuario)}`
  );
}
