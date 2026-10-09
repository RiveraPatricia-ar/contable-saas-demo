/**
 * Prueba el envío de mail sin depender del resto del sistema.
 *
 *   node scripts/test-mail.mjs                 -> se manda a vos mismo
 *   node scripts/test-mail.mjs otro@mail.com   -> se manda a esa dirección
 */
import nodemailer from "nodemailer";
import { readFileSync, existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const user = process.env.GMAIL_USER;
const pass = (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s/g, "");

if (!user || !pass) {
  console.error("Faltan GMAIL_USER o GMAIL_APP_PASSWORD en .env.local");
  process.exit(1);
}

console.log(`Cuenta   : ${user}`);
console.log(`Clave    : ${pass.length} caracteres`);

const destino = process.argv[2] || user;
const transporte = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
});

try {
  console.log("\nVerificando la conexión con Gmail...");
  await transporte.verify();
  console.log("Conexión OK.");

  console.log(`Enviando un mail de prueba a ${destino}...`);
  const info = await transporte.sendMail({
    from: `Sistema contable <${user}>`,
    to: destino,
    subject: "Prueba de envío del sistema contable",
    text: "Si estás leyendo esto, el envío de mails quedó funcionando.",
  });

  console.log(`\nEnviado. Id del mensaje: ${info.messageId}`);
  console.log("Revisá la bandeja de entrada (y el spam, por las dudas).\n");
} catch (e) {
  console.error("\nFalló:", e.message);
  if (/Invalid login|Username and Password not accepted/i.test(e.message)) {
    console.error(
      "\nGmail rechazó el usuario o la clave. Revisá que:\n" +
        "  · la clave sea una contraseña de aplicación, no la del mail;\n" +
        "  · esté escrita sin espacios;\n" +
        "  · la verificación en dos pasos siga activada en esa cuenta."
    );
  }
  process.exit(1);
}
