"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { urlBoletaRentas } from "@/lib/planes";
import { enviarMail, mailConfigurado } from "@/lib/mail";
import { asuntoMail, cuerpoMail, type DatosBoleta } from "@/lib/mensajes";

export type EnvioState = { error?: string; ok?: boolean; mensaje?: string };

const BUCKET = "documentos";

/** Período AAAA-MM del mes en curso. */
function periodoActual() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Baja del sitio de Rentas la boleta de la cuota del mes de cada plan vigente
 * y la guarda en el bucket `documentos`.
 *
 * La descarga la hace el servidor de la app, no el navegador, así que
 * la máquina donde corre `npm run dev` tiene que llegar a
 * rentastucuman.gob.ar. Si el sitio devuelve algo que no es un PDF (por
 * ejemplo una página de error), la cuota se marca como fallida y queda el
 * link para abrirla a mano.
 */
export async function prepararEnviosDelMes(
  _prev: EnvioState,
  formData: FormData
): Promise<EnvioState> {
  const supabase = createClient();
  const periodo = String(formData.get("periodo") ?? periodoActual());

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    return { error: "El período debe tener el formato AAAA-MM." };
  }

  const { data: planes, error: errPlanes } = await supabase
    .from("planes_pago")
    .select("*, clientes_estudio(razon_social)")
    .eq("origen", "RENTAS")
    .eq("estado", "VIGENTE");

  if (errPlanes) return { error: `No se pudieron leer los planes: ${errPlanes.message}` };
  if (!planes || planes.length === 0) {
    return { ok: true, mensaje: "No hay planes de Rentas vigentes." };
  }

  let bajadas = 0;
  let yaEstaban = 0;
  const fallaron: string[] = [];

  for (const plan of planes) {
    const { data: cuota } = await supabase
      .from("cuotas_plan")
      .select("*")
      .eq("plan_id", plan.id)
      .eq("periodo", periodo)
      .maybeSingle();

    if (!cuota) continue;
    if (cuota.path_pdf) {
      yaEstaban++;
      continue;
    }

    const url = urlBoletaRentas(plan, cuota.numero_cuota);
    if (!url) {
      fallaron.push(`${plan.numero_plan}: faltan los datos del plan de pago`);
      continue;
    }

    try {
      const resp = await fetch(url, { cache: "no-store" });
      const tipo = resp.headers.get("content-type") ?? "";

      if (!resp.ok) {
        fallaron.push(`${plan.numero_plan}: Rentas respondió ${resp.status}`);
        continue;
      }
      if (!tipo.includes("pdf")) {
        // El formulario de Rentas tiene captcha: sin resolverlo, el sitio
        // contesta una página de error en vez del PDF. No se puede saltear.
        fallaron.push(
          `${plan.numero_plan}: Rentas pidió captcha, hay que bajarla a mano`
        );
        continue;
      }

      const bytes = Buffer.from(await resp.arrayBuffer());
      const ruta = `${plan.cliente_id}/BOLETA_RENTAS/${periodo}-plan-${plan.numero_plan}-cuota-${cuota.numero_cuota}.pdf`;

      const { error: errUp } = await supabase.storage
        .from(BUCKET)
        .upload(ruta, bytes, { contentType: "application/pdf", upsert: true });

      if (errUp) {
        fallaron.push(`${plan.numero_plan}: no se pudo guardar (${errUp.message})`);
        continue;
      }

      await supabase
        .from("cuotas_plan")
        .update({ path_pdf: ruta, boleta_url: url })
        .eq("id", cuota.id);

      await supabase.from("documentos").insert({
        cliente_id: plan.cliente_id,
        titulo: `Boleta Rentas — cuota ${cuota.numero_cuota} (${periodo})`,
        categoria: "VEP",
        periodo_fiscal: periodo,
        path_archivo: ruta,
        mime_type: "application/pdf",
        tamano_bytes: bytes.length,
        visible_cliente: true,
      });

      bajadas++;
    } catch (e) {
      fallaron.push(
        `${plan.numero_plan}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  revalidatePath("/admin/envios");

  const partes = [`${bajadas} boleta${bajadas === 1 ? "" : "s"} descargada${bajadas === 1 ? "" : "s"}`];
  if (yaEstaban) partes.push(`${yaEstaban} ya estaba${yaEstaban === 1 ? "" : "n"}`);
  if (fallaron.length) partes.push(`${fallaron.length} con problemas: ${fallaron.join(" · ")}`);

  return { ok: true, mensaje: partes.join(". ") + "." };
}

/** URL firmada para abrir o descargar la boleta guardada. */
export async function urlBoletaGuardada(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

/** Manda la boleta por mail al cliente, con el PDF adjunto. */
export async function enviarBoletaPorMail(cuotaId: string): Promise<EnvioState> {
  if (!mailConfigurado()) {
    return {
      error:
        "Falta configurar GMAIL_USER y GMAIL_APP_PASSWORD en .env.local. Ver el README.",
    };
  }

  const supabase = createClient();

  const { data: cuota } = await supabase
    .from("cuotas_plan")
    .select("*, planes_pago(*, clientes_estudio(razon_social, email_contacto))")
    .eq("id", cuotaId)
    .maybeSingle();

  if (!cuota) return { error: "No se encontró la cuota." };

  const plan = (cuota as any).planes_pago;
  const cliente = plan?.clientes_estudio;
  const destino = cliente?.email_contacto;

  if (!destino) {
    return { error: "El cliente no tiene mail cargado en su ficha." };
  }
  if (!cuota.path_pdf) {
    return { error: "Todavía no está descargada la boleta de esta cuota." };
  }

  const { data: archivo, error: errBajar } = await supabase.storage
    .from(BUCKET)
    .download(cuota.path_pdf);

  if (errBajar || !archivo) {
    return { error: `No se pudo leer el PDF guardado: ${errBajar?.message ?? ""}` };
  }

  const datos: DatosBoleta = {
    razonSocial: cliente.razon_social,
    tipoPlan: plan.tipo_plan,
    numeroPlan: plan.numero_plan,
    numeroCuota: cuota.numero_cuota,
    totalCuotas: plan.cantidad_cuotas,
    vencimiento: cuota.fecha_vencimiento,
    importe: Number(cuota.importe_ars ?? 0),
  };

  const { texto, html } = cuerpoMail(datos);

  const r = await enviarMail({
    para: destino,
    asunto: asuntoMail(datos),
    texto,
    html,
    adjuntos: [
      {
        filename: `boleta-cuota-${cuota.numero_cuota}.pdf`,
        content: Buffer.from(await archivo.arrayBuffer()),
        contentType: "application/pdf",
      },
    ],
  });

  if (!r.ok) return { error: `No se pudo enviar: ${r.error}` };

  await supabase
    .from("cuotas_plan")
    .update({
      enviada: true,
      canal_envio: "EMAIL",
      fecha_envio: new Date().toISOString().slice(0, 10),
      estado: cuota.estado === "PENDIENTE" ? "ENVIADA" : cuota.estado,
    })
    .eq("id", cuotaId);

  revalidatePath("/admin/envios");
  revalidatePath(`/admin/planes/${plan.id}`);
  return { ok: true, mensaje: `Enviado a ${destino}.` };
}

/** Deja registrado que se mandó por WhatsApp (el envío lo hace la persona). */
export async function marcarEnviadaPorWhatsApp(
  cuotaId: string
): Promise<EnvioState> {
  const supabase = createClient();
  const { error } = await supabase
    .from("cuotas_plan")
    .update({
      enviada: true,
      canal_envio: "WHATSAPP",
      fecha_envio: new Date().toISOString().slice(0, 10),
    })
    .eq("id", cuotaId);

  revalidatePath("/admin/envios");
  return error ? { error: error.message } : { ok: true };
}

/**
 * Guarda una boleta que se bajó a mano del sitio de Rentas.
 *
 * Hace falta porque el formulario de Rentas tiene captcha y no se puede
 * automatizar la descarga. El circuito queda: abrir el link con los datos ya
 * cargados, resolver el captcha, bajar el PDF y subirlo acá. De ahí en más el
 * envío por mail sigue siendo automático.
 */
export async function subirBoletaManual(
  _prev: EnvioState,
  formData: FormData
): Promise<EnvioState> {
  const supabase = createClient();
  const cuotaId = String(formData.get("cuota_id") ?? "");
  const archivo = formData.get("archivo") as File | null;

  if (!cuotaId) return { error: "Falta la cuota." };
  if (!archivo || archivo.size === 0) return { error: "Elegí el archivo." };
  if (archivo.size > 10 * 1024 * 1024) return { error: "El archivo supera los 10 MB." };

  const bytes = Buffer.from(await archivo.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") {
    return { error: "Ese archivo no es un PDF. Bajá la boleta y subí ese archivo." };
  }

  const { data: cuota } = await supabase
    .from("cuotas_plan")
    .select("*, planes_pago(cliente_id, numero_plan)")
    .eq("id", cuotaId)
    .maybeSingle();

  if (!cuota) return { error: "No se encontró la cuota." };

  const plan = (cuota as any).planes_pago;
  const ruta = `${plan.cliente_id}/BOLETA_RENTAS/${cuota.periodo}-plan-${plan.numero_plan}-cuota-${cuota.numero_cuota}.pdf`;

  const { error: errUp } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, bytes, { contentType: "application/pdf", upsert: true });

  if (errUp) return { error: `No se pudo guardar: ${errUp.message}` };

  await supabase.from("cuotas_plan").update({ path_pdf: ruta }).eq("id", cuotaId);

  await supabase.from("documentos").insert({
    cliente_id: plan.cliente_id,
    titulo: `Boleta Rentas — cuota ${cuota.numero_cuota} (${cuota.periodo})`,
    categoria: "VEP",
    periodo_fiscal: cuota.periodo,
    path_archivo: ruta,
    mime_type: "application/pdf",
    tamano_bytes: bytes.length,
    visible_cliente: true,
  });

  revalidatePath("/admin/envios");
  return { ok: true, mensaje: "Boleta guardada. Ya se puede enviar." };
}
