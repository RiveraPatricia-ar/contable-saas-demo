/**
 * Carga el juego de datos FICTICIOS del demo público.
 *
 *   node scripts/seed-demo.mjs            carga los datos
 *   node scripts/seed-demo.mjs --limpiar  borra todo antes de cargar
 *
 * ⚠️  CORRER SOLO CONTRA EL PROYECTO SUPABASE DE DEMO.
 * El script se niega a ejecutarse si .env.local no tiene MODO_DEMO=true, para
 * que no haya forma de mezclar esto con los clientes reales del estudio.
 *
 * Todos los nombres, CUITs, importes y domicilios son inventados. Los CUITs
 * se calculan con el dígito verificador correcto para que el sistema los
 * acepte, pero no corresponden a ningún contribuyente real.
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
const esDemo = String(process.env.NEXT_PUBLIC_MODO_DEMO ?? "").toLowerCase() === "true";

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

if (!esDemo) {
  console.error(
    "\n  FRENO DE SEGURIDAD\n" +
      "  Este script carga datos ficticios y solo puede correr contra la base\n" +
      "  de demo. Para habilitarlo, poné en el .env.local de ese proyecto:\n\n" +
      "      NEXT_PUBLIC_MODO_DEMO=true\n\n" +
      `  Base apuntada ahora: ${url}\n`
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Calcula el dígito verificador y devuelve el CUIT completo de 11 dígitos. */
function armarCuit(prefijo, documento) {
  const base = `${prefijo}${String(documento).padStart(8, "0")}`;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((a, p, i) => a + Number(base[i]) * p, 0);
  let v = 11 - (suma % 11);
  if (v === 11) v = 0;
  if (v === 10) v = 9;
  return `${base}${v}`;
}

/** Período AAAA-MM desplazado n meses respecto del actual. */
function periodo(n = 0) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Fecha AAAA-MM-DD a partir de un período y un día. */
function fecha(per, dia) {
  return `${per}-${String(dia).padStart(2, "0")}`;
}

/** Entero pseudoaleatorio estable, para que el demo se vea igual siempre. */
let semilla = 20260101;
function azar(min, max) {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return min + (semilla % (max - min + 1));
}

const PROV = "Tucumán";

// ---------------------------------------------------------------------------
// PERSONAS FÍSICAS — todas ficticias
// ---------------------------------------------------------------------------
const PERSONAS = [
  { doc: 28441902, sexo: 27, nombre: "ALBORNOZ, MARIANA SOLEDAD", iva: "MONOTRIBUTO", cat: "D", act: "SERVICIOS", rubro: "Diseño gráfico y comunicación", hon: 48000 },
  { doc: 30127845, sexo: 20, nombre: "BENÍTEZ, RODRIGO EMANUEL", iva: "MONOTRIBUTO", cat: "B", act: "SERVICIOS", rubro: "Desarrollo de software freelance", hon: 42000 },
  { doc: 25903114, sexo: 27, nombre: "CASTELLANOS, VERÓNICA", iva: "RESPONSABLE_INSCRIPTO", rubro: "Comercio minorista de indumentaria", hon: 135000, empleados: 3 },
  { doc: 33728560, sexo: 20, nombre: "DOMÍNGUEZ, IGNACIO", iva: "MONOTRIBUTO", cat: "G", act: "VENTA", rubro: "Venta de insumos informáticos", hon: 65000 },
  { doc: 27315488, sexo: 27, nombre: "ESQUIVEL, LAURA BEATRIZ", iva: "RESPONSABLE_INSCRIPTO", rubro: "Consultoría en recursos humanos", hon: 128000 },
  { doc: 31664207, sexo: 20, nombre: "FIGUEROA, MARTÍN ANDRÉS", iva: "MONOTRIBUTO", cat: "H", act: "SERVICIOS", rubro: "Transporte de cargas", hon: 72000 },
  { doc: 29018733, sexo: 27, nombre: "GUTIÉRREZ, PAULA ROMINA", iva: "MONOTRIBUTO", cat: "C", act: "SERVICIOS", rubro: "Kinesiología", hon: 45000 },
  { doc: 26550981, sexo: 20, nombre: "HERRERA, SEBASTIÁN", iva: "RESPONSABLE_INSCRIPTO", rubro: "Taller mecánico", hon: 142000, empleados: 4 },
  { doc: 34890126, sexo: 27, nombre: "IRIARTE, CAMILA", iva: "MONOTRIBUTO", cat: "A", act: "SERVICIOS", rubro: "Fotografía", hon: 38000 },
  { doc: 24775390, sexo: 20, nombre: "LEDESMA, JORGE ALBERTO", iva: "RESPONSABLE_INSCRIPTO", rubro: "Distribuidora de alimentos", hon: 165000, empleados: 7 },
  { doc: 32104558, sexo: 27, nombre: "MOLINA, SOFÍA ABIGAIL", iva: "MONOTRIBUTO", cat: "F", act: "VENTA", rubro: "Venta de cosmética", hon: 58000 },
  { doc: 28902347, sexo: 20, nombre: "NAVARRO, DIEGO HERNÁN", iva: "MONOTRIBUTO", cat: "E", act: "SERVICIOS", rubro: "Instalaciones eléctricas", hon: 52000 },
];

