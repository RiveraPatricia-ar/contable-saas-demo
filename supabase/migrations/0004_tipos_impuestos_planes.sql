-- =============================================================================
-- ContableSaaS AR — 0004
-- Tipos de cliente (RI / MT / SAS), aportes, seguimiento de impuestos con
-- boleta y envio, y planes de pago (ARCA Mis Facilidades / Rentas Tucuman).
--
-- Modelo elegido: cada CUIT es un legajo propio en clientes_estudio. Una
-- persona fisica (RI o MT) se vincula a sus sociedades (SAS/SRL) mediante
-- public.vinculos_cliente. Asi un mismo titular puede ser monotributista y
-- ademas titular de una SAS, cada uno con sus impuestos y planes separados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS NUEVOS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.forma_juridica_enum AS ENUM (
    'UNIPERSONAL', 'SAS', 'SRL', 'SA', 'SOCIEDAD_HECHO', 'OTRA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rol_vinculo_enum AS ENUM (
    'TITULAR', 'REPRESENTANTE', 'SOCIO', 'APODERADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.origen_plan_enum AS ENUM ('ARCA', 'RENTAS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_plan_enum AS ENUM (
    'VIGENTE', 'CADUCO', 'CANCELADO', 'FINALIZADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_cuota_enum AS ENUM (
    'PENDIENTE', 'ENVIADA', 'PAGADA', 'VENCIDA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.canal_envio_enum AS ENUM ('WHATSAPP', 'EMAIL', 'PORTAL', 'OTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. CLIENTES: forma juridica y aportes
-- -----------------------------------------------------------------------------
ALTER TABLE public.clientes_estudio
  ADD COLUMN IF NOT EXISTS forma_juridica      public.forma_juridica_enum NOT NULL DEFAULT 'UNIPERSONAL',
  ADD COLUMN IF NOT EXISTS aporta_monotributo  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aporta_autonomo     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS categoria_autonomo  VARCHAR(4),
  ADD COLUMN IF NOT EXISTS padron_rentas       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS alias_planilla      VARCHAR(120);

COMMENT ON COLUMN public.clientes_estudio.aporta_monotributo IS
  'El cliente paga el componente previsional del monotributo.';
COMMENT ON COLUMN public.clientes_estudio.aporta_autonomo IS
  'El cliente paga aportes de autonomos. Puede convivir con aporta_monotributo.';
COMMENT ON COLUMN public.clientes_estudio.alias_planilla IS
  'Nombre corto tal como figura en la planilla historica del estudio.';

-- Las sociedades no llevan categoria de monotributo: se relaja el CHECK previo
-- para que aplique solo a personas fisicas.
ALTER TABLE public.clientes_estudio DROP CONSTRAINT IF EXISTS monotributo_con_categoria;
ALTER TABLE public.clientes_estudio
  ADD CONSTRAINT monotributo_con_categoria CHECK (
    tipo_persona <> 'FISICA'
    OR condicion_iva <> 'MONOTRIBUTO'
    OR categoria_monotributo IS NOT NULL
  );

-- -----------------------------------------------------------------------------
-- 3. VINCULOS PERSONA <-> SOCIEDAD
--    persona_id  = CUIT REPRES. de la planilla
--    sociedad_id = CUIT SAS de la planilla
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vinculos_cliente (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id     UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  sociedad_id    UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  rol_vinculo    public.rol_vinculo_enum NOT NULL DEFAULT 'TITULAR',
  participacion  NUMERIC(5, 2),
  desde          DATE,
  hasta          DATE,
  notas          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vinculo_no_reflexivo CHECK (persona_id <> sociedad_id),
  CONSTRAINT vinculo_unico UNIQUE (persona_id, sociedad_id, rol_vinculo)
);

CREATE INDEX IF NOT EXISTS idx_vinc_persona  ON public.vinculos_cliente(persona_id);
CREATE INDEX IF NOT EXISTS idx_vinc_sociedad ON public.vinculos_cliente(sociedad_id);

-- -----------------------------------------------------------------------------
-- 4. IMPUESTOS A SEGUIR: boleta, envio y estado de pago
--    Se extiende declaraciones_juradas en lugar de duplicar la tabla.
-- -----------------------------------------------------------------------------
ALTER TABLE public.declaraciones_juradas
  ADD COLUMN IF NOT EXISTS presentada           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS boleta_generada      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_boleta         DATE,
  ADD COLUMN IF NOT EXISTS boleta_url           TEXT,
  ADD COLUMN IF NOT EXISTS enviada_al_cliente   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_envio          DATE,
  ADD COLUMN IF NOT EXISTS canal_envio          public.canal_envio_enum,
  ADD COLUMN IF NOT EXISTS boleta_pagada        BOOLEAN NOT NULL DEFAULT FALSE;

-- Mantiene coherentes las banderas con el estado del tramite.
CREATE OR REPLACE FUNCTION public.sincronizar_banderas_ddjj()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.presentada AND NEW.fecha_presentacion IS NULL THEN
    NEW.fecha_presentacion := CURRENT_DATE;
  END IF;
  IF NEW.boleta_generada AND NEW.fecha_boleta IS NULL THEN
    NEW.fecha_boleta := CURRENT_DATE;
  END IF;
  IF NEW.enviada_al_cliente AND NEW.fecha_envio IS NULL THEN
    NEW.fecha_envio := CURRENT_DATE;
  END IF;
  IF NEW.boleta_pagada THEN
    IF NEW.fecha_pago IS NULL THEN NEW.fecha_pago := CURRENT_DATE; END IF;
    NEW.estado := 'PAGADO';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_banderas_ddjj ON public.declaraciones_juradas;
CREATE TRIGGER trg_banderas_ddjj
  BEFORE INSERT OR UPDATE ON public.declaraciones_juradas
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_banderas_ddjj();

-- -----------------------------------------------------------------------------
-- 5. CONFIGURACION DE OBLIGACIONES POR CLIENTE
--    Define que impuestos sigue cada cliente y en que dia vencen, para poder
--    generar el tablero del mes de una sola vez.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.obligaciones_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  impuesto_tipo     VARCHAR(50) NOT NULL,
  organismo         VARCHAR(20) NOT NULL DEFAULT 'ARCA',
  dia_vencimiento   SMALLINT NOT NULL DEFAULT 20,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dia_valido CHECK (dia_vencimiento BETWEEN 1 AND 28),
  CONSTRAINT config_unica UNIQUE (cliente_id, impuesto_tipo)
);

CREATE INDEX IF NOT EXISTS idx_oblig_cfg_cliente ON public.obligaciones_config(cliente_id);

/**
 * Genera las filas de declaraciones_juradas del periodo indicado para todos
 * los clientes activos, segun obligaciones_config. Idempotente: no pisa las
 * filas que ya existen.
 */
CREATE OR REPLACE FUNCTION public.generar_obligaciones_mes(p_periodo VARCHAR(7))
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n INT;
  v_primero DATE;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_periodo !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Periodo invalido (se espera AAAA-MM): %', p_periodo;
  END IF;

  -- El vencimiento cae en el mes SIGUIENTE al periodo liquidado.
  v_primero := (p_periodo || '-01')::DATE + INTERVAL '1 month';

  INSERT INTO public.declaraciones_juradas (
    cliente_id, impuesto_tipo, organismo, periodo_fiscal, fecha_vencimiento, estado
  )
  SELECT c.cliente_id,
         c.impuesto_tipo,
         c.organismo,
         p_periodo,
         v_primero + (c.dia_vencimiento - 1),
         'PENDIENTE'
    FROM public.obligaciones_config c
    JOIN public.clientes_estudio cl ON cl.id = c.cliente_id
   WHERE c.activo AND cl.estado_activo
  ON CONFLICT (cliente_id, impuesto_tipo, periodo_fiscal) DO NOTHING;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

GRANT EXECUTE ON FUNCTION public.generar_obligaciones_mes(VARCHAR) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. PLANES DE PAGO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planes_pago (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id            UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  origen                public.origen_plan_enum NOT NULL,
  tipo_plan             VARCHAR(120) NOT NULL,      -- 'RG 5711 - Plan Deuda Impositiva y Previsional' | '1571 - R.E.F.P.-S.P. PARCIAL'
  numero_plan           VARCHAR(40) NOT NULL,       -- 'V904235' (ARCA) | '542504' (Rentas)
  cantidad_cuotas       INT NOT NULL DEFAULT 0,
  monto_total_ars       NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  fecha_presentacion    DATE,
  estado                public.estado_plan_enum NOT NULL DEFAULT 'VIGENTE',

  -- ARCA / Mis Facilidades: dos vencimientos por mes (16 y 26).
  dia_vencimiento_1     SMALLINT NOT NULL DEFAULT 16,
  dia_vencimiento_2     SMALLINT,
  cbu_debito            VARCHAR(22),

  -- Rentas Tucuman: datos para regenerar la boleta de pago.
  rentas_tipo_pp        VARCHAR(10),   -- 1571
  rentas_nro_pp         VARCHAR(20),   -- 542504
  rentas_cod_validacion VARCHAR(10),   -- 4437
  rentas_padron         VARCHAR(30),
  rentas_obligacion     VARCHAR(30),
  rentas_cod_pago_elec  VARCHAR(30),
  dia_pago              SMALLINT,      -- 15
  dia_envio             SMALLINT,      -- 10 (recordatorio de envio al cliente)

  notas                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plan_unico UNIQUE (origen, numero_plan),
  CONSTRAINT dias_plan_validos CHECK (
    dia_vencimiento_1 BETWEEN 1 AND 28
    AND (dia_vencimiento_2 IS NULL OR dia_vencimiento_2 BETWEEN 1 AND 28)
    AND (dia_pago IS NULL OR dia_pago BETWEEN 1 AND 28)
    AND (dia_envio IS NULL OR dia_envio BETWEEN 1 AND 28)
  ),
  CONSTRAINT rentas_completo CHECK (
    origen <> 'RENTAS' OR (rentas_tipo_pp IS NOT NULL AND rentas_nro_pp IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_planes_cliente ON public.planes_pago(cliente_id);
CREATE INDEX IF NOT EXISTS idx_planes_origen  ON public.planes_pago(origen, estado);

CREATE TABLE IF NOT EXISTS public.cuotas_plan (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             UUID NOT NULL REFERENCES public.planes_pago(id) ON DELETE CASCADE,
  numero_cuota        INT NOT NULL,
  periodo             VARCHAR(7),
  fecha_vencimiento   DATE NOT NULL,
  fecha_vencimiento_2 DATE,                       -- 2do vencimiento (26 en ARCA)
  importe_ars         NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  importe_2_ars       NUMERIC(14, 2),
  estado              public.estado_cuota_enum NOT NULL DEFAULT 'PENDIENTE',
  vep_codigo          VARCHAR(100),
  vep_generado        BOOLEAN NOT NULL DEFAULT FALSE,
  path_pdf            TEXT,
  boleta_url          TEXT,
  enviada             BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_envio         DATE,
  canal_envio         public.canal_envio_enum,
  fecha_pago          DATE,
  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cuota_unica UNIQUE (plan_id, numero_cuota)
);

CREATE INDEX IF NOT EXISTS idx_cuotas_plan   ON public.cuotas_plan(plan_id, numero_cuota);
CREATE INDEX IF NOT EXISTS idx_cuotas_venc   ON public.cuotas_plan(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_cuotas_estado ON public.cuotas_plan(estado);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['planes_pago', 'cuotas_plan'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- Coherencia de banderas de la cuota.
CREATE OR REPLACE FUNCTION public.sincronizar_banderas_cuota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.enviada AND NEW.fecha_envio IS NULL THEN
    NEW.fecha_envio := CURRENT_DATE;
  END IF;
  IF NEW.estado = 'PAGADA' AND NEW.fecha_pago IS NULL THEN
    NEW.fecha_pago := CURRENT_DATE;
  END IF;
  IF NEW.fecha_pago IS NOT NULL THEN
    NEW.estado := 'PAGADA';
  ELSIF NEW.estado <> 'PAGADA'
        AND COALESCE(NEW.fecha_vencimiento_2, NEW.fecha_vencimiento) < CURRENT_DATE THEN
    NEW.estado := 'VENCIDA';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_banderas_cuota ON public.cuotas_plan;
CREATE TRIGGER trg_banderas_cuota
  BEFORE INSERT OR UPDATE ON public.cuotas_plan
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_banderas_cuota();

-- -----------------------------------------------------------------------------
-- 7. GENERACION AUTOMATICA DE CUOTAS
-- -----------------------------------------------------------------------------
/**
 * Crea las cuotas de un plan a partir de la primera fecha de vencimiento.
 * Para ARCA usa dia_vencimiento_1 y, si esta cargado, dia_vencimiento_2 del
 * mismo mes como segundo vencimiento. Idempotente por (plan, numero_cuota).
 */
CREATE OR REPLACE FUNCTION public.generar_cuotas_plan(
  p_plan_id UUID,
  p_primer_mes DATE,              -- cualquier dia del mes de la cuota 1
  p_importe NUMERIC DEFAULT NULL  -- importe uniforme; NULL = dejar en 0
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan public.planes_pago;
  v_mes  DATE;
  i      INT;
  n      INT := 0;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_plan FROM public.planes_pago WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan inexistente'; END IF;
  IF v_plan.cantidad_cuotas <= 0 THEN RAISE EXCEPTION 'El plan no tiene cantidad de cuotas'; END IF;

  v_mes := date_trunc('month', p_primer_mes)::DATE;

  FOR i IN 1..v_plan.cantidad_cuotas LOOP
    INSERT INTO public.cuotas_plan (
      plan_id, numero_cuota, periodo, fecha_vencimiento, fecha_vencimiento_2, importe_ars
    ) VALUES (
      p_plan_id,
      i,
      to_char(v_mes, 'YYYY-MM'),
      v_mes + (COALESCE(v_plan.dia_pago, v_plan.dia_vencimiento_1) - 1),
      CASE WHEN v_plan.dia_vencimiento_2 IS NOT NULL
           THEN v_mes + (v_plan.dia_vencimiento_2 - 1) END,
      COALESCE(p_importe, 0)
    )
    ON CONFLICT (plan_id, numero_cuota) DO NOTHING;

    IF FOUND THEN n := n + 1; END IF;
    v_mes := (v_mes + INTERVAL '1 month')::DATE;
  END LOOP;

  RETURN n;
END $$;

GRANT EXECUTE ON FUNCTION public.generar_cuotas_plan(UUID, DATE, NUMERIC) TO authenticated;

/** Marca como VENCIDA toda cuota impaga cuyo ultimo vencimiento ya paso. */
CREATE OR REPLACE FUNCTION public.marcar_cuotas_vencidas()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.cuotas_plan
     SET estado = 'VENCIDA'
   WHERE estado IN ('PENDIENTE', 'ENVIADA')
     AND COALESCE(fecha_vencimiento_2, fecha_vencimiento) < CURRENT_DATE;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- -----------------------------------------------------------------------------
-- 8. VISTAS DE RESUMEN
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.marcar_cuotas_vencidas() TO authenticated;

CREATE OR REPLACE VIEW public.planes_resumen
WITH (security_invoker = true) AS
SELECT p.*,
       cl.razon_social,
       cl.cuit,
       COUNT(c.id)                                             AS cuotas_cargadas,
       COUNT(c.id) FILTER (WHERE c.estado = 'PAGADA')          AS cuotas_pagadas,
       COUNT(c.id) FILTER (WHERE c.estado = 'VENCIDA')         AS cuotas_vencidas,
       COUNT(c.id) FILTER (WHERE c.estado IN ('PENDIENTE', 'ENVIADA')) AS cuotas_pendientes,
       COALESCE(SUM(c.importe_ars) FILTER (WHERE c.estado = 'PAGADA'), 0)  AS pagado_ars,
       COALESCE(SUM(c.importe_ars) FILTER (WHERE c.estado = 'VENCIDA'), 0) AS vencido_ars,
       MIN(c.fecha_vencimiento) FILTER (WHERE c.estado IN ('PENDIENTE', 'ENVIADA')) AS proximo_vencimiento
  FROM public.planes_pago p
  JOIN public.clientes_estudio cl ON cl.id = p.cliente_id
  LEFT JOIN public.cuotas_plan c ON c.plan_id = p.id
 GROUP BY p.id, cl.razon_social, cl.cuit;

/** Ficha de cliente: sociedades vinculadas y condicion combinada. */
CREATE OR REPLACE VIEW public.clientes_con_vinculos
WITH (security_invoker = true) AS
SELECT c.*,
       (SELECT COUNT(*) FROM public.vinculos_cliente v WHERE v.persona_id = c.id)  AS sociedades_vinculadas,
       (SELECT COUNT(*) FROM public.vinculos_cliente v WHERE v.sociedad_id = c.id) AS titulares_vinculados
  FROM public.clientes_estudio c;

-- -----------------------------------------------------------------------------
-- 9. RLS DE LAS TABLAS NUEVAS
-- -----------------------------------------------------------------------------
ALTER TABLE public.vinculos_cliente    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligaciones_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_pago         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas_plan         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vinculos_staff_all ON public.vinculos_cliente;
CREATE POLICY vinculos_staff_all ON public.vinculos_cliente
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS vinculos_cliente_select ON public.vinculos_cliente;
CREATE POLICY vinculos_cliente_select ON public.vinculos_cliente
  FOR SELECT TO authenticated
  USING (
    persona_id  IN (SELECT public.mis_clientes_ids())
    OR sociedad_id IN (SELECT public.mis_clientes_ids())
  );

DROP POLICY IF EXISTS oblig_cfg_staff_all ON public.obligaciones_config;
CREATE POLICY oblig_cfg_staff_all ON public.obligaciones_config
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS planes_staff_all ON public.planes_pago;
CREATE POLICY planes_staff_all ON public.planes_pago
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS planes_cliente_select ON public.planes_pago;
CREATE POLICY planes_cliente_select ON public.planes_pago
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT public.mis_clientes_ids()));

DROP POLICY IF EXISTS cuotas_staff_all ON public.cuotas_plan;
CREATE POLICY cuotas_staff_all ON public.cuotas_plan
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS cuotas_cliente_select ON public.cuotas_plan;
CREATE POLICY cuotas_cliente_select ON public.cuotas_plan
  FOR SELECT TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM public.planes_pago
       WHERE cliente_id IN (SELECT public.mis_clientes_ids())
    )
  );
