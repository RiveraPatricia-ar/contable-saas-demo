-- =============================================================================
-- ContableSaaS AR — 0005
-- Aviso automatico de recategorizacion del Monotributo.
--
-- La escala oficial vive en el codigo (src/lib/parametros-fiscales.ts) para
-- tener una sola fuente de verdad. Esta migracion aporta el otro lado de la
-- comparacion: cuanto facturo cada cliente en los ultimos 12 meses.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CAMPOS NUEVOS EN EL LEGAJO
-- -----------------------------------------------------------------------------
ALTER TABLE public.clientes_estudio
  ADD COLUMN IF NOT EXISTS ingresos_12m_manual          NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS fecha_ultima_recategorizacion DATE,
  ADD COLUMN IF NOT EXISTS excluir_de_recategorizacion  BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.clientes_estudio.ingresos_12m_manual IS
  'Ingresos brutos de los ultimos 12 meses cargados a mano. Tiene prioridad
   sobre la suma de comprobantes, para los clientes que no facturan dentro
   del sistema.';
COMMENT ON COLUMN public.clientes_estudio.excluir_de_recategorizacion IS
  'Saca al cliente del tablero de avisos (por ejemplo si dejo el monotributo).';

-- -----------------------------------------------------------------------------
-- 2. INGRESOS DE LOS ULTIMOS 12 MESES
--    Suma las ventas registradas en comprobantes. Se toma el total del
--    comprobante y se restan las notas de credito.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.ingresos_ultimos_12m
WITH (security_invoker = true) AS
SELECT c.id AS cliente_id,
       COALESCE(SUM(
         CASE WHEN co.tipo_comprobante LIKE 'NC%' THEN -co.total ELSE co.total END
       ), 0)                                        AS ventas_12m,
       COUNT(co.id)                                 AS comprobantes_12m,
       MAX(co.fecha_emision)                        AS ultima_venta
  FROM public.clientes_estudio c
  LEFT JOIN public.comprobantes co
         ON co.cliente_id = c.id
        AND co.tipo_operacion = 'VENTA'
        AND co.fecha_emision > (CURRENT_DATE - INTERVAL '12 months')
 GROUP BY c.id;

-- -----------------------------------------------------------------------------
-- 3. TABLERO DE RECATEGORIZACION
--    Devuelve, por cada monotributista activo, los ingresos a considerar.
--    La categoria sugerida se calcula en la app contra la escala vigente.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.recategorizacion_pendiente
WITH (security_invoker = true) AS
SELECT c.id,
       c.razon_social,
       c.cuit,
       c.categoria_monotributo,
       c.fecha_ultima_recategorizacion,
       c.ingresos_12m_manual,
       i.ventas_12m,
       i.comprobantes_12m,
       i.ultima_venta,
       COALESCE(c.ingresos_12m_manual, i.ventas_12m) AS ingresos_considerados,
       (c.ingresos_12m_manual IS NOT NULL)           AS ingresos_son_manuales
  FROM public.clientes_estudio c
  JOIN public.ingresos_ultimos_12m i ON i.cliente_id = c.id
 WHERE c.estado_activo
   AND NOT c.excluir_de_recategorizacion
   AND c.condicion_iva = 'MONOTRIBUTO';
