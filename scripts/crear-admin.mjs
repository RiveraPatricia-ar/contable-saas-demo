/**
 * Crea un usuario ADMIN con acceso total, o convierte en ADMIN a uno que ya
 * exista. Si el usuario existe, le actualiza la contraseña.
 *
 *   node scripts/crear-admin.mjs <usuario> "<nombre completo>" [contraseña] [email]
 *
 * Ejemplos:
 *   node scripts/crear-admin.mjs 27123456789 "Patricia R."
 *       -> genera una contraseña aleatoria segura y la muestra una sola vez.
 *          Pide cambiarla al primer ingreso.
 *
 *   node scripts/crear-admin.mjs 27123456789 "Patricia R." MiClave2026Segura
 *       -> usa esa contraseña y NO pide cambiarla (la elegiste vos).
 *
 *   node scripts/crear-admin.mjs 27123456789 "Patricia R." MiClave2026Segura patricia@estudio.com.ar
 *       -> además le asigna ese email real a la cuenta.
 *
 * El <usuario> es el número con el que vas a entrar al sistema: tu DNI o tu
 * CUIT, solo dígitos, sin puntos ni guiones.
 *
 * Usa la Admin API de Supabase (SUPABASE_SERVICE_ROLE_KEY de .env.local), así
 * que solo se puede correr desde tu máquina, nunca desde el navegador.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

// --- Carga de .env.local sin dependencias extra -----------------------------
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
  process.exit(1);
}

// --- Argumentos ------------------------------------------------------------
const usuario = (process.argv[2] ?? "").replace(/\D/g, "");
const nombre = (process.argv[3] ?? "").trim();
const passwordArg = process.argv[4] ?? "";
const emailArg = (process.argv[5] ?? "").trim().toLowerCase();

if (!usuario || !nombre) {
  console.error(
    'Uso: node scripts/crear-admin.mjs <usuario> "<nombre completo>" [contraseña] [email]\n' +
      'Ej.: node scripts/crear-admin.mjs 27123456789 "Patricia R."'
  );
  process.exit(1);
}

if (usuario.length < 7 || usuario.length > 11) {
  console.error(
    `El usuario tiene que ser un DNI o CUIT de 7 a 11 dígitos. Recibí: ${usuario}`
  );
  process.exit(1);
}

/** Contraseña aleatoria legible, sin caracteres que se confundan entre sí. */
function generarPassword() {
  const abc = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

const passwordElegida = Boolean(passwordArg);
const password = passwordArg || generarPassword();

if (password.length < 10) {
  console.error("La contraseña tiene que tener al menos 10 caracteres.");
  process.exit(1);
}
if (passwordElegida && (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))) {
  console.error("La contraseña tiene que combinar letras y números.");
  process.exit(1);
}

const dominio =
  process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "estudiocontable.com.ar";
const email = emailArg || `${usuario}@${dominio}`;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- ¿Ya existe el perfil? -------------------------------------------------
const { data: existente, error: errBusqueda } = await admin
  .from("profiles")
  .select("id, username, nombre_completo, email, rol")
  .eq("username", usuario)
  .maybeSingle();

if (errBusqueda) {
  console.error("No se pudo consultar los perfiles:", errBusqueda.message);
  console.error("Revisá que las migraciones estén aplicadas en Supabase.");
  process.exit(1);
}

let userId = existente?.id ?? null;
let creado = false;

if (userId) {
  // Ya existe: se actualiza contraseña y, si corresponde, el email.
  const cambios = { password };
  if (emailArg && emailArg !== existente.email) {
    cambios.email = emailArg;
    cambios.email_confirm = true;
  }

  const { error } = await admin.auth.admin.updateUserById(userId, cambios);
  if (error) {
    console.error("No se pudo actualizar el usuario:", error.message);
    process.exit(1);
  }
} else {
  // No existe: se crea.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: usuario,
      nombre_completo: nombre,
      rol: "ADMIN",
      debe_cambiar_password: !passwordElegida,
    },
  });

  if (error) {
    // Puede existir en auth.users sin perfil (por ejemplo si se creó desde el
    // panel de Supabase). En ese caso se recupera por email.
    if (/already|registered|exists/i.test(error.message)) {
      const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
      userId = lista?.users?.find((u) => u.email === email)?.id ?? null;
      if (!userId) {
        console.error(
          `Ya hay una cuenta con el email ${email} pero no pude recuperarla. ` +
            "Probá pasando otro email como cuarto argumento."
        );
        process.exit(1);
      }
      await admin.auth.admin.updateUserById(userId, { password });
    } else {
      console.error("No se pudo crear el usuario:", error.message);
      process.exit(1);
    }
  } else {
    userId = data.user.id;
    creado = true;
  }
}

// --- Perfil con rol ADMIN --------------------------------------------------
const { error: errPerfil } = await admin.from("profiles").upsert(
  {
    id: userId,
    username: usuario,
    nombre_completo: nombre,
    email: emailArg || existente?.email || email,
    rol: "ADMIN",
    activo: true,
    debe_cambiar_password: !passwordElegida,
  },
  { onConflict: "id" }
);

if (errPerfil) {
  console.error("No se pudo guardar el perfil:", errPerfil.message);
  process.exit(1);
}

// --- Resumen ---------------------------------------------------------------
const linea = "─".repeat(58);
console.log(`\n${linea}`);
console.log(creado ? "  USUARIO ADMIN CREADO" : "  USUARIO ACTUALIZADO A ADMIN");
console.log(linea);
console.log(`  Entrás con   : ${usuario}`);
console.log(`  Contraseña   : ${password}`);
console.log(`  Nombre       : ${nombre}`);
console.log(`  Email        : ${emailArg || existente?.email || email}`);
console.log(`  Rol          : ADMIN (acceso total)`);
console.log(linea);

if (passwordElegida) {
  console.log("  La contraseña es la que elegiste. No se pide cambiarla.");
} else {
  console.log("  Contraseña generada al azar: anotala ahora, no se vuelve");
  console.log("  a mostrar. El sistema te va a pedir cambiarla al entrar.");
}

console.log("  Entrá en http://localhost:3000/login\n");

if (!passwordElegida) {
  console.log(
    "  Sugerencia: limpiá el historial de la consola cuando termines,\n" +
      "  así la contraseña no queda a la vista.\n"
  );
}
