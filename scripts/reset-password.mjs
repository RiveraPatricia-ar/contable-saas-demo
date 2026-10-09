/**
 * Restablece la contraseña de un usuario del sistema.
 *
 *   node scripts/reset-password.mjs <usuario> [contraseña nueva]
 *
 * Ejemplos:
 *   node scripts/reset-password.mjs 20111111112
 *       -> la deja igual al usuario (20111111112) y exige cambiarla al entrar.
 *
 *   node scripts/reset-password.mjs 20111111112 MiClaveNueva123
 *       -> la deja en MiClaveNueva123, también con cambio obligatorio.
 *
 * Usa la Admin API de Supabase, así que necesita SUPABASE_SERVICE_ROLE_KEY en
 * .env.local. Nadie puede correrlo desde el navegador.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const usuario = (process.argv[2] ?? "").replace(/\D/g, "");
if (!usuario) {
  console.error("Falta el usuario. Ej: node scripts/reset-password.mjs 20111111112");
  process.exit(1);
}

const nueva = process.argv[3] || usuario;
if (nueva.length < 6) {
  console.error("La contraseña nueva tiene que tener al menos 6 caracteres.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: perfil, error: errPerfil } = await admin
  .from("profiles")
  .select("id, nombre_completo, email, rol")
  .eq("username", usuario)
  .maybeSingle();

if (errPerfil) {
  console.error("No se pudo leer el perfil:", errPerfil.message);
  process.exit(1);
}
if (!perfil) {
  console.error(`No existe ningún usuario con el número ${usuario}.`);
  process.exit(1);
}

const { error: errPass } = await admin.auth.admin.updateUserById(perfil.id, {
  password: nueva,
});

if (errPass) {
  console.error("No se pudo cambiar la contraseña:", errPass.message);
  process.exit(1);
}

// Se vuelve a exigir el cambio al primer ingreso, para que la contraseña que
// viajó por la consola no quede como definitiva.
const { error: errFlag } = await admin
  .from("profiles")
  .update({ debe_cambiar_password: true })
  .eq("id", perfil.id);

if (errFlag) {
  console.error("Aviso: no se pudo marcar el cambio obligatorio:", errFlag.message);
}

console.log("\nContraseña restablecida.");
console.log(`  Usuario     : ${usuario}  (${perfil.nombre_completo})`);
console.log(`  Contraseña  : ${nueva}`);
console.log("  El sistema te va a pedir cambiarla apenas entres.\n");
