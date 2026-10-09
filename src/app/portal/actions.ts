"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PortalState = { error?: string; ok?: string };

/** URL firmada de 5 minutos para descargar un documento propio. */
export async function urlFirmadaPortal(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("documentos")
    .createSignedUrl(path, 60 * 5);
  return data?.signedUrl ?? null;
}

/** El cliente sube un comprobante o gasto para que el estudio lo liquide. */
export async function subirGasto(
  _prev: PortalState,
  formData: FormData
): Promise<PortalState> {
  const clienteId = String(formData.get("cliente_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const archivo = formData.get("archivo") as File | null;

  if (!clienteId) return { error: "No se pudo identificar tu legajo." };
  if (!archivo || archivo.size === 0) return { error: "Elegí un archivo." };
  if (archivo.size > 10 * 1024 * 1024) return { error: "El archivo supera los 10 MB." };

  const permitidos = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!permitidos.includes(archivo.type)) {
    return { error: "Formato no admitido. Subí un PDF o una imagen." };
  }

  const supabase = createClient();
  const nombre = `${clienteId}/gastos/${Date.now()}-${archivo.name.replace(/[^\w.\-]/g, "_")}`;

  const { error: upError } = await supabase.storage
    .from("documentos")
    .upload(nombre, archivo, { contentType: archivo.type });

  if (upError) return { error: `No se pudo subir: ${upError.message}` };

  const { error: dbError } = await supabase.from("documentos").insert({
    cliente_id: clienteId,
    titulo: titulo || archivo.name,
    categoria: "GASTO",
    path_archivo: nombre,
    mime_type: archivo.type,
    tamano_bytes: archivo.size,
    visible_cliente: true,
  });

  if (dbError) return { error: `No se pudo registrar: ${dbError.message}` };

  revalidatePath("/portal/comprobantes");
  return { ok: "Comprobante enviado al estudio." };
}

export async function abrirConsulta(
  _prev: PortalState,
  formData: FormData
): Promise<PortalState> {
  const clienteId = String(formData.get("cliente_id") ?? "");
  const asunto = String(formData.get("asunto") ?? "").trim();
  const cuerpo = String(formData.get("cuerpo") ?? "").trim();

  if (!asunto || !cuerpo) return { error: "Completá el asunto y el mensaje." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("consultas")
    .insert({ cliente_id: clienteId, asunto, abierta_por: user?.id ?? null })
    .select("id")
    .single();

  if (error) return { error: `No se pudo abrir la consulta: ${error.message}` };

  await supabase.from("consulta_mensajes").insert({
    consulta_id: data.id,
    autor_id: user?.id ?? null,
    cuerpo,
  });

  revalidatePath("/portal/consultas");
  return { ok: "Consulta enviada. Te respondemos por este mismo canal." };
}

export async function responderConsulta(
  _prev: PortalState,
  formData: FormData
): Promise<PortalState> {
  const consultaId = String(formData.get("consulta_id") ?? "");
  const cuerpo = String(formData.get("cuerpo") ?? "").trim();
  if (!cuerpo) return { error: "Escribí un mensaje." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("consulta_mensajes").insert({
    consulta_id: consultaId,
    autor_id: user?.id ?? null,
    cuerpo,
  });

  if (error) return { error: `No se pudo enviar: ${error.message}` };

  revalidatePath("/portal/consultas");
  return { ok: "Mensaje enviado." };
}
