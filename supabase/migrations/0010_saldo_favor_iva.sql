-- =============================================================================
-- ContableSaaS AR — 0010
-- Saldo a favor de IVA arrastrado del período anterior.
--
-- Se guarda por cliente y período (YYYY-MM) y se descuenta en la pantalla de
-- comprobantes:
--   Saldo del período = IVA débito fiscal - IVA crédito fiscal
--                       - saldo a favor del período anterior
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.saldos_iva_periodo (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id            UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  periodo_fiscal        VARCHAR(7) NOT NULL,   -- YYYY-MM
  saldo_favor_anterior  NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saldo_iva_periodo_formato CHECK (periodo_fiscal ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT saldo_iva_no_negativo CHECK (saldo_favor_anterior >= 0),
  CONSTRAINT saldo_iva_unico UNIQUE (cliente_id, periodo_fiscal)
);

DROP TRIGGER IF EXISTS trg_updated_at ON public.saldos_iva_periodo;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.saldos_iva_periodo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: el estudio lo gestiona; el cliente solo lo ve.
ALTER TABLE public.saldos_iva_periodo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saldo_iva_staff_all ON public.saldos_iva_periodo;
CREATE POLICY saldo_iva_staff_all ON public.saldos_iva_periodo
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS saldo_iva_cliente_select ON public.saldos_iva_periodo;
CREATE POLICY saldo_iva_cliente_select ON public.saldos_iva_periodo
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT public.mis_clientes_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saldos_iva_periodo TO authenticated;
