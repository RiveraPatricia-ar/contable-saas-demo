-- =============================================================================
-- ContableSaaS AR — 0007
-- Volantes de pago de Monotributo y Autonomos.
--
-- Circuito real del estudio, en la CCMA de ARCA (Cuenta Corriente de
-- Monotributistas y Autonomos):
--   1. Calculo de deuda a fecha: periodo desde, periodo hasta y fecha de
--      calculo = hoy + 5 dias, para darle margen al cliente.
--   2. Generacion del VEP, eligiendo "Pago con QR" como medio de pago.
--   3. La pantalla final muestra el numero de VEP, el importe y el QR, que se
--      captura y se le manda al cliente.
--
-- Esta tabla lleva el seguimiento de cada volante. La generacion en si no se
-- puede automatizar: la CCMA exige clave fiscal.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.concepto_volante_enum AS ENUM ('MONOTRIBUTO', 'AUTONOMO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.actividad_monotributo_enum AS ENUM ('SERVICIOS', 'VENTA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 1. ACTIVIDAD DEL MONOTRIBUTISTA
--    La escala tiene dos cuotas por categoria: locaciones y prestaciones de
--    servicios, y venta de cosas muebles. Sin este dato no se puede saber cual
--    le corresponde.
-- -----------------------------------------------------------------------------
ALTER TABLE public.clientes_estudio
  ADD COLUMN IF NOT EXISTS actividad_monotributo public.actividad_monotributo_enum
    NOT NULL DEFAULT 'SERVICIOS';

COMMENT ON COLUMN public.clientes_estudio.actividad_monotributo IS
  'Define que columna de la escala se usa para la cuota mensual.';

-- -----------------------------------------------------------------------------
-- 2. VOLANTES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.volantes_pago (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  concepto          public.concepto_volante_enum NOT NULL,
  periodo           VARCHAR(7) NOT NULL,          -- AAAA-MM, el mes que se liquida
  fecha_vencimiento DATE NOT NULL,                -- 21 monotributo / 5 autonomos
  -- Los tres datos que pide la pantalla "Calculo de deuda a fecha".
  periodo_desde     VARCHAR(7),
  periodo_hasta     VARCHAR(7),
  fecha_calculo     DATE,                         -- hoy + 5 dias
  -- Lo que devuelve ARCA una vez generado.
  numero_vep        VARCHAR(30),
  importe_ars       NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  -- Categoria al momento de generarlo, para que el historico no cambie si el
  -- cliente se recategoriza despues.
  categoria         VARCHAR(4),
  generado          BOOLEAN NOT NULL DEFAULT FALSE,
  path_archivo      TEXT,                         -- QR o volante en el bucket
  mime_type         VARCHAR(100),                 -- image/png, application/pdf...
  enviado           BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_envio       DATE,
  canal_envio       public.canal_envio_enum,
  pagado            BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_pago        DATE,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT periodo_volante_formato CHECK (periodo ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT periodo_desde_formato CHECK (
    periodo_desde IS NULL OR periodo_desde ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  ),
  CONSTRAINT periodo_hasta_formato CHECK (
    periodo_hasta IS NULL OR periodo_hasta ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  ),
  CONSTRAINT volante_unico UNIQUE (cliente_id, concepto, periodo)
);

CREATE INDEX IF NOT EXISTS idx_volantes_periodo ON public.volantes_pago(periodo);
CREATE INDEX IF NOT EXISTS idx_volantes_cliente ON public.volantes_pago(cliente_id);
CREATE INDEX IF NOT EXISTS idx_volantes_venc    ON public.volantes_pago(fecha_vencimiento);

DROP TRIGGER IF EXISTS trg_updated_at ON public.volantes_pago;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.volantes_pago
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Coherencia de banderas y fechas.
CREATE OR REPLACE FUNCTION public.sincronizar_banderas_volante()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.path_archivo IS NOT NULL OR NEW.numero_vep IS NOT NULL THEN
    NEW.generado := TRUE;
  END IF;
  IF NEW.enviado AND NEW.fecha_envio IS NULL THEN
    NEW.fecha_envio := CURRENT_DATE;
  END IF;
  IF NEW.pagado AND NEW.fecha_pago IS NULL THEN
    NEW.fecha_pago := CURRENT_DATE;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_banderas_volante ON public.volantes_pago;
CREATE TRIGGER trg_banderas_volante
  BEFORE INSERT OR UPDATE ON public.volantes_pago
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_banderas_volante();

-- -----------------------------------------------------------------------------
-- 3. QUIENES PAGAN CADA CONCEPTO
--    Vista de apoyo: los importes se calculan en la app contra la escala
--    vigente, que vive en el codigo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.aportantes
WITH (security_invoker = true) AS
SELECT c.id AS cliente_id,
       c.razon_social,
       c.cuit,
       c.email_contacto,
       c.telefono_contacto,
       c.categoria_monotributo,
       c.actividad_monotributo,
       c.aporta_monotributo,
       c.aporta_autonomo,
       c.categoria_autonomo
  FROM public.clientes_estudio c
 WHERE c.estado_activo
   AND (c.aporta_monotributo OR c.aporta_autonomo);

-- -----------------------------------------------------------------------------
-- 4. RLS Y PERMISOS
-- -----------------------------------------------------------------------------
ALTER TABLE public.volantes_pago ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volantes_staff_all ON public.volantes_pago;
CREATE POLICY volantes_staff_all ON public.volantes_pago
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS volantes_cliente_select ON public.volantes_pago;
CREATE POLICY volantes_cliente_select ON public.volantes_pago
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT public.mis_clientes_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volantes_pago TO authenticated;
GRANT SELECT ON public.aportantes TO authenticated;
