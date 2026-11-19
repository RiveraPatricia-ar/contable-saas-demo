"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { identificadorAEmail, rutaPorRol } from "@/lib/auth";
import type { RolUsuario } from "@/types/database";
import { limpiarFallos, loginBloqueado, registrarFallo } from "@/lib/limite-login";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identificador = String(formData.get("identificador") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identificador || !password) {
    return { error: "Completá tu usuario y tu contraseña." };
  }

  // Clave del limite de intentos: los digitos del CUIT/DNI, o el email.
  const usuario = identificador.includes("@")
    ? identificador.toLowerCase()
    : identificador.replace(/\D/g, "");
  const h = headers();
  const ip =
    h.get("x-real-ip") ??
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ??
    "sin-ip";

  // Mismo mensaje exista o no el usuario, para no revelar quien es cliente.
  if (await loginBloqueado(usuario, ip || "sin-ip")) {
    return {
      error:
        "Demasiados intentos fallidos. Esperá 15 minutos y probá de nuevo, o contactá al estudio.",
    };
  }

  const email = await identificadorAEmail(identificador);
  if (!email) {
    await registrarFallo(usuario, ip || "sin-ip");
    return { error: "Usuario o contraseña incorrectos." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await registrarFallo(usuario, ip || "sin-ip");
    return { error: "Usuario o contraseña incorrectos." };
  }

  await limpiarFallos(usuario);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, debe_cambiar_password, activo")
    .eq("id", user!.id)
    .single();

  if (profile && !profile.activo) {
    await supabase.auth.signOut();
    return { error: "Tu usuario está desactivado. Contactá al estudio." };
  }

  revalidatePath("/", "layout");

  if (profile?.debe_cambiar_password) redirect("/cambiar-password");
  redirect(rutaPorRol((profile?.rol ?? "CLIENTE") as RolUsuario));
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
