/**
 * ============================================================================
 * PARAMETROS FISCALES
 * ============================================================================
 * La escala del Monotributo de abajo es la tabla oficial cargada el
 * 19/09/2026. Se actualiza por resolucion general de ARCA, en general dos
 * veces al anio: cuando salga la nueva, reemplazar los numeros de
 * ESCALA_MONOTRIBUTO y la constante VIGENCIA_DECLARADA.
 *
 * Las alicuotas de Ingresos Brutos siguen siendo valores de referencia: cada
 * jurisdiccion fija la suya segun la actividad.
 * ============================================================================
 */

export const VIGENCIA_DECLARADA = "Escala de Monotributo cargada el 19/09/2026";

export interface CategoriaMonotributo {
  categoria: string;
  /** Tope de ingresos brutos anuales de la categoria. */
  topeIngresosAnuales: number;
  /** Superficie afectada maxima, en m2. */
  supAfectadaM2: number;
  /** Energia electrica consumida anualmente, en Kw. */
  energiaAnualKw: number;
  /** Tope de alquileres devengados anualmente. */
  alquileresDevengados: number;
  impuestoIntegradoServicios: number;
  impuestoIntegradoVenta: number;
  aportesSipa: number;
  aportesObraSocial: number;
  /** Cuota mensual total — locaciones y prestaciones de servicios. */
  totalServicios: number;
  /** Cuota mensual total — venta de cosas muebles. */
  totalVenta: number;
}

/** Precio unitario maximo para venta de cosas muebles (igual en todas las categorias). */
export const PRECIO_UNITARIO_MAXIMO = 716_840.77;

