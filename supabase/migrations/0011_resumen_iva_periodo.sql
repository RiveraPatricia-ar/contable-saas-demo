-- =============================================================================
-- ContableSaaS AR — 0011
-- Totales del Libro IVA por cliente / período / libro.
--
-- Al importar los CSV de "Mis Comprobantes" de ARCA ya no se guarda cada
-- comprobante: se guarda UNA fila con los totales del período (las notas de
-- crédito ya vienen restadas). La tabla `comprobantes` queda para las cargas
-- manuales, que se suman a estos totales.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.resumen_iva_periodo (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id              UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  periodo_fiscal          VARCHAR(7) NOT NULL,        -- YYYY-MM
  tipo_operacion          VARCHAR(10) NOT NULL CHECK (tipo_operacion IN ('VENTA', 'COMPRA')),
  cantidad_comprobantes   INT NOT NULL DEFAULT 0,
  cantidad_notas_credito  INT NOT NULL DEFAULT 0,
  neto_gravado            NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  neto_no_gravado         NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  exento                  NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  iva_21                  NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  iva_10_5                NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  iva_27                  NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  iva_otras               NUMERIC(16, 2) NOT NULL DEFAULT 0.00,  -- 2,5% y 5%
  iva_total               NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  otros_tributos          NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  total                   NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  archivo_nombre          TEXT,
  importado_por           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT resumen_iva_periodo_formato CHECK (periodo_fiscal ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT resumen_iva_unico UNIQUE (cliente_id, periodo_fiscal, tipo_operacion)
);

DROP TRIGGER IF EXISTS trg_updated_at ON public.resumen_iva_periodo;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.resumen_iva_periodo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.resumen_iva_periodo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resumen_iva_staff_all ON public.resumen_iva_periodo;
CREATE POLICY resumen_iva_staff_all ON public.resumen_iva_periodo
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS resumen_iva_cliente_select ON public.resumen_iva_periodo;
CREATE POLICY resumen_iva_cliente_select ON public.resumen_iva_periodo
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT public.mis_clientes_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumen_iva_periodo TO authenticated;

-- -----------------------------------------------------------------------------
-- Recategorización: los ingresos de 12 meses suman los totales importados
-- más los comprobantes cargados a mano. Las notas de crédito restan (códigos
-- ARCA 3, 8, 13, 53, 113, 203, 208, 213 o códigos internos NC_*).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.ingresos_ultimos_12m
WITH (security_invoker = true) AS
WITH manuales AS (
  SELECT co.cliente_id,
         SUM(CASE WHEN co.tipo_comprobante LIKE 'NC%'
                    OR co.tipo_comprobante IN ('3','8','13','53','113','203','208','213')
                  THEN -co.total ELSE co.total END) AS ventas,
         COUNT(*)                                   AS cantidad,
         MAX(co.fecha_emision)                      AS ultima
    FROM public.comprobantes co
   WHERE co.tipo_operacion = 'VENTA'
     AND co.fecha_emision > (CURRENT_DATE - INTERVAL '12 months')
   GROUP BY co.cliente_id
), importados AS (
  SELECT r.cliente_id,
         SUM(r.total)                                         AS ventas,
         SUM(r.cantidad_comprobantes)                         AS cantidad,
         MAX(to_date(r.periodo_fiscal || '-01', 'YYYY-MM-DD')) AS ultima
    FROM public.resumen_iva_periodo r
   WHERE r.tipo_operacion = 'VENTA'
     AND r.periodo_fiscal > to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM')
   GROUP BY r.cliente_id
)
SELECT c.id                                                   AS cliente_id,
       COALESCE(m.ventas, 0) + COALESCE(i.ventas, 0)          AS ventas_12m,
       (COALESCE(m.cantidad, 0) + COALESCE(i.cantidad, 0))::BIGINT AS comprobantes_12m,
       GREATEST(m.ultima, i.ultima)                           AS ultima_venta
  FROM public.clientes_estudio c
  LEFT JOIN manuales   m ON m.cliente_id = c.id
  LEFT JOIN importados i ON i.cliente_id = c.id;

-- -----------------------------------------------------------------------------
-- Migración de datos: lo que ya se había importado comprobante por comprobante
-- se convierte en totales (con las notas de crédito restando) y se borra el
-- detalle. El IVA queda bien; neto y total conviene reimportarlos, porque la
-- versión anterior no leía esas columnas del CSV de ARCA.
-- -----------------------------------------------------------------------------
INSERT INTO public.resumen_iva_periodo (
  cliente_id, periodo_fiscal, tipo_operacion,
  cantidad_comprobantes, cantidad_notas_credito,
  neto_gravado, neto_no_gravado, exento,
  iva_21, iva_10_5, iva_27, iva_total, total, archivo_nombre
)
SELECT x.cliente_id, x.periodo_fiscal, x.tipo_operacion,
       COUNT(*), SUM(CASE WHEN x.s < 0 THEN 1 ELSE 0 END),
       SUM(x.s * x.neto_gravado), SUM(x.s * x.neto_no_gravado), SUM(x.s * x.exento),
       SUM(x.s * x.iva_21), SUM(x.s * x.iva_10_5), SUM(x.s * x.iva_27),
       SUM(x.s * (x.iva_21 + x.iva_10_5 + x.iva_27)), SUM(x.s * x.total),
       'Migrado de comprobantes importados'
  FROM (
    SELECT co.*,
           CASE WHEN co.tipo_comprobante LIKE 'NC%'
                  OR co.tipo_comprobante IN ('3','8','13','53','113','203','208','213')
                THEN -1 ELSE 1 END AS s
      FROM public.comprobantes co
     WHERE co.origen = 'IMPORTADO'
  ) x
 GROUP BY x.cliente_id, x.periodo_fiscal, x.tipo_operacion
ON CONFLICT (cliente_id, periodo_fiscal, tipo_operacion) DO NOTHING;

DELETE FROM public.comprobantes WHERE origen = 'IMPORTADO';
