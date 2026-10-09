import { ESTUDIO } from "@/lib/constants";
import { formatARS, formatFecha } from "@/lib/utils";

/** Nombre de pila, para que el mensaje no arranque con el apellido. */
function primerNombre(razonSocial: string): string {
  const sinComa = razonSocial.includes(",")
    ? razonSocial.split(",")[1]
    : razonSocial;
  return sinComa.trim().split(/\s+/)[0] ?? razonSocial;
}

export interface DatosBoleta {
  razonSocial: string;
  tipoPlan: string;
  numeroPlan: string;
  numeroCuota: number;
  totalCuotas: number;
  vencimiento: string;
  importe: number;
}

/** Texto del mensaje de WhatsApp, con el link de la boleta al final. */
export function mensajeWhatsApp(d: DatosBoleta, linkBoleta?: string | null): string {
  const partes = [
    `Hola ${primerNombre(d.razonSocial)}, ¿cómo estás?`,
    "",
    `Te paso la boleta de la cuota ${d.numeroCuota} de ${d.totalCuotas} del plan de pago de Rentas (${d.tipoPlan}, N° ${d.numeroPlan}).`,
    "",
    `Vence el ${formatFecha(d.vencimiento)}${
      d.importe > 0 ? ` y el importe es de ${formatARS(d.importe)}` : ""
    }.`,
  ];

  if (linkBoleta) partes.push("", linkBoleta);
  partes.push("", `Cualquier duda quedamos a disposición.`, ESTUDIO.nombre);

  return partes.join("\n");
}

/** Link de WhatsApp con el mensaje ya escrito. */
export function linkWhatsApp(telefono: string, mensaje: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length < 8) return null;
  // Se asume Argentina si el número no trae código de país.
  const numero = digitos.startsWith("54") ? digitos : `54${digitos}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function asuntoMail(d: DatosBoleta): string {
  return `Boleta de pago — cuota ${d.numeroCuota}/${d.totalCuotas} — plan ${d.numeroPlan}`;
}

export function cuerpoMail(d: DatosBoleta): { texto: string; html: string } {
  const texto = [
    `Hola ${primerNombre(d.razonSocial)},`,
    "",
    `Adjuntamos la boleta de pago de la cuota ${d.numeroCuota} de ${d.totalCuotas} del plan de Rentas de Tucumán (${d.tipoPlan}, N° ${d.numeroPlan}).`,
    "",
    `Vencimiento: ${formatFecha(d.vencimiento)}`,
    d.importe > 0 ? `Importe: ${formatARS(d.importe)}` : "",
    "",
    "Cualquier consulta quedamos a disposición.",
    "",
    ESTUDIO.nombre,
    ESTUDIO.telefono,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#1f2937;line-height:1.6">
      <p>Hola ${primerNombre(d.razonSocial)},</p>
      <p>
        Adjuntamos la boleta de pago de la <strong>cuota ${d.numeroCuota} de ${d.totalCuotas}</strong>
        del plan de Rentas de Tucumán (${d.tipoPlan}, N° ${d.numeroPlan}).
      </p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr>
          <td style="padding:4px 16px 4px 0;color:#6b7280">Vencimiento</td>
          <td style="padding:4px 0;font-weight:600">${formatFecha(d.vencimiento)}</td>
        </tr>
        ${
          d.importe > 0
            ? `<tr>
                 <td style="padding:4px 16px 4px 0;color:#6b7280">Importe</td>
                 <td style="padding:4px 0;font-weight:600">${formatARS(d.importe)}</td>
               </tr>`
            : ""
        }
      </table>
      <p>Cualquier consulta quedamos a disposición.</p>
      <p style="color:#6b7280;font-size:13px">
        ${ESTUDIO.nombre}<br>${ESTUDIO.telefono}
      </p>
    </div>`;

  return { texto, html };
}

// ---------------------------------------------------------------------------
// Volantes de pago (Monotributo / Autonomos)
// ---------------------------------------------------------------------------

