export type RolUsuario = "ADMIN" | "CONTADOR_STAFF" | "CLIENTE";

export type CondicionIVA =
  | "MONOTRIBUTO"
  | "RESPONSABLE_INSCRIPTO"
  | "EXENTO"
  | "CONSUMIDOR_FINAL";

export type CondicionIIBB =
  | "LOCAL_ARBA"
  | "LOCAL_AGIP"
  | "CONVENIO_MULTILATERAL"
  | "EXENTO"
  | "NO_INSCRIPTO";

export type EstadoTramite =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "ESPERANDO_VEP"
  | "PRESENTADO"
  | "PAGADO"
  | "FINALIZADO"
  | "VENCIDO";

export type Prioridad = "BAJA" | "MEDIA" | "ALTA" | "URGENTE";
export type TipoPersona = "FISICA" | "JURIDICA";
export type EstadoFactura =
  | "BORRADOR"
  | "EMITIDA"
  | "COBRADA"
  | "VENCIDA"
  | "ANULADA";

export interface Profile {
  id: string;
  username: string;
  nombre_completo: string;
  email: string;
  telefono: string | null;
  rol: RolUsuario;
  debe_cambiar_password: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClienteEstudio {
  id: string;
  user_id: string | null;
  contador_asignado: string | null;
  cuit: string;
  tipo_persona: TipoPersona;
  razon_social: string;
  nombre_fantasia: string | null;
  email_contacto: string | null;
  telefono_contacto: string | null;
  domicilio_fiscal: string | null;
  provincia: string | null;
  condicion_iva: CondicionIVA;
  condicion_iibb: CondicionIIBB;
  categoria_monotributo: string | null;
  numero_iibb: string | null;
  actividad_principal: string | null;
  tiene_empleados: boolean;
  cantidad_empleados: number;
  fecha_inicio_actividades: string | null;
  honorario_mensual_ars: number;
  estado_activo: boolean;
  forma_juridica: FormaJuridica;
  aporta_monotributo: boolean;
  aporta_autonomo: boolean;
  categoria_autonomo: string | null;
  padron_rentas: string | null;
  alias_planilla: string | null;
  ingresos_12m_manual: number | null;
  fecha_ultima_recategorizacion: string | null;
  excluir_de_recategorizacion: boolean;
  actividad_monotributo: ActividadMonotributo;
  notas_internas: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeclaracionJurada {
  id: string;
  cliente_id: string;
  impuesto_tipo: string;
  organismo: string;
  periodo_fiscal: string;
  fecha_vencimiento: string;
  monto_impuesto_ars: number;
  monto_vep_ars: number;
  codigo_vep: string | null;
  path_pdf_vep: string | null;
  path_pdf_acuse: string | null;
  estado: EstadoTramite;
  fecha_presentacion: string | null;
  fecha_pago: string | null;
  presentada: boolean;
  boleta_generada: boolean;
  fecha_boleta: string | null;
  boleta_url: string | null;
  enviada_al_cliente: boolean;
  fecha_envio: string | null;
  canal_envio: CanalEnvio | null;
  boleta_pagada: boolean;
  notas: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comprobante {
  id: string;
  cliente_id: string;
  tipo_operacion: "VENTA" | "COMPRA";
  tipo_comprobante: string;
  punto_de_venta: number;
  numero_comprobante: number;
  fecha_emision: string;
  periodo_fiscal: string;
  cuit_contraparte: string | null;
  razon_social_contraparte: string | null;
  neto_gravado: number;
  neto_no_gravado: number;
  exento: number;
  iva_21: number;
  iva_10_5: number;
  iva_27: number;
  percepcion_iibb: number;
  percepcion_iva: number;
  retencion_ganancias: number;
  total: number;
  path_archivo: string | null;
  origen: string;
  cargado_por: string | null;
  created_at: string;
}

export interface Documento {
  id: string;
  cliente_id: string;
  titulo: string;
  categoria: string;
  periodo_fiscal: string | null;
  path_archivo: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  visible_cliente: boolean;
  subido_por: string | null;
  created_at: string;
}

export interface TareaEstudio {
  id: string;
  cliente_id: string | null;
  asignado_a: string | null;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  estado: EstadoTramite;
  fecha_limite: string | null;
  completada_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Honorario {
  id: string;
  cliente_id: string;
  periodo_fiscal: string;
  concepto: string;
  monto_ars: number;
  estado: EstadoFactura;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  fecha_cobro: string | null;
  punto_venta: number | null;
  numero_factura: number | null;
  path_pdf_factura: string | null;
  created_at: string;
}

export interface Consulta {
  id: string;
  cliente_id: string;
  asunto: string;
  estado: "ABIERTA" | "RESPONDIDA" | "CERRADA";
  abierta_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultaMensaje {
  id: string;
  consulta_id: string;
  autor_id: string | null;
  cuerpo: string;
  created_at: string;
}

export interface VencimientoCalendario {
  id: string;
  organismo: string;
  impuesto_tipo: string;
  periodo_fiscal: string;
  terminacion_cuit: number | null;
  fecha_vencimiento: string;
  descripcion: string | null;
}

// ---------------------------------------------------------------------------
// 0004 — tipos de cliente, aportes, impuestos y planes de pago
// ---------------------------------------------------------------------------

export type FormaJuridica =
  | "UNIPERSONAL"
  | "SAS"
  | "SRL"
  | "SA"
  | "SOCIEDAD_HECHO"
  | "OTRA";

export type RolVinculo = "TITULAR" | "REPRESENTANTE" | "SOCIO" | "APODERADO";
export type OrigenPlan = "ARCA" | "RENTAS";
export type EstadoPlan = "VIGENTE" | "CADUCO" | "CANCELADO" | "FINALIZADO";
export type EstadoCuota = "PENDIENTE" | "ENVIADA" | "PAGADA" | "VENCIDA";
export type CanalEnvio = "WHATSAPP" | "EMAIL" | "PORTAL" | "OTRO";

export interface VinculoCliente {
  id: string;
  persona_id: string;
  sociedad_id: string;
  rol_vinculo: RolVinculo;
  participacion: number | null;
  desde: string | null;
  hasta: string | null;
  notas: string | null;
  created_at: string;
}

export interface ObligacionConfig {
  id: string;
  cliente_id: string;
  impuesto_tipo: string;
  organismo: string;
  dia_vencimiento: number;
  activo: boolean;
  notas: string | null;
  created_at: string;
}

export interface PlanPago {
  id: string;
  cliente_id: string;
  origen: OrigenPlan;
  tipo_plan: string;
  numero_plan: string;
  cantidad_cuotas: number;
  monto_total_ars: number;
  fecha_presentacion: string | null;
  estado: EstadoPlan;
  dia_vencimiento_1: number;
  dia_vencimiento_2: number | null;
  cbu_debito: string | null;
  rentas_tipo_pp: string | null;
  rentas_nro_pp: string | null;
  rentas_cod_validacion: string | null;
  rentas_padron: string | null;
  rentas_obligacion: string | null;
  rentas_cod_pago_elec: string | null;
  dia_pago: number | null;
  dia_envio: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanResumen extends PlanPago {
  razon_social: string;
  cuit: string;
  cuotas_cargadas: number;
  cuotas_pagadas: number;
  cuotas_vencidas: number;
  cuotas_pendientes: number;
  pagado_ars: number;
  vencido_ars: number;
  proximo_vencimiento: string | null;
}

export interface CuotaPlan {
  id: string;
  plan_id: string;
  numero_cuota: number;
  periodo: string | null;
  fecha_vencimiento: string;
  fecha_vencimiento_2: string | null;
  importe_ars: number;
  importe_2_ars: number | null;
  estado: EstadoCuota;
  vep_codigo: string | null;
  vep_generado: boolean;
  path_pdf: string | null;
  boleta_url: string | null;
  enviada: boolean;
  fecha_envio: string | null;
  canal_envio: CanalEnvio | null;
  fecha_pago: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type ConceptoVolante = "MONOTRIBUTO" | "AUTONOMO";
export type ActividadMonotributo = "SERVICIOS" | "VENTA";

export interface VolantePago {
  id: string;
  cliente_id: string;
  concepto: ConceptoVolante;
  periodo: string;
  fecha_vencimiento: string;
  periodo_desde: string | null;
  periodo_hasta: string | null;
  fecha_calculo: string | null;
  numero_vep: string | null;
  importe_ars: number;
  categoria: string | null;
  generado: boolean;
  path_archivo: string | null;
  mime_type: string | null;
  enviado: boolean;
  fecha_envio: string | null;
  canal_envio: CanalEnvio | null;
  pagado: boolean;
  fecha_pago: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaldoIvaPeriodo {
  id: string;
  cliente_id: string;
  periodo_fiscal: string;
  saldo_favor_anterior: number;
  created_at: string;
  updated_at: string;
}
