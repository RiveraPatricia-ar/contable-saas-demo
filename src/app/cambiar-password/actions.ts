"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rutaPorRol } from "@/lib/auth";
import type { RolUsuario } from "@/types/database";

export type CambioState = { error?: string };

const DEBILES = ["12345678", "contraseña", "password", "admin"];

export async function cambiarPassword(
  _prev: CambioState,
  formData: FormData
): Promise<CambioState> {
  const nueva = String(formData.get("password") ?? "");
  const repetida = String(formData.get("password_repetida") ?? "");

  if (nueva.length < 10) {
    return { error: "La contraseña debe tener al menos 10 caracteres." };
  }
  if (nueva !== repetida) {
    return { error: "Las contraseñas no coinciden." };
  }
  if (DEBILES.some((d) => nueva.toLowerCase().includes(d))) {
    return {
      error:
        "Elegí una contraseña que no incluya tu documento ni palabras obvias.",
    };
  }
  if (!/[a-zA-Z]/.test(nueva) || !/[0-9]/.test(nueva)) {
    return { error: "Combiná al menos letras y números." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: "No se pudo actualizar la contraseña." };

  const { data: profile } = await supabase
    .from("profiles")
    .update({ debe_cambiar_password: false })
    .eq("id", user.id)
    .select("rol")
    .single();

  revalidatePath("/", "layout");
  redirect(rutaPorRol((profile?.rol ?? "CLIENTE") as RolUsuario));
}
