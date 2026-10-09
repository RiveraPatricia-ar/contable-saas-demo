"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { VOLANTES_DIAS } from "@/lib/constants";
import {
  ESCALA_MONOTRIBUTO,
  cuotaMensual,
} from "@/lib/parametros-fiscales";
import { enviarMail, mailConfigurado } from "@/lib/mail";
import {
  asuntoVolante,
  cuerpoVolante,
  type DatosVolante,
} from "@/lib/mensajes";

export type VolanteState = { error?: string; ok?: boolean; mensaje?: string };

const BUCKET = "documentos";

/** Día D del mes de un período AAAA-MM, como AAAA-MM-DD. */
function diaDelPeriodo(periodo: string, dia: number): string {
  return `${periodo}-${String(dia).padStart(2, "0")}`;
}

/** Hoy más N días, en formato AAAA-MM-DD. */
function hoyMas(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Arma los volantes del período para todos los clientes que aportan.
 *
 * El importe del monotributo sale de la escala según la categoría y la
 * actividad del cliente. El de autónomos queda en cero: no hay una tabla de
 * categorías cargada, así que se completa a mano con lo que devuelva la CCMA.
 *
 * Es idempotente: no pisa los volantes que ya existen.
 */
export async function generarVolantesMes(
  _prev: VolanteState,
  formData: FormData
): Promise<VolanteState> {
  const periodo = String(formData.get("periodo") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    return { error: "El período debe tener el formato AAAA-MM." };
  }

  const supabase = createClient();
  const { data: aportantes, error } = await supabase
    .from("aportantes")
    .select("*");

  if (error) return { error: `No se pudieron leer los clientes: ${error.message}` };
  if (!aportantes || aportantes.length === 0) {
    return {
      ok: true,
      mensaje:
        "Ningún cliente tiene marcados los aportes. Se marcan en su ficha, en «Aportes previsionales».",
    };
  }

  const fechaCalculo = hoyMas(VOLANTES_DIAS.margenCalculo);
  const filas: Record<string, unknown>[] = [];

  for (const a of aportantes as any[]) {
    if (a.aporta_monotributo) {
      const cat = ESCALA_MONOTRIBUTO.find(
        (c) => c.categoria === a.categoria_monotributo
      );
      filas.push({
        cliente_id: a.cliente_id,
        concepto: "MONOTRIBUTO",
        periodo,
        fecha_vencimiento: diaDelPeriodo(periodo, VOLANTES_DIAS.monotributo),
        periodo_desde: periodo,
        periodo_hasta: periodo,
        fecha_calculo: fechaCalculo,
        categoria: a.categoria_monotributo,
        importe_ars: cat
          ? cuotaMensual(cat, a.actividad_monotributo ?? "SERVICIOS")
          : 0,
      });
    }

    if (a.aporta_autonomo) {
      filas.push({
        cliente_id: a.cliente_id,
        concepto: "AUTONOMO",
        periodo,
        fecha_vencimiento: diaDelPeriodo(periodo, VOLANTES_DIAS.autonomo),
        periodo_desde: periodo,
        periodo_hasta: periodo,
        fecha_calculo: fechaCalculo,
        categoria: a.categoria_autonomo,
        importe_ars: 0,
      });
    }
  }

  if (filas.length === 0) {
    return { ok: true, mensaje: "No hay volantes para generar en este período." };
  }

  // Idempotencia: se saltean los que ya tienen una emisión vigente. Antes se
  // resolvía con un UNIQUE, pero ahora un período puede tener varias
  // emisiones (con distinta fecha de cálculo) y solo una vigente.
  const { data: existentes } = await supabase
    .from("volantes_pago")
    .select("cliente_id, concepto")
    .eq("periodo", periodo)
    .eq("reemplazado", false);

  const ya = new Set(
    (existentes ?? []).map((e: any) => `${e.cliente_id}|${e.concepto}`)
  );
  const nuevas = filas.filter(
    (f) => !ya.has(`${f.cliente_id}|${f.concepto}`)
  );

  if (nuevas.length === 0) {
    return {
      ok: true,
      mensaje: `Los ${filas.length} volantes de ${periodo} ya estaban armados.`,
    };
  }

  const { error: errInsert } = await supabase
    .from("volantes_pago")
    .insert(nuevas);

  if (errInsert) return { error: `No se pudieron crear: ${errInsert.message}` };

  revalidatePath("/admin/volantes");

  const n = nuevas.length;
  return {
    ok: true,
    mensaje: `${n} volante${n === 1 ? "" : "s"} armado${
      n === 1 ? "" : "s"
    }${n < filas.length ? ` (${filas.length - n} ya estaban)` : ""}. Fecha de cálculo: ${fechaCalculo}.`,
  };
}

/** Guarda un dato suelto del volante (importe, VEP, fechas, períodos). */
export async function actualizarVolante(
  id: string,
  patch: Record<string, unknown>
): Promise<VolanteState> {
  const supabase = createClient();
  const { error } = await supabase
    .from("volantes_pago")
    .update(patch)
    .eq("id", id);

  revalidatePath("/admin/volantes");
  return error ? { error: error.message } : { ok: true };
}

/** Sube el QR capturado o el PDF del VEP. */
export async function subirVolante(
  _prev: VolanteState,
  formData: FormData
): Promise<VolanteState> {
  const supabase = createClient();
  const id = String(formData.get("volante_id") ?? "");
  const archivo = formData.get("archivo") as File | null;

  if (!id) return { error: "Falta el volante." };
  if (!archivo || archivo.size === 0) return { error: "Elegí el archivo." };
  if (archivo.size > 10 * 1024 * 1024) return { error: "El archivo supera los 10 MB." };

  const tipo = archivo.type || "application/octet-stream";
  const permitidos = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
  if (!permitidos.includes(tipo)) {
    return { error: "Tiene que ser una imagen (PNG o JPG) o un PDF." };
  }

  const { data: volante } = await supabase
    .from("volantes_pago")
    .select("*, clientes_estudio(razon_social)")
    .eq("id", id)
    .maybeSingle();

  if (!volante) return { error: "No se encontró el volante." };

  const extension = tipo === "application/pdf" ? "pdf" : tipo.split("/")[1];
  const ruta = `${volante.cliente_id}/VOLANTES/${volante.periodo}-${volante.concepto}.${extension}`;

  const bytes = Buffer.from(await archivo.arrayBuffer());
  const { error: errUp } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, bytes, { contentType: tipo, upsert: true });

  if (errUp) return { error: `No se pudo guardar: ${errUp.message}` };

  await supabase
    .from("volantes_pago")
    .update({ path_archivo: ruta, mime_type: tipo, generado: true })
    .eq("id", id);

  await supabase.from("documentos").insert({
    cliente_id: volante.cliente_id,
    titulo: `Volante de pago ${volante.concepto === "MONOTRIBUTO" ? "Monotributo" : "Autónomo"} — ${volante.periodo}`,
    categoria: "VEP",
    periodo_fiscal: volante.periodo,
    path_archivo: ruta,
    mime_type: tipo,
    tamano_bytes: bytes.length,
    visible_cliente: true,
  });

  revalidatePath("/admin/volantes");
  return { ok: true, mensaje: "Guardado. Ya se puede enviar." };
}