export const ESCALA_MONOTRIBUTO: CategoriaMonotributo[] = [
  {
    categoria: "A",
    topeIngresosAnuales: 12_009_410.45,
    supAfectadaM2: 30,
    energiaAnualKw: 3330,
    alquileresDevengados: 2_792_886.15,
    impuestoIntegradoServicios: 5_585.77,
    impuestoIntegradoVenta: 5_585.77,
    aportesSipa: 18_246.86,
    aportesObraSocial: 25_694.55,
    totalServicios: 49_527.18,
    totalVenta: 49_527.18,
  },
  {
    categoria: "B",
    topeIngresosAnuales: 17_595_182.74,
    supAfectadaM2: 45,
    energiaAnualKw: 5000,
    alquileresDevengados: 2_792_886.15,
    impuestoIntegradoServicios: 10_612.98,
    impuestoIntegradoVenta: 10_612.98,
    aportesSipa: 20_071.55,
    aportesObraSocial: 25_694.55,
    totalServicios: 56_379.08,
    totalVenta: 56_379.08,
  },
  {
    categoria: "C",
    topeIngresosAnuales: 24_670_494.31,
    supAfectadaM2: 60,
    energiaAnualKw: 6700,
    alquileresDevengados: 3_816_944.41,
    impuestoIntegradoServicios: 18_246.86,
    impuestoIntegradoVenta: 16_757.32,
    aportesSipa: 22_078.71,
    aportesObraSocial: 25_694.55,
    totalServicios: 66_020.12,
    totalVenta: 64_530.58,
  },
  {
    categoria: "D",
    topeIngresosAnuales: 30_628_651.43,
    supAfectadaM2: 85,
    energiaAnualKw: 10000,
    alquileresDevengados: 3_816_944.41,
    impuestoIntegradoServicios: 29_790.79,
    impuestoIntegradoVenta: 27_742.67,
    aportesSipa: 24_286.58,
    aportesObraSocial: 30_535.56,
    totalServicios: 84_612.93,
    totalVenta: 82_564.81,
  },
  {
    categoria: "E",
    topeIngresosAnuales: 36_028_231.33,
    supAfectadaM2: 110,
    energiaAnualKw: 13000,
    alquileresDevengados: 4_841_002.66,
    impuestoIntegradoServicios: 55_857.73,
    impuestoIntegradoVenta: 44_313.79,
    aportesSipa: 26_715.24,
    aportesObraSocial: 37_238.48,
    totalServicios: 119_811.45,
    totalVenta: 108_267.51,
  },
  {
    categoria: "F",
    topeIngresosAnuales: 45_151_659.41,
    supAfectadaM2: 150,
    energiaAnualKw: 16500,
    alquileresDevengados: 4_841_002.66,
    impuestoIntegradoServicios: 78_573.20,
    impuestoIntegradoVenta: 57_719.64,
    aportesSipa: 29_386.76,
    aportesObraSocial: 42_824.25,
    totalServicios: 150_784.21,
    totalVenta: 129_930.65,
  },
  {
    categoria: "G",
    topeIngresosAnuales: 53_995_798.87,
    supAfectadaM2: 200,
    energiaAnualKw: 20000,
    alquileresDevengados: 5_771_964.69,
    impuestoIntegradoServicios: 142_995.76,
    impuestoIntegradoVenta: 71_497.87,
    aportesSipa: 41_141.46,
    aportesObraSocial: 46_175.72,
    totalServicios: 230_312.94,
    totalVenta: 158_815.05,
  },
  {
    categoria: "H",
    topeIngresosAnuales: 81_924_660.37,
    supAfectadaM2: 200,
    energiaAnualKw: 20000,
    alquileresDevengados: 8_378_658.45,
    impuestoIntegradoServicios: 409_623.31,
    impuestoIntegradoVenta: 204_811.64,
    aportesSipa: 57_598.04,
    aportesObraSocial: 55_485.33,
    totalServicios: 522_706.68,
    totalVenta: 317_895.01,
  },
  {
    categoria: "I",
    topeIngresosAnuales: 91_699_761.90,
    supAfectadaM2: 200,
    energiaAnualKw: 20000,
    alquileresDevengados: 8_378_658.45,
    impuestoIntegradoServicios: 814_591.79,
    impuestoIntegradoVenta: 325_836.71,
    aportesSipa: 80_637.26,
    aportesObraSocial: 68_518.81,
    totalServicios: 963_747.86,
    totalVenta: 474_992.78,
  },
  {
    categoria: "J",
    topeIngresosAnuales: 105_012_519.20,
    supAfectadaM2: 200,
    energiaAnualKw: 20000,
    alquileresDevengados: 8_378_658.45,
    impuestoIntegradoServicios: 977_510.14,
    impuestoIntegradoVenta: 391_004.07,
    aportesSipa: 112_892.16,
    aportesObraSocial: 76_897.46,
    totalServicios: 1_167_299.76,
    totalVenta: 580_793.69,
  },
  {
    categoria: "K",
    topeIngresosAnuales: 126_610_838.75,
    supAfectadaM2: 200,
    energiaAnualKw: 20000,
    alquileresDevengados: 8_378_658.45,
    impuestoIntegradoServicios: 1_368_514.20,
    impuestoIntegradoVenta: 456_171.40,
    aportesSipa: 158_049.02,
    aportesObraSocial: 87_882.82,
    totalServicios: 1_614_446.04,
    totalVenta: 702_103.24,
  },
];

export const ALICUOTA_IVA_GENERAL = 0.21;

/** Valores de referencia: la alicuota real depende de la jurisdiccion y la actividad. */
export const ALICUOTAS_IIBB: Record<string, number> = {
  CABA: 0.03,
  "Buenos Aires": 0.035,
  Córdoba: 0.04,
  "Santa Fe": 0.045,
  Tucumán: 0.035,
  Otra: 0.035,
};

/** Encuentra la categoria de Monotributo que corresponde a un ingreso anual. */
export function categoriaPorIngresoAnual(
  ingresoAnual: number
): CategoriaMonotributo | null {
  return (
    ESCALA_MONOTRIBUTO.find((c) => ingresoAnual <= c.topeIngresosAnuales) ?? null
  );
}