export interface DatosVolante {
  razonSocial: string;
  concepto: "MONOTRIBUTO" | "AUTONOMO";
  periodo: string;
  vencimiento: string;
  importe: number;
  numeroVep?: string | null;
  fechaCalculo?: string | null;
}

function nombreConcepto(c: DatosVolante["concepto"]) {
  return c === "MONOTRIBUTO" ? "monotributo" : "autónomo";
}

export function mensajeVolanteWhatsApp(d: DatosVolante): string {
  // La fecha que le importa al cliente es hasta cuándo está calculado el
  // interés: después de esa fecha el importe ya no sirve. Por eso se muestra
  // esa y no el vencimiento formal del impuesto.
  const fechaTope = d.fechaCalculo ?? d.vencimiento;

  const partes = [
    `Hola ${primerNombre(d.razonSocial)}, ¿cómo estás?`,
    "",
    `Te paso el volante de pago del ${nombreConcepto(d.concepto)}.`,
    "",
    d.importe > 0 ? `Importe: ${formatARS(d.importe)}` : "",
    `Vence el ${formatFecha(fechaTope)}.`,
  ].filter(Boolean);

  if (d.numeroVep) partes.push("", `VEP N° ${d.numeroVep}`);

  partes.push(
    "",
    "Abajo te mando el QR: lo podés escanear o guardar la imagen y pagarlo desde tu billetera o home banking.",
    "",
    "Cualquier duda quedamos a disposición.",
    ESTUDIO.nombre
  );

  return partes.join("\n");
}

export function asuntoVolante(d: DatosVolante): string {
  return `Volante de pago — ${ETIQUETA_CONCEPTO[d.concepto]} ${d.periodo}`;
}

const ETIQUETA_CONCEPTO: Record<string, string> = {
  MONOTRIBUTO: "Monotributo",
  AUTONOMO: "Autónomo",
};

export function cuerpoVolante(d: DatosVolante): { texto: string; html: string } {
  const fechaTope = d.fechaCalculo ?? d.vencimiento;

  const texto = [
    `Hola ${primerNombre(d.razonSocial)},`,
    "",
    `Adjuntamos el volante de pago del ${nombreConcepto(d.concepto)}.`,
    "",
    d.importe > 0 ? `Importe: ${formatARS(d.importe)}` : "",
    `Vence el ${formatFecha(fechaTope)}`,
    d.numeroVep ? `VEP N°: ${d.numeroVep}` : "",
    "",
    "Podés pagarlo escaneando el QR adjunto desde tu billetera virtual o tu home banking.",
    "",
    "Cualquier consulta quedamos a disposición.",
    "",
    ESTUDIO.nombre,
    ESTUDIO.telefono,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#1f2937;line-height:1.6">
      <p>Hola ${primerNombre(d.razonSocial)},</p>
      <p>
        Adjuntamos el volante de pago del <strong>${nombreConcepto(d.concepto)}</strong>.
      </p>
      <table style="border-collapse:collapse;margin:16px 0">
        ${
          d.importe > 0
            ? `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">Importe</td>
                   <td style="padding:4px 0;font-weight:600">${formatARS(d.importe)}</td></tr>`
            : ""
        }
        <tr>
          <td style="padding:4px 16px 4px 0;color:#6b7280">Vence el</td>
          <td style="padding:4px 0;font-weight:600">${formatFecha(fechaTope)}</td>
        </tr>
        ${
          d.numeroVep
            ? `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">VEP N°</td>
                   <td style="padding:4px 0;font-weight:600">${d.numeroVep}</td></tr>`
            : ""
        }
      </table>
      <p>Podés pagarlo escaneando el QR adjunto desde tu billetera virtual o tu home banking.</p>
      <p>Cualquier consulta quedamos a disposición.</p>
      <p style="color:#6b7280;font-size:13px">${ESTUDIO.nombre}<br>${ESTUDIO.telefono}</p>
    </div>`;

  return { texto, html };
}
