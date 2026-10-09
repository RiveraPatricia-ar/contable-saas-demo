-- =============================================================================
-- ContableSaaS AR — 0008
-- Varias emisiones del mismo volante.
--
-- Un mismo periodo puede tener que generarse mas de una vez en la CCMA con
-- distinta fecha de calculo de intereses (por ejemplo, si el cliente no pago
-- a tiempo y hay que darle un VEP nuevo). Cada generacion queda como una fila
-- propia; la anterior se marca como reemplazada y queda de historico.
--
-- Regla: puede haber muchas emisiones por cliente, concepto y periodo, pero
-- una sola vigente (no reemplazada).
-- =============================================================================

ALTER TABLE public.volantes_pago
  DROP CONSTRAINT IF EXISTS volante_unico;

ALTER TABLE public.volantes_pago
  ADD COLUMN IF NOT EXISTS reemplazado     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reemplazado_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS emision         SMALLINT NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.volantes_pago.reemplazado IS
  'TRUE cuando se genero una emision nueva del mismo periodo con otra fecha de calculo.';
COMMENT ON COLUMN public.volantes_pago.emision IS
  'Numero de emision dentro del periodo: 1 la original, 2 la primera regeneracion, etc.';

-- Una sola emision vigente por cliente, concepto y periodo.
CREATE UNIQUE INDEX IF NOT EXISTS volante_vigente_unico
  ON public.volantes_pago (cliente_id, concepto, periodo)
  WHERE NOT reemplazado;

CREATE INDEX IF NOT EXISTS idx_volantes_cli_conc_per
  ON public.volantes_pago (cliente_id, concepto, periodo, emision);

-- El "desde" y el "hasta" pasan a ser siempre el periodo que se paga: se
-- alinean los que ya estaban cargados.
UPDATE public.volantes_pago
   SET periodo_desde = periodo,
       periodo_hasta = periodo
 WHERE periodo_desde IS DISTINCT FROM periodo
    OR periodo_hasta IS DISTINCT FROM periodo;