/** URL firmada para ver el QR o el VEP guardado. */
export async function urlVolante(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

/** Manda el volante por mail con el QR adjunto. */
export async function enviarVolantePorMail(id: string): Promise<VolanteState> {
  if (!mailConfigurado()) {
    return { error: "Falta configurar el mail en .env.local." };
  }

  const supabase = createClient();
  const { data: volante } = await supabase
    .from("volantes_pago")
    .select("*, clientes_estudio(razon_social, email_contacto)")
    .eq("id", id)
    .maybeSingle();

  if (!volante) return { error: "No se encontró el volante." };

  const cliente = (volante as any).clientes_estudio;
  if (!cliente?.email_contacto) {
    return { error: "El cliente no tiene mail cargado en su ficha." };
  }
  if (!volante.path_archivo) {
    return { error: "Todavía no se subió el QR ni el VEP." };
  }

  const { data: archivo, error: errBajar } = await supabase.storage
    .from(BUCKET)
    .download(volante.path_archivo);

  if (errBajar || !archivo) {
    return { error: `No se pudo leer el archivo: ${errBajar?.message ?? ""}` };
  }

  const datos: DatosVolante = {
    razonSocial: cliente.razon_social,
    concepto: volante.concepto,
    periodo: volante.periodo,
    vencimiento: volante.fecha_vencimiento,
    importe: Number(volante.importe_ars ?? 0),
    numeroVep: volante.numero_vep,
    fechaCalculo: volante.fecha_calculo,
  };

  const { texto, html } = cuerpoVolante(datos);
  const esPdf = volante.mime_type === "application/pdf";

  const r = await enviarMail({
    para: cliente.email_contacto,
    asunto: asuntoVolante(datos),
    texto,
    html,
    adjuntos: [
      {
        filename: `volante-${volante.concepto.toLowerCase()}-${volante.periodo}.${
          esPdf ? "pdf" : (volante.mime_type ?? "image/png").split("/")[1]
        }`,
        content: Buffer.from(await archivo.arrayBuffer()),
        contentType: volante.mime_type ?? "image/png",
      },
    ],
  });

  if (!r.ok) return { error: `No se pudo enviar: ${r.error}` };

  await supabase
    .from("volantes_pago")
    .update({ enviado: true, canal_envio: "EMAIL" })
    .eq("id", id);

  revalidatePath("/admin/volantes");
  return { ok: true, mensaje: `Enviado a ${cliente.email_contacto}.` };
}

/** Deja registrado el envío por WhatsApp (lo manda la persona). */
export async function marcarVolanteEnviado(id: string): Promise<VolanteState> {
  return actualizarVolante(id, { enviado: true, canal_envio: "WHATSAPP" });
}

/** Marca o desmarca el volante como pagado. */
export async function marcarVolantePagado(
  id: string,
  pagado: boolean
): Promise<VolanteState> {
  return actualizarVolante(id, {
    pagado,
    fecha_pago: pagado ? null : null,
  });
}

/**
 * Genera una emisión nueva del mismo volante con otra fecha de cálculo.
 *
 * Se usa cuando hay que volver a sacar el VEP del mismo período con los
 * intereses a otra fecha. La emisión anterior queda marcada como reemplazada,
 * con su QR y su VEP, como histórico. La nueva arranca sin VEP, sin QR y sin
 * envío, con el importe de la anterior para tomar como referencia.
 */
export async function nuevaEmision(
  id: string,
  fechaCalculo: string
): Promise<VolanteState> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCalculo)) {
    return { error: "Elegí una fecha de cálculo válida." };
  }

  const supabase = createClient();
  const { data: actual } = await supabase
    .from("volantes_pago")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!actual) return { error: "No se encontró el volante." };
  if (actual.reemplazado) {
    return { error: "Ese volante ya fue reemplazado; regenerá desde el vigente." };
  }
  if (actual.pagado) {
    return { error: "Ese volante figura como pagado. Desmarcalo si hay que regenerarlo." };
  }

  // Primero se libera la emisión vigente (el índice único solo admite una).
  const { error: errViejo } = await supabase
    .from("volantes_pago")
    .update({ reemplazado: true, reemplazado_at: new Date().toISOString() })
    .eq("id", id);

  if (errViejo) return { error: `No se pudo reemplazar: ${errViejo.message}` };

  const { error: errNuevo } = await supabase.from("volantes_pago").insert({
    cliente_id: actual.cliente_id,
    concepto: actual.concepto,
    periodo: actual.periodo,
    fecha_vencimiento: actual.fecha_vencimiento,
    periodo_desde: actual.periodo,
    periodo_hasta: actual.periodo,
    fecha_calculo: fechaCalculo,
    categoria: actual.categoria,
    importe_ars: actual.importe_ars,
    emision: (actual.emision ?? 1) + 1,
  });

  if (errNuevo) {
    // Se deshace el reemplazo para no dejar el período sin emisión vigente.
    await supabase
      .from("volantes_pago")
      .update({ reemplazado: false, reemplazado_at: null })
      .eq("id", id);
    return { error: `No se pudo crear la emisión nueva: ${errNuevo.message}` };
  }

  revalidatePath("/admin/volantes");
  return { ok: true, mensaje: "Emisión nueva lista. Generá el VEP con la fecha nueva." };
}
