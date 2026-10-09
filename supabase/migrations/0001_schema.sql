-- =============================================================================
-- ContableSaaS AR — Esquema base
-- Ejecutar en el SQL Editor de Supabase (o via `supabase db push`).
--
-- Correcciones respecto del borrador original:
--   * `ALTEXT` no existe en PostgreSQL -> se reemplaza por TEXT cifrado.
--   * Las policies que consultaban `public.profiles` desde una policy de
--     `public.profiles` producian recursion infinita (error 42P17). Se usan
--     funciones SECURITY DEFINER que saltan RLS.
--   * `uuid-ossp` se reemplaza por `gen_random_uuid()` (pgcrypto/core, ya
--     disponible en Supabase) aunque se deja la extension por compatibilidad.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONES
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 2. TIPOS ENUMERADOS (REGIMEN ARGENTINO)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.condicion_iva_enum AS ENUM (
    'MONOTRIBUTO',
    'RESPONSABLE_INSCRIPTO',
    'EXENTO',
    'CONSUMIDOR_FINAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.condicion_iibb_enum AS ENUM (
    'LOCAL_ARBA',
    'LOCAL_AGIP',
    'CONVENIO_MULTILATERAL',
    'EXENTO',
    'NO_INSCRIPTO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_tramite_enum AS ENUM (
    'PENDIENTE',
    'EN_PROCESO',
    'ESPERANDO_VEP',
    'PRESENTADO',
    'PAGADO',
    'FINALIZADO',
    'VENCIDO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rol_usuario_enum AS ENUM (
    'ADMIN',
    'CONTADOR_STAFF',
    'CLIENTE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prioridad_enum AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_persona_enum AS ENUM ('FISICA', 'JURIDICA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_factura_enum AS ENUM (
    'BORRADOR', 'EMITIDA', 'COBRADA', 'VENCIDA', 'ANULADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 3. PERFILES (1:1 con auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            VARCHAR(20) UNIQUE NOT NULL,          -- DNI o CUIT, solo digitos
  nombre_completo     VARCHAR(255) NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  telefono            VARCHAR(50),
  rol                 public.rol_usuario_enum NOT NULL DEFAULT 'CLIENTE',
  debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT username_solo_digitos CHECK (username ~ '^[0-9]{7,11}$')
);

-- -----------------------------------------------------------------------------
-- 4. HELPERS DE AUTORIZACION (SECURITY DEFINER -> no disparan RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS public.rol_usuario_enum
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT rol FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rol IN ('ADMIN', 'CONTADOR_STAFF') FROM public.profiles WHERE id = auth.uid()),
    FALSE
  )
$$;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rol = 'ADMIN' FROM public.profiles WHERE id = auth.uid()),
    FALSE
  )
$$;

-- (mis_clientes_ids() se define en la seccion 5, una vez creada la tabla.)

