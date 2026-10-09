"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DDJJState = { error?: string; ok?: boolean };

export async function crearDDJJ(
  _prev: DDJJState,
  formData: FormData
): Promise<DDJJState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cliente_id = String(formData.get("cliente_id") ?? "");
  const impuesto_tipo = String(formData.get("impuesto_tipo") ?? "");
  const periodo_fiscal = String(formData.get("periodo_fiscal") ?? "");
  const fecha_vencimiento = String(formData.get("fecha_vencimiento") ?? "");

  if (!cliente_id || !impuesto_tipo || !periodo_fiscal || !fecha_vencimiento) {
    return { error: "Cliente, impuesto, período y vencimiento son obligatorios." };
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo_fiscal)) {
    return { error: "El período debe tener el formato AAAA-MM." };
  }

  const { error } = await supabase.from("declaraciones_juradas").insert({
    cliente_id,
    impuesto_tipo,
    organismo: String(formData.get("organismo") ?? "AFIP"),
    periodo_fiscal,
    fecha_vencimiento,
    monto_impuesto_ars: Number(formData.get("monto_impuesto_ars") ?? 0) || 0,
    monto_vep_ars: Number(formData.get("monto_vep_ars") ?? 0) || 0,
    codigo_vep: String(formData.get("codigo_vep") ?? "").trim() || null,
    estado: String(formData.get("estado") ?? "PENDIENTE"),
    notas: String(formData.get("notas") ?? "").trim() || null,
    creado_por: user?.id ?? null,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe una DDJJ de ese impuesto y período para el cliente."
          : `No se pudo guardar: ${error.message}`,
    };
  }

  revalidatePath("/admin/ddjj");
  revalidatePath("/admin");
  return { ok: true };
}

export async function cambiarEstadoDDJJ(id: string, estado: string) {
  const supabase = createClient();
  const extra: Record<string, string> = {};
  const hoy = new Date().toISOString().slice(0, 10);
  if (estado === "PRESENTADO") extra.fecha_presentacion = hoy;
  if (estado === "PAGADO") extra.fecha_pago = hoy;

  await supabase
    .from("declaraciones_juradas")
    .update({ estado, ...extra })
    .eq("id", id);

  revalidatePath("/admin/ddjj");
  revalidatePath("/admin");
}

/**
 * Sube un PDF (VEP o acuse) al bucket `documentos` y lo enlaza a la DDJJ.
 * Convención de ruta: <cliente_id>/<categoria>/<archivo>
 */
export async function subirPdfDDJJ(formData: FormData): Promise<DDJJState> {
  const supabase = createClient();
  const ddjjId = String(formData.get("ddjj_id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "vep"); // vep | acuse
  const archivo = formData.get("archivo") as File | null;

  if (!archivo || archivo.size === 0) return { error: "Elegí un archivo." };
  if (archivo.size > 10 * 1024 * 1024) return { error: "El archivo supera los 10 MB." };

  const nombre = `${clienteId}/${tipo === "vep" ? "VEP" : "ACUSE"}/${Date.now()}-${archivo.name.replace(/[^\w.\-]/g, "_")}`;

  const { error: upError } = await supabase.storage
    .from("documentos")
    .upload(nombre, archivo, { upsert: false, contentType: archivo.type });

  if (upError) return { error: `No se pudo subir: ${upError.message}` };

  const campo = tipo === "vep" ? "path_pdf_vep" : "path_pdf_acuse";
  await supabase
    .from("declaraciones_juradas")
    .update({ [campo]: nombre })
    .eq("id", ddjjId);

  await supabase.from("documentos").insert({
    cliente_id: clienteId,
    titulo: tipo === "vep" ? "VEP de pago" : "Acuse de presentación",
    categoria: tipo === "vep" ? "VEP" : "ACUSE",
    path_archivo: nombre,
    mime_type: archivo.type,
    tamano_bytes: archivo.size,
    visible_cliente: true,
  });

  revalidatePath("/admin/ddjj");
  return { ok: true };
}

/** URL firmada de corta duración para descargar un documento privado. */
export async function urlFirmada(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("documentos")
    .createSignedUrl(path, 60 * 5);
  return data?.signedUrl ?? null;
}

/**
 * Guarda el importe (y opcionalmente el número) del VEP de una DDJJ.
 * Acepta "1.234,56", "1234,56" o "1234.56", y negativos ("-1.234,56")
 * para los saldos a favor.
 * Si el impuesto determinado estaba en 0, lo completa con el mismo importe
 * para que se vea también en «Impuestos del mes» y en la ficha del cliente.
 */
export async function guardarImporteVep(
  id: string,
  importe: string,
  codigo: string
): Promise<DDJJState> {
  let t = importe.trim().replace(/\$|\s/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const monto = t === "" ? 0 : Number(t);
  if (!Number.isFinite(monto)) {
    return { error: "Importe inválido" };
  }

  const supabase = createClient();
  const { data: actual } = await supabase
    .from("declaraciones_juradas")
    .select("monto_impuesto_ars")
    .eq("id", id)
    .single();

  const patch: Record<string, unknown> = {
    monto_vep_ars: monto,
    codigo_vep: codigo.trim() || null,
  };
  if (!Number(actual?.monto_impuesto_ars)) patch.monto_impuesto_ars = monto;

  const { error } = await supabase
    .from("declaraciones_juradas")
    .update(patch)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/ddjj");
  revalidatePath("/admin/obligaciones");
  revalidatePath("/admin/clientes", "layout");
  return { ok: true };
}