// ---------------------------------------------------------------------------
// SOCIEDADES — todas ficticias
// ---------------------------------------------------------------------------
const SOCIEDADES = [
  { doc: 71885180, nombre: "ANDINA TEXTIL S.A.S.", fantasia: "Andina Textil", forma: "SAS", titular: 25903114, rubro: "Confección de indumentaria", hon: 210000, empleados: 9 },
  { doc: 71113000, nombre: "NORTE LOGÍSTICA S.R.L.", fantasia: "Norte Logística", forma: "SRL", titular: 31664207, rubro: "Logística y distribución", hon: 245000, empleados: 12 },
  { doc: 71916020, nombre: "VALLE VERDE S.A.S.", fantasia: "Valle Verde", forma: "SAS", titular: 24775390, rubro: "Producción agroalimentaria", hon: 268000, empleados: 15 },
  { doc: 71847780, nombre: "CUMBRE SERVICIOS S.R.L.", fantasia: "Cumbre Servicios", forma: "SRL", titular: 26550981, rubro: "Servicios de mantenimiento industrial", hon: 198000, empleados: 6 },
  { doc: 71885182, nombre: "PAMPA DIGITAL S.A.S.", fantasia: "Pampa Digital", forma: "SAS", titular: 30127845, rubro: "Desarrollo de software", hon: 225000, empleados: 8 },
];

// Impuestos que sigue cada tipo de cliente.
const OBLIGACIONES_MT = [
  { impuesto_tipo: "MONOTRIBUTO", organismo: "ARCA", dia_vencimiento: 21 },
  { impuesto_tipo: "IIBB_LOCAL", organismo: "RENTAS", dia_vencimiento: 18 },
];

const OBLIGACIONES_RI = [
  { impuesto_tipo: "IVA", organismo: "ARCA", dia_vencimiento: 18 },
  { impuesto_tipo: "IIBB_LOCAL", organismo: "RENTAS", dia_vencimiento: 18 },
  { impuesto_tipo: "AUTONOMO", organismo: "ARCA", dia_vencimiento: 5 },
];

const OBLIGACIONES_EMPLEADOR = [
  { impuesto_tipo: "F931_SUELDOS", organismo: "ARCA", dia_vencimiento: 12 },
  { impuesto_tipo: "SICORE", organismo: "ARCA", dia_vencimiento: 10 },
];

// ---------------------------------------------------------------------------
async function limpiar() {
  console.log("\nBorrando datos previos del demo…");
  const tablas = [
    "resumen_iva_periodo",
    "saldos_iva_periodo",
    "volantes_pago",
    "cuotas_plan",
    "planes_pago",
    "consulta_mensajes",
    "consultas",
    "documentos",
    "comprobantes",
    "honorarios",
    "tareas_estudio",
    "declaraciones_juradas",
    "obligaciones_config",
    "vinculos_cliente",
    "clientes_estudio",
  ];
  for (const t of tablas) {
    const { error } = await db
      .from(t)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error && !/does not exist/i.test(error.message)) {
      console.error(`  ✗ ${t}: ${error.message}`);
    } else {
      console.log(`  · ${t}`);
    }
  }
}

