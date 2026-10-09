"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { identificadorAEmail, rutaPorRol } from "@/lib/auth";
import type { RolUsuario } from "@/types/database";

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

  const email = await identificadorAEmail(identificador);
  if (!email) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Usuario o contraseña incorrectos." };
  }

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