/**
 * Cuota mensual de la categoria segun el tipo de actividad.
 * Por defecto toma la de locaciones y prestaciones de servicios, que es el
 * caso mas frecuente en la cartera del estudio.
 */
export function cuotaMensual(
  cat: CategoriaMonotributo,
  actividad: "SERVICIOS" | "VENTA" = "SERVICIOS"
): number {
  return actividad === "VENTA" ? cat.totalVenta : cat.totalServicios;
}

// ---------------------------------------------------------------------------
// Recategorizacion
// ---------------------------------------------------------------------------

/**
 * Meses en los que ARCA abre la recategorizacion (1 = enero).
 * Revisar si cambia el regimen.
 */
export const MESES_RECATEGORIZACION = [1, 7] as const;

/** ¿Estamos en un mes de recategorizacion? */
export function esMesDeRecategorizacion(fecha: Date = new Date()): boolean {
  return (MESES_RECATEGORIZACION as readonly number[]).includes(
    fecha.getMonth() + 1
  );
}

export type EstadoRecategorizacion =
  | "OK"
  | "CERCA_DEL_TOPE"
  | "DEBE_SUBIR"
  | "PUEDE_BAJAR"
  | "EXCEDE_MONOTRIBUTO"
  | "SIN_DATOS";

export interface DiagnosticoRecategorizacion {
  estado: EstadoRecategorizacion;
  categoriaActual: string | null;
  categoriaSugerida: string | null;
  /** Porcentaje del tope de la categoria actual que ya consumio. */
  usoDelTope: number | null;
  /** Diferencia de cuota mensual entre la sugerida y la actual. */
  diferenciaCuota: number;
  /** Cuanto le falta para pasar a la categoria siguiente. */
  margenHastaElTope: number | null;
}

/** Umbral a partir del cual se avisa que esta por pasarse de categoria. */
export const UMBRAL_AVISO_TOPE = 0.9;

/**
 * Compara los ingresos de los ultimos 12 meses contra la escala y dice si el
 * cliente tiene que recategorizarse.
 */
export function diagnosticarRecategorizacion(
  ingresos12m: number,
  categoriaActual: string | null,
  actividad: "SERVICIOS" | "VENTA" = "SERVICIOS"
): DiagnosticoRecategorizacion {
  const actual =
    ESCALA_MONOTRIBUTO.find((c) => c.categoria === categoriaActual) ?? null;
  const sugerida = categoriaPorIngresoAnual(ingresos12m);

  const base: DiagnosticoRecategorizacion = {
    estado: "OK",
    categoriaActual: categoriaActual ?? null,
    categoriaSugerida: sugerida?.categoria ?? null,
    usoDelTope: actual ? ingresos12m / actual.topeIngresosAnuales : null,
    diferenciaCuota:
      sugerida && actual
        ? cuotaMensual(sugerida, actividad) - cuotaMensual(actual, actividad)
        : 0,
    margenHastaElTope: actual ? actual.topeIngresosAnuales - ingresos12m : null,
  };

  // Sin ingresos cargados no se puede decir nada.
  if (ingresos12m <= 0) return { ...base, estado: "SIN_DATOS" };

  // Se paso del tope de la categoria K: deja el monotributo.
  if (!sugerida) return { ...base, estado: "EXCEDE_MONOTRIBUTO" };

  if (!actual) return { ...base, estado: "DEBE_SUBIR" };

  const iActual = ESCALA_MONOTRIBUTO.indexOf(actual);
  const iSugerida = ESCALA_MONOTRIBUTO.indexOf(sugerida);

  if (iSugerida > iActual) return { ...base, estado: "DEBE_SUBIR" };
  if (iSugerida < iActual) return { ...base, estado: "PUEDE_BAJAR" };
  if ((base.usoDelTope ?? 0) >= UMBRAL_AVISO_TOPE)
    return { ...base, estado: "CERCA_DEL_TOPE" };

  return base;
}