async function upsertCliente(fila) {
  const { data: existe } = await db
    .from("clientes_estudio")
    .select("id")
    .eq("cuit", fila.cuit)
    .maybeSingle();

  if (existe) {
    const { error } = await db.from("clientes_estudio").update(fila).eq("id", existe.id);
    if (error) {
      console.error(`  ✗ ${fila.razon_social}: ${error.message}`);
      return null;
    }
    return existe.id;
  }

  const { data, error } = await db
    .from("clientes_estudio")
    .insert(fila)
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ ${fila.razon_social}: ${error.message}`);
    return null;
  }
  return data.id;
}

async function main() {
  if (process.argv.includes("--limpiar")) await limpiar();

  const ids = new Map();

  // --- Clientes ------------------------------------------------------------
  console.log("\nPersonas físicas");
  for (const p of PERSONAS) {
    const cuit = armarCuit(p.sexo, p.doc);
    const esMT = p.iva === "MONOTRIBUTO";
    const id = await upsertCliente({
      cuit,
      tipo_persona: "FISICA",
      forma_juridica: "UNIPERSONAL",
      razon_social: p.nombre,
      condicion_iva: p.iva,
      condicion_iibb: "LOCAL_ARBA",
      categoria_monotributo: esMT ? p.cat : null,
      actividad_monotributo: esMT ? p.act : null,
      aporta_monotributo: esMT,
      aporta_autonomo: !esMT,
      actividad_principal: p.rubro,
      provincia: PROV,
      domicilio_fiscal: `Calle ${azar(100, 2500)}, San Miguel de Tucumán`,
      email_contacto: `${p.nombre.split(",")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@ejemplo.test`,
      telefono_contacto: `+54 9 381 ${azar(400, 699)}-${azar(1000, 9999)}`,
      honorario_mensual_ars: p.hon,
      tiene_empleados: Boolean(p.empleados),
      cantidad_empleados: p.empleados ?? 0,
      fecha_inicio_actividades: `20${azar(14, 23)}-${String(azar(1, 12)).padStart(2, "0")}-01`,
      estado_activo: true,
    });
    if (id) {
      ids.set(p.doc, id);
      console.log(`  + ${p.nombre}`);
    }
  }

  console.log("\nSociedades");
  for (const s of SOCIEDADES) {
    const cuit = armarCuit(30, s.doc);
    const id = await upsertCliente({
      cuit,
      tipo_persona: "JURIDICA",
      forma_juridica: s.forma,
      razon_social: s.nombre,
      nombre_fantasia: s.fantasia,
      condicion_iva: "RESPONSABLE_INSCRIPTO",
      condicion_iibb: "CONVENIO_MULTILATERAL",
      actividad_principal: s.rubro,
      provincia: PROV,
      domicilio_fiscal: `Av. ${azar(100, 1800)}, San Miguel de Tucumán`,
      email_contacto: `contacto@${s.fantasia.toLowerCase().replace(/\s+/g, "")}.test`,
      telefono_contacto: `+54 9 381 ${azar(400, 699)}-${azar(1000, 9999)}`,
      honorario_mensual_ars: s.hon,
      tiene_empleados: true,
      cantidad_empleados: s.empleados,
      fecha_inicio_actividades: `20${azar(15, 22)}-${String(azar(1, 12)).padStart(2, "0")}-01`,
      estado_activo: true,
    });
    if (id) {
      ids.set(s.doc, id);
      console.log(`  + ${s.nombre}`);
    }
  }

  // Un cliente dado de baja, para que se vea el filtro de inactivos.
  const idBaja = await upsertCliente({
    cuit: armarCuit(20, 22118654),
    tipo_persona: "FISICA",
    forma_juridica: "UNIPERSONAL",
    razon_social: "QUIROGA, OSVALDO",
    condicion_iva: "MONOTRIBUTO",
    categoria_monotributo: "B",
    actividad_monotributo: "SERVICIOS",
    aporta_monotributo: true,
    actividad_principal: "Reparación de electrodomésticos",
    provincia: PROV,
    honorario_mensual_ars: 36000,
    estado_activo: false,
    notas_internas: "Cesó actividades. Se conserva el historial.",
  });
  if (idBaja) console.log("  + QUIROGA, OSVALDO (inactivo)");

  // --- Vínculos ------------------------------------------------------------
  console.log("\nVínculos titular → sociedad");
  for (const s of SOCIEDADES) {
    const personaId = ids.get(s.titular);
    const sociedadId = ids.get(s.doc);
    if (!personaId || !sociedadId) continue;
    const { error } = await db.from("vinculos_cliente").insert({
      persona_id: personaId,
      sociedad_id: sociedadId,
      rol_vinculo: "TITULAR",
    });
    if (error && error.code !== "23505") console.error(`  ✗ ${s.fantasia}: ${error.message}`);
    else console.log(`  + ${s.fantasia}`);
  }

  // --- Configuración de obligaciones --------------------------------------
  console.log("\nObligaciones configuradas");
  const configs = [];
  for (const p of PERSONAS) {
    const id = ids.get(p.doc);
    if (!id) continue;
    const base = p.iva === "MONOTRIBUTO" ? OBLIGACIONES_MT : OBLIGACIONES_RI;
    const lista = p.empleados ? [...base, ...OBLIGACIONES_EMPLEADOR] : base;
    configs.push(...lista.map((o) => ({ ...o, cliente_id: id })));
  }
  for (const s of SOCIEDADES) {
    const id = ids.get(s.doc);
    if (!id) continue;
    configs.push(
      ...[...OBLIGACIONES_RI, ...OBLIGACIONES_EMPLEADOR].map((o) => ({ ...o, cliente_id: id }))
    );
  }

  const { error: errCfg } = await db
    .from("obligaciones_config")
    .upsert(configs, { onConflict: "cliente_id,impuesto_tipo", ignoreDuplicates: true });
  if (errCfg) console.error(`  ✗ ${errCfg.message}`);
  else console.log(`  + ${configs.length} obligaciones`);

  // --- Liquidaciones de los últimos tres períodos -------------------------
  console.log("\nLiquidaciones");
  const ddjj = [];
  for (const cfg of configs) {
    for (let n = -3; n <= -1; n++) {
      const per = periodo(n);
      const [anio, mes] = per.split("-").map(Number);
      const venc = new Date(Date.UTC(anio, mes, cfg.dia_vencimiento));
      const vencStr = venc.toISOString().slice(0, 10);
      const pasado = venc < new Date();

      // El período más viejo está cerrado; el más reciente, en curso.
      const cerrado = n <= -2;
      const monto = azar(45000, 980000);

      ddjj.push({
        cliente_id: cfg.cliente_id,
        impuesto_tipo: cfg.impuesto_tipo,
        organismo: cfg.organismo,
        periodo_fiscal: per,
        fecha_vencimiento: vencStr,
        monto_impuesto_ars: monto,
        monto_vep_ars: monto,
        estado: cerrado ? "PAGADO" : pasado ? "ESPERANDO_VEP" : "PENDIENTE",
        presentada: cerrado,
        boleta_generada: cerrado,
        enviada_al_cliente: cerrado,
        boleta_pagada: cerrado,
        canal_envio: cerrado ? (azar(0, 1) ? "EMAIL" : "WHATSAPP") : null,
      });
    }
  }

  // Unas pocas vencidas sin pagar, para que el semáforo muestre rojo.
  for (let i = 0; i < 4 && i < ddjj.length; i++) {
    const d = ddjj[i * 7] ?? ddjj[i];
    d.estado = "VENCIDO";
    d.presentada = false;
    d.boleta_pagada = false;
  }

  for (let i = 0; i < ddjj.length; i += 200) {
    const lote = ddjj.slice(i, i + 200);
    const { error } = await db
      .from("declaraciones_juradas")
      .upsert(lote, {
        onConflict: "cliente_id,impuesto_tipo,periodo_fiscal",
        ignoreDuplicates: true,
      });
    if (error) console.error(`  ✗ ${error.message}`);
  }
  console.log(`  + ${ddjj.length} liquidaciones en tres períodos`);

  // --- Comprobantes, para que la recategorización tenga de dónde leer -----
  console.log("\nComprobantes de venta");
  const comprobantes = [];
  for (const p of PERSONAS.filter((x) => x.iva === "MONOTRIBUTO")) {
    const id = ids.get(p.doc);
    if (!id) continue;
    // Doce meses de facturación, acorde a la categoría.
    const topePorCat = { A: 700000, B: 1050000, C: 1400000, D: 1750000, E: 2100000, F: 2600000, G: 3100000, H: 3900000 };
    const base = topePorCat[p.cat] ?? 1000000;
    for (let n = -12; n <= -1; n++) {
      const per = periodo(n);
      const cantidad = azar(2, 5);
      for (let k = 0; k < cantidad; k++) {
        const total = Math.round((base / cantidad) * (azar(80, 120) / 100));
        comprobantes.push({
          cliente_id: id,
          tipo_operacion: "VENTA",
          tipo_comprobante: "FA_C",
          punto_de_venta: 1,
          numero_comprobante: Number(`${String(Math.abs(n)).padStart(2, "0")}${k}${p.doc % 1000}`),
          fecha_emision: fecha(per, azar(3, 27)),
          razon_social_contraparte: "CONSUMIDOR FINAL",
          neto_gravado: total,
          total,
          origen: "MANUAL",
        });
      }
    }
  }

  for (let i = 0; i < comprobantes.length; i += 200) {
    const lote = comprobantes.slice(i, i + 200);
    const { error } = await db.from("comprobantes").upsert(lote, {
      onConflict:
        "cliente_id,tipo_operacion,tipo_comprobante,punto_de_venta,numero_comprobante",
      ignoreDuplicates: true,
    });
    if (error) console.error(`  ✗ ${error.message}`);
  }
  console.log(`  + ${comprobantes.length} comprobantes`);

  // --- Honorarios ----------------------------------------------------------
  console.log("\nHonorarios");
  const honorarios = [];
  const todos = [...PERSONAS.map((p) => [p.doc, p.hon]), ...SOCIEDADES.map((s) => [s.doc, s.hon])];
  for (const [doc, monto] of todos) {
    const id = ids.get(doc);
    if (!id) continue;
    for (let n = -3; n <= -1; n++) {
      const per = periodo(n);
      const cobrado = n <= -2 || azar(0, 10) > 3;
      honorarios.push({
        cliente_id: id,
        periodo_fiscal: per,
        concepto: "Honorarios profesionales",
        monto_ars: monto,
        estado: cobrado ? "COBRADA" : "EMITIDA",
        fecha_emision: fecha(per, 1),
        fecha_vencimiento: fecha(per, 10),
        fecha_cobro: cobrado ? fecha(per, azar(5, 15)) : null,
      });
    }
  }
  const { error: errHon } = await db
    .from("honorarios")
    .upsert(honorarios, {
      onConflict: "cliente_id,periodo_fiscal,concepto",
      ignoreDuplicates: true,
    });
  if (errHon) console.error(`  ✗ ${errHon.message}`);
  else console.log(`  + ${honorarios.length} honorarios`);

  // --- Planes de pago ------------------------------------------------------
  console.log("\nPlanes de facilidades");
  const PLANES_DEMO = [
    { doc: 24775390, origen: "ARCA", tipo_plan: "RG 5711 — Deuda impositiva y previsional", numero_plan: "V" + azar(100000, 999999), cuotas: 36, importe: 184500 },
    { doc: 71113000, origen: "RENTAS", tipo_plan: "1571 — Plan de regularización", numero_plan: "R" + azar(10000, 99999), cuotas: 24, importe: 96300 },
  ];

  for (const p of PLANES_DEMO) {
    const clienteId = ids.get(p.doc);
    if (!clienteId) continue;

    const { data: ya } = await db
      .from("planes_pago")
      .select("id")
      .eq("numero_plan", p.numero_plan)
      .maybeSingle();
    if (ya) continue;

    const { data: plan, error } = await db
      .from("planes_pago")
      .insert({
        cliente_id: clienteId,
        origen: p.origen,
        tipo_plan: p.tipo_plan,
        numero_plan: p.numero_plan,
        cantidad_cuotas: p.cuotas,
        fecha_presentacion: fecha(periodo(-8), 20),
        dia_vencimiento_1: p.origen === "ARCA" ? 16 : 15,
        dia_vencimiento_2: p.origen === "ARCA" ? 26 : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  ✗ ${p.numero_plan}: ${error.message}`);
      continue;
    }

    const cuotas = Array.from({ length: p.cuotas }, (_, i) => {
      const per = periodo(-7 + i);
      const vencida = i < 7;
      return {
        plan_id: plan.id,
        numero_cuota: i + 1,
        periodo: per,
        fecha_vencimiento: fecha(per, p.origen === "ARCA" ? 16 : 15),
        fecha_vencimiento_2: p.origen === "ARCA" ? fecha(per, 26) : null,
        importe_ars: p.importe,
        estado: vencida ? "PAGADA" : "PENDIENTE",
      };
    });

    const { error: errC } = await db.from("cuotas_plan").insert(cuotas);
    if (errC) console.error(`  ✗ cuotas de ${p.numero_plan}: ${errC.message}`);
    else console.log(`  + ${p.numero_plan} — ${cuotas.length} cuotas`);
  }

  // --- Tareas --------------------------------------------------------------
  console.log("\nTareas del estudio");
  const TAREAS = [
    ["Recategorización semestral de monotributistas", "ALTA", "EN_PROCESO", 0],
    ["Presentar IVA del período en curso", "URGENTE", "PENDIENTE", 1],
    ["Cargar comprobantes de compra pendientes", "MEDIA", "EN_PROCESO", 2],
    ["Conciliar retenciones de SICORE", "MEDIA", "PENDIENTE", 3],
    ["Actualizar datos de contacto de la cartera", "BAJA", "PENDIENTE", null],
    ["Liquidación de sueldos del mes", "ALTA", "PRESENTADO", 4],
    ["Revisar plan de facilidades próximo a caducar", "ALTA", "PENDIENTE", 9],
    ["Cerrar balance del ejercicio", "MEDIA", "EN_PROCESO", 12],
    ["Enviar boletas de Rentas a los clientes", "URGENTE", "FINALIZADO", null],
    ["Certificación de ingresos para el banco", "MEDIA", "FINALIZADO", 6],
  ];

  const docs = [...PERSONAS.map((p) => p.doc), ...SOCIEDADES.map((s) => s.doc)];
  const tareas = TAREAS.map(([titulo, prioridad, estado, idx]) => ({
    titulo,
    prioridad,
    estado,
    cliente_id: idx === null ? null : (ids.get(docs[idx]) ?? null),
    fecha_limite: fecha(periodo(0), azar(10, 28)),
  }));

  const { error: errT } = await db.from("tareas_estudio").insert(tareas);
  if (errT) console.error(`  ✗ ${errT.message}`);
  else console.log(`  + ${tareas.length} tareas`);

  // --- Resumen -------------------------------------------------------------
  const linea = "─".repeat(58);
  console.log(`\n${linea}`);
  console.log("  DEMO CARGADO");
  console.log(linea);
  console.log(`  Clientes activos : ${PERSONAS.length + SOCIEDADES.length}`);
  console.log(`  Inactivos        : 1`);
  console.log(`  Liquidaciones    : ${ddjj.length}`);
  console.log(`  Comprobantes     : ${comprobantes.length}`);
  console.log(`  Honorarios       : ${honorarios.length}`);
  console.log(`  Planes de pago   : ${PLANES_DEMO.length}`);
  console.log(`  Tareas           : ${tareas.length}`);
  console.log(linea);
  console.log("  Todos los datos son inventados.");
  console.log("  Falta crear los usuarios de acceso:\n");
  console.log('    node scripts/crear-admin.mjs 20111111112 "Contadora Demo" DemoEstudio2026\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
