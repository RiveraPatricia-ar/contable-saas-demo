import nodemailer from "nodemailer";
import { ESTUDIO } from "@/lib/constants";

/**
 * Envio de mail por la cuenta de Gmail del estudio.
 *
 * Requiere en .env.local:
 *   GMAIL_USER=estudio@gmail.com
 *   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx   (contraseña de aplicacion, 16 letras)
 *
 * La contraseña de aplicacion se genera en la cuenta de Google, en Seguridad ->
 * Verificacion en dos pasos -> Contraseñas de aplicacion. NO es la contraseña
 * normal de la cuenta, y hay que tener activada la verificacion en dos pasos.
 *
 * Limite practico de Gmail: unos 500 destinatarios por dia.
 */
export function mailConfigurado(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function transporte() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      // Google la muestra en grupos de cuatro; los espacios se sacan acá
      // para que no importe cómo se haya pegado.
      pass: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s/g, ""),
    },
  });
}

export interface Adjunto {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export async function enviarMail(opciones: {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
  adjuntos?: Adjunto[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!mailConfigurado()) {
    return {
      ok: false,
      error:
        "Falta configurar GMAIL_USER y GMAIL_APP_PASSWORD en .env.local para poder enviar mails.",
    };
  }

  try {
    await transporte().sendMail({
      from: `${ESTUDIO.nombre} <${process.env.GMAIL_USER}>`,
      to: opciones.para,
      subject: opciones.asunto,
      text: opciones.texto,
      html: opciones.html,
      attachments: opciones.adjuntos,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
