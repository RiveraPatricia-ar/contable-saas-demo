/**
 * Datos del estudio. Editar con los datos reales antes de publicar.
 */
export const ESTUDIO = {
  nombre: "Ortiz-Rivera contadores",
  razonSocial: "Estudio Contable S.R.L.",
  cuit: "30-00000000-0",
  matricula: "CPCE — Tomo 000 Folio 000",
  email: "contacto@estudiocontable.com.ar",
  telefono: "+54 11 0000-0000",
  whatsapp: "+54 9 11 0000-0000",
  domicilio: "Av. Corrientes 1234, CABA, Argentina",
};

export const IMPUESTOS = [
  { value: "F931_SUELDOS", label: "931 — Cargas sociales", organismo: "ARCA", diaVenc: 12 },
  { value: "SALUD_PUBLICA", label: "Salud Pública", organismo: "RENTAS", diaVenc: 15 },
  { value: "IVA", label: "IVA — DDJJ mensual", organismo: "ARCA", diaVenc: 18 },
  { value: "IIBB_LOCAL", label: "Ingresos Brutos", organismo: "RENTAS", diaVenc: 18 },
  { value: "TEM", label: "TEM — Tasa Económica Municipal", organismo: "MUNICIPAL", diaVenc: 15 },
  { value: "PYP", label: "PYP — Propiedad y Patentes", organismo: "RENTAS", diaVenc: 15 },
  { value: "MONOTRIBUTO", label: "Monotributo", organismo: "ARCA", diaVenc: 21 },
  { value: "AUTONOMO", label: "Autónomo — Aportes", organismo: "ARCA", diaVenc: 5 },
  { value: "SICORE", label: "SICORE — Retenciones", organismo: "ARCA", diaVenc: 10 },
  { value: "GANANCIAS", label: "Impuesto a las Ganancias", organismo: "ARCA", diaVenc: 12 },
  { value: "BIENES_PERSONALES", label: "Bienes Personales", organismo: "ARCA", diaVenc: 12 },
  { value: "SIFERE", label: "SIFERE — Convenio Multilateral", organismo: "COMARB", diaVenc: 18 },
] as const;

export const ETIQUETAS_IMPUESTO: Record<string, string> = Object.fromEntries(
  IMPUESTOS.map((i) => [i.value, i.label])
);

export const ORGANISMOS = ["ARCA", "RENTAS", "MUNICIPAL", "COMARB"] as const;

export const CATEGORIAS_MONOTRIBUTO = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K",
] as const;

export const PROVINCIAS = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán",
] as const;

export const ETIQUETAS_IVA: Record<string, string> = {
  MONOTRIBUTO: "Monotributo",
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  EXENTO: "Exento",
  CONSUMIDOR_FINAL: "Consumidor Final",
};

export const ETIQUETAS_IIBB: Record<string, string> = {
  LOCAL_ARBA: "IIBB Local (ARBA)",
  LOCAL_AGIP: "IIBB Local (AGIP)",
  CONVENIO_MULTILATERAL: "Convenio Multilateral",
  EXENTO: "Exento",
  NO_INSCRIPTO: "No inscripto",
};

export const ETIQUETAS_ESTADO: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  ESPERANDO_VEP: "Esperando VEP",
  PRESENTADO: "Presentado",
  PAGADO: "Pagado",
  FINALIZADO: "Finalizado",
  VENCIDO: "Vencido",
};

export const ETIQUETAS_FORMA_JURIDICA: Record<string, string> = {
  UNIPERSONAL: "Unipersonal",
  SAS: "S.A.S.",
  SRL: "S.R.L.",
  SA: "S.A.",
  SOCIEDAD_HECHO: "Sociedad de hecho",
  OTRA: "Otra",
};

export const ETIQUETAS_ROL_VINCULO: Record<string, string> = {
  TITULAR: "Titular",
  REPRESENTANTE: "Representante",
  SOCIO: "Socio",
  APODERADO: "Apoderado",
};

export const ETIQUETAS_ESTADO_PLAN: Record<string, string> = {
  VIGENTE: "Vigente",
  CADUCO: "Caduco",
  CANCELADO: "Cancelado",
  FINALIZADO: "Finalizado",
};

export const ETIQUETAS_ESTADO_CUOTA: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ENVIADA: "Enviada al cliente",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
};

export const ETIQUETAS_CANAL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  PORTAL: "Portal del cliente",
  OTRO: "Otro",
};

/** Dias fijos de vencimiento de los planes ARCA — Mis Facilidades. */
export const ARCA_DIAS_VENCIMIENTO = { primero: 16, segundo: 26 } as const;

/** Rentas Tucuman: se paga el 15 y la boleta se envia al cliente el dia 10. */
export const RENTAS_DIAS = { pago: 15, envio: 10 } as const;

export const CATEGORIAS_AUTONOMO = ["I", "II", "III", "IV", "V"] as const;

// ---------------------------------------------------------------------------
// Volantes de pago de Monotributo y Autonomos (CCMA de ARCA)
// ---------------------------------------------------------------------------

/** Dias de vencimiento. Editar si cambia el criterio del estudio. */
export const VOLANTES_DIAS = {
  /** El monotributo vence el 21 de cada mes. */
  monotributo: 21,
  /** Autonomos se fija el 5 de cada mes. */
  autonomo: 5,
  /**
   * Dias que se le suman a hoy para la fecha de calculo, para que el cliente
   * tenga margen de pago.
   */
  margenCalculo: 5,
} as const;

export const ETIQUETAS_CONCEPTO: Record<string, string> = {
  MONOTRIBUTO: "Monotributo",
  AUTONOMO: "Autónomo",
};

export const ETIQUETAS_ACTIVIDAD: Record<string, string> = {
  SERVICIOS: "Servicios",
  VENTA: "Venta de cosas muebles",
};

/**
 * Acceso con clave fiscal que entra directo a la CCMA (Cuenta Corriente de
 * Monotributistas y Autónomos). Es el link oficial que publica
 * argentina.gob.ar en «Pagar el monotributo».
 */
export const URL_CCMA =
  "https://auth.afip.gov.ar/contribuyente_/login.xhtml?action=SYSTEM&system=ccam";

/** Acceso general con clave fiscal, por si hace falta entrar al portal. */
export const URL_CLAVE_FISCAL =
  "https://auth.afip.gob.ar/contribuyente_/login.xhtml";
