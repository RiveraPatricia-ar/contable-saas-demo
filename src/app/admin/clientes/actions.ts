"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODO_DEMO, MENSAJE_DEMO_BLOQUEADO } from "@/lib/demo";
import { soloDigitos, validarCUIT } from "@/lib/utils";

export type ClienteState = { error?: string; ok?: boolean };

function leerFormulario(formData: FormData) {
  const cuit = soloDigitos(String(formData.get("cuit") ?? ""));
  const condicionIva = String(formData.get("condicion_iva") ?? "");
  const categoria = String(formData.get("categoria_monotributo") ?? "").trim();

  return {
    cuit,
    razon_social: String(formData.get("razon_social") ?? "").trim(),
    tipo_persona: String(formData.get("tipo_persona") ?? "FISICA"),
    nombre_fantasia: String(formData.get("nombre_fantasia") ?? "").trim() || null,
    email_contacto: String(formData.get("email_contacto") ?? "").trim() || null,
    telefono_contacto: String(formData.get("telefono_contacto") ?? "").trim() || null,
    domicilio_fiscal: String(formData.get("domicilio_fiscal") ?? "").trim() || null,
    provincia: String(formData.get("provincia") ?? "").trim() || null,
    condicion_iva: condicionIva,
    condicion_iibb: String(formData.get("condicion_iibb") ?? "NO_INSCRIPTO"),
    categoria_monotributo:
      condicionIva === "MONOTRIBUTO" ? categoria || null : null,
    numero_iibb: String(formData.get("numero_iibb") ?? "").trim() || null,
    actividad_principal:
      String(formData.get("actividad_principal") ?? "").trim() || null,
    tiene_empleados: formData.get("tiene_empleados") === "on",
    cantidad_empleados: Number(formData.get("cantidad_empleados") ?? 0) || 0,
    fecha_inicio_actividades:
      String(formData.get("fecha_inicio_actividades") ?? "") || null,
    honorario_mensual_ars: Number(formData.get("honorario_mensual_ars") ?? 0) || 0,
    forma_juridica: String(formData.get("forma_juridica") ?? "UNIPERSONAL"),
    aporta_monotributo: formData.get("aporta_monotributo") === "on",
    aporta_autonomo: formData.get("aporta_autonomo") === "on",
    actividad_monotributo: String(
      formData.get("actividad_monotributo") ?? "SERVICIOS"
    ),
    categoria_autonomo:
      String(formData.get("categoria_autonomo") ?? "").trim() || null,
    padron_rentas: String(formData.get("padron_rentas") ?? "").trim() || null,
    excluir_de_recategorizacion:
      formData.get("excluir_de_recategorizacion") === "on",
    alias_planilla: String(formData.get("alias_planilla") ?? "").trim() || null,
    estado_activo: formData.get("estado_activo") === "on",
    notas_internas: String(formData.get("notas_internas") ?? "").trim() || null,
  };
}

function validar(datos: ReturnType<typeof leerFormulario>): string | null {
  if (!datos.razon_social) return "La razón social es obligatoria.";
  if (!validarCUIT(datos.cuit))
    return "El CUIT no es válido (revisá el dígito verificador).";
  if (
    datos.tipo_persona === "FISICA" &&
    datos.condicion_iva === "MONOTRIBUTO" &&
    !datos.categoria_monotributo
  )
    return "Un monotributista necesita categoría (A a K).";
  if (datos.aporta_autonomo && !datos.categoria_autonomo)
    return "Indicá la categoría de autónomo (I a V).";
  return null;
}

/** Guarda las claves fiscales via RPC cifrada, nunca como texto en la tabla. */
async function guardarClaves(clienteId: string, formData: FormData) {
  const supabase = createClient();
  const afip = String(formData.get("clave_fiscal_afip") ?? "");
  const arba = String(formData.get("clave_arba_agip") ?? "");

  if (afip) {
    await supabase.rpc("guardar_clave_fiscal", {
      p_cliente_id: clienteId,
      p_campo: "afip",
      p_valor: afip,
    });
  }
  if (arba) {
    await supabase.rpc("guardar_clave_fiscal", {
      p_cliente_id: clienteId,
      p_campo: "arba_agip",
      p_valor: arba,
    });
  }
}

export async function crearCliente(
  _prev: ClienteState,
  formData: FormData
): Promise<ClienteState> {
  const datos = leerFormulario(formData);
  const error = validar(datos);
  if (error) return { error };

  const supabase = createClient();
  const { data, error: dbError } = await supabase
    .from("clientes_estudio")
    .insert(datos)
    .select("id")
    .single();

  if (dbError) {
    return {
      error:
        dbError.code === "23505"
          ? "Ya existe un cliente con ese CUIT."
          : `No se pudo guardar: ${dbError.message}`,
    };
  }

  await guardarClaves(data.id, formData);

  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${data.id}`);
}

export async function actualizarCliente(
  id: string,
  _prev: ClienteState,
  formData: FormData
): Promise<ClienteState> {
  const datos = leerFormulario(formData);
  const error = validar(datos);
  if (error) return { error };

  const supabase = createClient();
  const { error: dbError } = await supabase
    .from("clientes_estudio")
    .update(datos)
    .eq("id", id);

  if (dbError) return { error: `No se pudo guardar: ${dbError.message}` };

  await guardarClaves(id, formData);

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true };
}

export async function desactivarCliente(id: string) {
  if (MODO_DEMO) return;

  const supabase = createClient();
  await supabase
    .from("clientes_estudio")
    .update({ estado_activo: false })
    .eq("id", id);
  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

/** Devuelve una clave fiscal descifrada. Queda registrado en la auditoría. */
export async function revelarClave(
  clienteId: string,
  campo: "afip" | "arba_agip"
): Promise<{ valor?: string; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leer_clave_fiscal", {
    p_cliente_id: clienteId,
    p_campo: campo,
  });

  if (error) return { error: error.message };
  if (!data) return { error: "No hay una clave guardada para este campo." };
  return { valor: data as string };
}

// ---------------------------------------------------------------------------
// Vínculos persona <-> sociedad (titular de una SAS/SRL)
// ---------------------------------------------------------------------------

export type VinculoState = { error?: string; ok?: boolean };

/** Vincula una persona física con una sociedad ya cargada como cliente. */
export async function vincularSociedad(
  _prev: VinculoState,
  formData: FormData
): Promise<VinculoState> {
  const persona_id = String(formData.get("persona_id") ?? "");
  const sociedad_id = String(formData.get("sociedad_id") ?? "");
  const rol_vinculo = String(formData.get("rol_vinculo") ?? "TITULAR");

  if (!persona_id || !sociedad_id) return { error: "Elegí la sociedad a vincular." };
  if (persona_id === sociedad_id)
    return { error: "No se puede vincular un cliente consigo mismo." };

  const supabase = createClient();
  const { error } = await supabase.from("vinculos_cliente").insert({
    persona_id,
    sociedad_id,
    rol_vinculo,
    participacion: Number(formData.get("participacion") ?? 0) || null,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ese vínculo ya está cargado."
          : `No se pudo vincular: ${error.message}`,
    };
  }

  revalidatePath(`/admin/clientes/${persona_id}`);
  revalidatePath(`/admin/clientes/${sociedad_id}`);
  return { ok: true };
}

export async function desvincularSociedad(vinculoId: string, clienteId: string) {
  const supabase = createClient();
  await supabase.from("vinculos_cliente").delete().eq("id", vinculoId);
  revalidatePath(`/admin/clientes/${clienteId}`);
}