-- -----------------------------------------------------------------------------
-- 5. CLIENTES DEL ESTUDIO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes_estudio (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  contador_asignado         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cuit                      VARCHAR(11) UNIQUE NOT NULL,
  tipo_persona              public.tipo_persona_enum NOT NULL DEFAULT 'FISICA',
  razon_social              VARCHAR(255) NOT NULL,
  nombre_fantasia           VARCHAR(255),
  email_contacto            VARCHAR(255),
  telefono_contacto         VARCHAR(50),
  domicilio_fiscal          TEXT,
  provincia                 VARCHAR(60),
  condicion_iva             public.condicion_iva_enum NOT NULL,
  condicion_iibb            public.condicion_iibb_enum NOT NULL DEFAULT 'NO_INSCRIPTO',
  categoria_monotributo     VARCHAR(2),
  numero_iibb               VARCHAR(30),
  actividad_principal       VARCHAR(255),
  -- Credenciales sensibles: SIEMPRE cifradas con pgp_sym_encrypt (ver seccion 11).
  clave_fiscal_afip_enc     BYTEA,
  clave_arba_agip_enc       BYTEA,
  tiene_empleados           BOOLEAN NOT NULL DEFAULT FALSE,
  cantidad_empleados        INT NOT NULL DEFAULT 0,
  fecha_inicio_actividades  DATE,
  honorario_mensual_ars     NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  estado_activo             BOOLEAN NOT NULL DEFAULT TRUE,
  notas_internas            TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cuit_11_digitos CHECK (cuit ~ '^[0-9]{11}$'),
  CONSTRAINT categoria_valida CHECK (
    categoria_monotributo IS NULL OR categoria_monotributo ~ '^[A-K]$'
  ),
  CONSTRAINT monotributo_con_categoria CHECK (
    condicion_iva <> 'MONOTRIBUTO' OR categoria_monotributo IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_clientes_user       ON public.clientes_estudio(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_contador   ON public.clientes_estudio(contador_asignado);
CREATE INDEX IF NOT EXISTS idx_clientes_activo     ON public.clientes_estudio(estado_activo);
CREATE INDEX IF NOT EXISTS idx_clientes_cuit_term  ON public.clientes_estudio((RIGHT(cuit, 1)));

/** Ids de clientes del estudio que pertenecen al usuario autenticado. */
CREATE OR REPLACE FUNCTION public.mis_clientes_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.clientes_estudio WHERE user_id = auth.uid() $$;

-- -----------------------------------------------------------------------------
-- 6. DECLARACIONES JURADAS / VENCIMIENTOS / VEPs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.declaraciones_juradas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id          UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  impuesto_tipo       VARCHAR(50) NOT NULL,   -- IVA, IIBB_LOCAL, SIFERE, F931_SUELDOS, SICORE, GANANCIAS, BIENES_PERSONALES, MONOTRIBUTO
  organismo           VARCHAR(20) NOT NULL DEFAULT 'AFIP',  -- AFIP | ARBA | AGIP | COMARB
  periodo_fiscal      VARCHAR(7) NOT NULL,    -- YYYY-MM
  fecha_vencimiento   DATE NOT NULL,
  monto_impuesto_ars  NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  monto_vep_ars       NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  codigo_vep          VARCHAR(100),
  path_pdf_vep        TEXT,     -- ruta dentro del bucket `documentos`
  path_pdf_acuse      TEXT,
  estado              public.estado_tramite_enum NOT NULL DEFAULT 'PENDIENTE',
  fecha_presentacion  DATE,
  fecha_pago          DATE,
  notas               TEXT,
  creado_por          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT periodo_formato CHECK (periodo_fiscal ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT ddjj_unica UNIQUE (cliente_id, impuesto_tipo, periodo_fiscal)
);

CREATE INDEX IF NOT EXISTS idx_ddjj_cliente ON public.declaraciones_juradas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ddjj_venc    ON public.declaraciones_juradas(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_ddjj_estado  ON public.declaraciones_juradas(estado);

-- -----------------------------------------------------------------------------
-- 7. COMPROBANTES (LIBRO IVA DIGITAL COMPRAS / VENTAS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comprobantes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id                UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  tipo_operacion            VARCHAR(10) NOT NULL CHECK (tipo_operacion IN ('VENTA', 'COMPRA')),
  tipo_comprobante          VARCHAR(10) NOT NULL,  -- FA_A, FA_B, FA_C, NC_A, ND_A, TICKET...
  punto_de_venta            INT NOT NULL DEFAULT 1,
  numero_comprobante        BIGINT NOT NULL,
  fecha_emision             DATE NOT NULL,
  -- to_char() es STABLE, no IMMUTABLE, y por eso no sirve en una columna
  -- generada. EXTRACT sobre date si es IMMUTABLE.
  periodo_fiscal            VARCHAR(7) GENERATED ALWAYS AS (
                              EXTRACT(YEAR FROM fecha_emision)::TEXT || '-' ||
                              lpad(EXTRACT(MONTH FROM fecha_emision)::TEXT, 2, '0')
                            ) STORED,
  cuit_contraparte          VARCHAR(11),
  razon_social_contraparte  VARCHAR(255),
  neto_gravado              NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  neto_no_gravado           NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  exento                    NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  iva_21                    NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  iva_10_5                  NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  iva_27                    NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  percepcion_iibb           NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  percepcion_iva            NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  retencion_ganancias       NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total                     NUMERIC(14, 2) NOT NULL,
  path_archivo              TEXT,
  origen                    VARCHAR(20) NOT NULL DEFAULT 'MANUAL', -- MANUAL | IMPORTADO | CLIENTE
  cargado_por               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comprobante_unico UNIQUE (cliente_id, tipo_operacion, tipo_comprobante, punto_de_venta, numero_comprobante)
);

CREATE INDEX IF NOT EXISTS idx_comp_cliente_periodo ON public.comprobantes(cliente_id, periodo_fiscal);
CREATE INDEX IF NOT EXISTS idx_comp_tipo_op         ON public.comprobantes(tipo_operacion);

-- -----------------------------------------------------------------------------
-- 8. DOCUMENTOS DEL CLIENTE (constancias, balances, F.931, acuses)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  titulo        VARCHAR(255) NOT NULL,
  categoria     VARCHAR(50) NOT NULL DEFAULT 'OTROS', -- CONSTANCIA, F931, ACUSE, BALANCE, HABILITACION, VEP, GASTO, OTROS
  periodo_fiscal VARCHAR(7),
  path_archivo  TEXT NOT NULL,           -- ruta dentro del bucket `documentos`
  mime_type     VARCHAR(100),
  tamano_bytes  BIGINT,
  visible_cliente BOOLEAN NOT NULL DEFAULT TRUE,
  subido_por    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_cliente ON public.documentos(cliente_id);

-- -----------------------------------------------------------------------------
-- 9. TAREAS INTERNAS DEL ESTUDIO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tareas_estudio (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  asignado_a    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  titulo        VARCHAR(255) NOT NULL,
  descripcion   TEXT,
  prioridad     public.prioridad_enum NOT NULL DEFAULT 'MEDIA',
  estado        public.estado_tramite_enum NOT NULL DEFAULT 'PENDIENTE',
  fecha_limite  DATE,
  completada_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tareas_asignado ON public.tareas_estudio(asignado_a, estado);

-- -----------------------------------------------------------------------------
-- 10. HONORARIOS DEL ESTUDIO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.honorarios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id          UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  periodo_fiscal      VARCHAR(7) NOT NULL,
  concepto            VARCHAR(255) NOT NULL DEFAULT 'Honorarios profesionales',
  monto_ars           NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  estado              public.estado_factura_enum NOT NULL DEFAULT 'BORRADOR',
  fecha_emision       DATE,
  fecha_vencimiento   DATE,
  fecha_cobro         DATE,
  punto_venta         INT,
  numero_factura      BIGINT,
  path_pdf_factura    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT honorario_unico UNIQUE (cliente_id, periodo_fiscal, concepto)
);

CREATE INDEX IF NOT EXISTS idx_honorarios_estado ON public.honorarios(estado);

-- -----------------------------------------------------------------------------
-- 11. CANAL DE CONSULTAS (tickets + mensajes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  asunto      VARCHAR(255) NOT NULL,
  estado      VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'RESPONDIDA', 'CERRADA')),
  abierta_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consulta_mensajes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id UUID NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  autor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cuerpo      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_consulta ON public.consulta_mensajes(consulta_id, created_at);

-- -----------------------------------------------------------------------------
-- 12. CALENDARIO FISCAL (vencimientos generales por terminacion de CUIT)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendario_fiscal (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organismo          VARCHAR(20) NOT NULL,           -- AFIP | ARBA | AGIP | COMARB
  impuesto_tipo      VARCHAR(50) NOT NULL,
  periodo_fiscal     VARCHAR(7) NOT NULL,
  terminacion_cuit   SMALLINT,                       -- NULL = aplica a todas
  fecha_vencimiento  DATE NOT NULL,
  descripcion        TEXT,
  CONSTRAINT terminacion_valida CHECK (terminacion_cuit IS NULL OR terminacion_cuit BETWEEN 0 AND 9),
  CONSTRAINT venc_unico UNIQUE (organismo, impuesto_tipo, periodo_fiscal, terminacion_cuit)
);

CREATE INDEX IF NOT EXISTS idx_cal_fecha ON public.calendario_fiscal(fecha_vencimiento);

-- -----------------------------------------------------------------------------
-- 13. AUDITORIA DE ACCESO A CREDENCIALES FISCALES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria_credenciales (
  id          BIGSERIAL PRIMARY KEY,
  cliente_id  UUID NOT NULL REFERENCES public.clientes_estudio(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accion      VARCHAR(20) NOT NULL,   -- LECTURA | ESCRITURA
  campo       VARCHAR(40) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 14. TRIGGERS: updated_at + alta automatica de perfil
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'clientes_estudio', 'declaraciones_juradas',
    'tareas_estudio', 'consultas'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

/** Crea el profile automaticamente al dar de alta un usuario en auth.users. */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- El username debe ser numerico (DNI/CUIT). Se toma del metadata, si no de
  -- los digitos del email, y si tampoco alcanza se genera uno derivado del id
  -- para que el alta no falle contra el CHECK.
  v_username := COALESCE(
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'username', ''), '\D', '', 'g'), ''),
    NULLIF(regexp_replace(split_part(COALESCE(NEW.email, ''), '@', 1), '\D', '', 'g'), '')
  );

  IF v_username IS NULL OR length(v_username) < 7 OR length(v_username) > 11 THEN
    v_username := lpad((abs(hashtext(NEW.id::text)) % 100000000)::TEXT, 8, '0');
  END IF;

  INSERT INTO public.profiles (id, username, nombre_completo, email, telefono, rol, debe_cambiar_password)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre_completo', 'Sin nombre'),
    NEW.email,
    NEW.raw_user_meta_data ->> 'telefono',
    COALESCE((NEW.raw_user_meta_data ->> 'rol')::public.rol_usuario_enum, 'CLIENTE'),
    COALESCE((NEW.raw_user_meta_data ->> 'debe_cambiar_password')::BOOLEAN, TRUE)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 15. CIFRADO DE CLAVES FISCALES
--
-- La clave maestra vive en Supabase Vault, NUNCA en una tabla de la app ni en
-- el frontend. Definirla una sola vez (reemplazar el valor):
--
--   SELECT vault.create_secret(
--     'UNA_FRASE_LARGA_Y_ALEATORIA',
--     'clave_maestra_contable',
--     'Clave maestra de cifrado de credenciales fiscales'
--   );
--
-- Nota historica: la version anterior usaba
-- `ALTER DATABASE postgres SET app.clave_maestra = ...`, pero en los proyectos
-- actuales de Supabase el rol `postgres` no es superusuario y esa sentencia
-- falla con "42501: permission denied to set parameter". Vault es la via
-- soportada. Igual se mantiene `app.clave_maestra` como respaldo por si la
-- base corre fuera de Supabase, donde esa opcion si esta disponible.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

/**
 * Devuelve la clave maestra. Primero busca el secreto en Vault y, si no
 * existe, cae al parametro de configuracion de la base.
 */
CREATE OR REPLACE FUNCTION public.clave_maestra()
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_key TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_key
      FROM vault.decrypted_secrets
     WHERE name = 'clave_maestra_contable'
     LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;   -- Vault no disponible en esta instalacion
  END;

  IF v_key IS NULL OR v_key = '' THEN
    v_key := current_setting('app.clave_maestra', TRUE);
  END IF;

  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION
      'Falta la clave maestra. Crear el secreto con: SELECT vault.create_secret(''<frase>'', ''clave_maestra_contable'');';
  END IF;

  RETURN v_key;
END $$;

REVOKE ALL ON FUNCTION public.clave_maestra() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guardar_clave_fiscal(
  p_cliente_id UUID,
  p_campo TEXT,          -- 'afip' | 'arba_agip'
  p_valor TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_key TEXT;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  v_key := public.clave_maestra();

  IF p_campo = 'afip' THEN
    UPDATE public.clientes_estudio
       SET clave_fiscal_afip_enc = CASE WHEN p_valor IS NULL OR p_valor = '' THEN NULL
                                        ELSE extensions.pgp_sym_encrypt(p_valor, v_key) END
     WHERE id = p_cliente_id;
  ELSIF p_campo = 'arba_agip' THEN
    UPDATE public.clientes_estudio
       SET clave_arba_agip_enc = CASE WHEN p_valor IS NULL OR p_valor = '' THEN NULL
                                      ELSE extensions.pgp_sym_encrypt(p_valor, v_key) END
     WHERE id = p_cliente_id;
  ELSE
    RAISE EXCEPTION 'Campo invalido: %', p_campo;
  END IF;

  INSERT INTO public.auditoria_credenciales (cliente_id, actor_id, accion, campo)
  VALUES (p_cliente_id, auth.uid(), 'ESCRITURA', p_campo);
END $$;

CREATE OR REPLACE FUNCTION public.leer_clave_fiscal(
  p_cliente_id UUID,
  p_campo TEXT
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_key TEXT;
  v_enc BYTEA;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  v_key := public.clave_maestra();

  SELECT CASE WHEN p_campo = 'afip' THEN clave_fiscal_afip_enc ELSE clave_arba_agip_enc END
    INTO v_enc FROM public.clientes_estudio WHERE id = p_cliente_id;

  IF v_enc IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.auditoria_credenciales (cliente_id, actor_id, accion, campo)
  VALUES (p_cliente_id, auth.uid(), 'LECTURA', p_campo);

  RETURN extensions.pgp_sym_decrypt(v_enc, v_key);
END $$;

REVOKE ALL ON FUNCTION public.guardar_clave_fiscal(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leer_clave_fiscal(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_clave_fiscal(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leer_clave_fiscal(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 16. MARCAR VENCIDAS (llamar desde un cron de Supabase o pg_cron)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.marcar_ddjj_vencidas()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  UPDATE public.declaraciones_juradas
     SET estado = 'VENCIDO'
   WHERE fecha_vencimiento < CURRENT_DATE
     AND estado IN ('PENDIENTE', 'EN_PROCESO', 'ESPERANDO_VEP');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- -----------------------------------------------------------------------------
-- 17. LOGIN POR CUIT / DNI
-- Traduce un username (solo digitos) al email con el que se autentica el
-- usuario. Devuelve unicamente el email: no expone el resto del perfil.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.email_por_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT email FROM public.profiles
   WHERE username = regexp_replace(p_username, '\D', '', 'g')
     AND activo
   LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.email_por_username(TEXT) TO anon, authenticated;
