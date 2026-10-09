-- =============================================================================
-- ContableSaaS AR — Row Level Security
-- Regla general:
--   ADMIN / CONTADOR_STAFF  -> acceso total (via public.es_staff()).
--   CLIENTE                 -> solo las filas de los clientes_estudio ligados
--                              a su user_id (via public.mis_clientes_ids()).
-- Las funciones son SECURITY DEFINER, por lo que no vuelven a disparar RLS
-- y evitan la recursion infinita del borrador original.
-- =============================================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_estudio      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declaraciones_juradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_estudio        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honorarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulta_mensajes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_fiscal     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_credenciales ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- PROFILES
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.es_staff());

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- --------------------------------------------------------------------------
-- CLIENTES DEL ESTUDIO
-- Nota: las columnas cifradas nunca se leen directamente desde el cliente;
-- se accede a ellas solo por leer_clave_fiscal(). Ver vista publica abajo.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS clientes_staff_all ON public.clientes_estudio;
CREATE POLICY clientes_staff_all ON public.clientes_estudio
  FOR ALL TO authenticated
  USING (public.es_staff())
  WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS clientes_propio_select ON public.clientes_estudio;
CREATE POLICY clientes_propio_select ON public.clientes_estudio
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- DECLARACIONES JURADAS
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS ddjj_staff_all ON public.declaraciones_juradas;
CREATE POLICY ddjj_staff_all ON public.declaraciones_juradas
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS ddjj_cliente_select ON public.declaraciones_juradas;
CREATE POLICY ddjj_cliente_select ON public.declaraciones_juradas
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT public.mis_clientes_ids()));

-- --------------------------------------------------------------------------
-- COMPROBANTES — el cliente puede ver los suyos y cargar gastos
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS comp_staff_all ON public.comprobantes;
CREATE POLICY comp_staff_all ON public.comprobantes
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS comp_cliente_select ON public.comprobantes;
CREATE POLICY comp_cliente_select ON public.comprobantes
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT public.mis_clientes_ids()));

DROP POLICY IF EXISTS comp_cliente_insert ON public.comprobantes;
CREATE POLICY comp_cliente_insert ON public.comprobantes
  FOR INSERT TO authenticated
  WITH CHECK (
    cliente_id IN (SELECT public.mis_clientes_ids())
    AND origen = 'CLIENTE'
  );

-- --------------------------------------------------------------------------
-- DOCUMENTOS
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS docs_staff_all ON public.documentos;
CREATE POLICY docs_staff_all ON public.documentos
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS docs_cliente_select ON public.documentos;
CREATE POLICY docs_cliente_select ON public.documentos
  FOR SELECT TO authenticated
  USING (visible_cliente AND cliente_id IN (SELECT public.mis_clientes_ids()));

DROP POLICY IF EXISTS docs_cliente_insert ON public.documentos;
CREATE POLICY docs_cliente_insert ON public.documentos
  FOR INSERT TO authenticated
  WITH CHECK (cliente_id IN (SELECT public.mis_clientes_ids()));

-- --------------------------------------------------------------------------
-- TAREAS — solo interno
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS tareas_staff_all ON public.tareas_estudio;
CREATE POLICY tareas_staff_all ON public.tareas_estudio
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

-- --------------------------------------------------------------------------
-- HONORARIOS — el cliente ve los suyos ya emitidos
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS hon_staff_all ON public.honorarios;
CREATE POLICY hon_staff_all ON public.honorarios
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS hon_cliente_select ON public.honorarios;
CREATE POLICY hon_cliente_select ON public.honorarios
  FOR SELECT TO authenticated
  USING (
    estado <> 'BORRADOR'
    AND cliente_id IN (SELECT public.mis_clientes_ids())
  );

-- --------------------------------------------------------------------------
-- CONSULTAS Y MENSAJES
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS consultas_staff_all ON public.consultas;
CREATE POLICY consultas_staff_all ON public.consultas
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS consultas_cliente_select ON public.consultas;
CREATE POLICY consultas_cliente_select ON public.consultas
  FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT public.mis_clientes_ids()));

DROP POLICY IF EXISTS consultas_cliente_insert ON public.consultas;
CREATE POLICY consultas_cliente_insert ON public.consultas
  FOR INSERT TO authenticated
  WITH CHECK (cliente_id IN (SELECT public.mis_clientes_ids()));

DROP POLICY IF EXISTS msg_staff_all ON public.consulta_mensajes;
CREATE POLICY msg_staff_all ON public.consulta_mensajes
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

DROP POLICY IF EXISTS msg_cliente_select ON public.consulta_mensajes;
CREATE POLICY msg_cliente_select ON public.consulta_mensajes
  FOR SELECT TO authenticated
  USING (
    consulta_id IN (
      SELECT id FROM public.consultas
       WHERE cliente_id IN (SELECT public.mis_clientes_ids())
    )
  );

DROP POLICY IF EXISTS msg_cliente_insert ON public.consulta_mensajes;
CREATE POLICY msg_cliente_insert ON public.consulta_mensajes
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND consulta_id IN (
      SELECT id FROM public.consultas
       WHERE cliente_id IN (SELECT public.mis_clientes_ids())
    )
  );

-- --------------------------------------------------------------------------
-- CALENDARIO FISCAL — lectura para todo usuario autenticado
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS cal_select ON public.calendario_fiscal;
CREATE POLICY cal_select ON public.calendario_fiscal
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS cal_staff_write ON public.calendario_fiscal;
CREATE POLICY cal_staff_write ON public.calendario_fiscal
  FOR ALL TO authenticated
  USING (public.es_staff()) WITH CHECK (public.es_staff());

-- --------------------------------------------------------------------------
-- AUDITORIA — solo ADMIN lee; nadie escribe desde el cliente
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS auditoria_admin_select ON public.auditoria_credenciales;
CREATE POLICY auditoria_admin_select ON public.auditoria_credenciales
  FOR SELECT TO authenticated USING (public.es_admin());

-- --------------------------------------------------------------------------
-- BLINDAJE DE COLUMNAS CIFRADAS
--
-- Importante: en PostgreSQL un GRANT a nivel de TABLA alcanza a todas las
-- columnas, y un REVOKE por columna sobre esa misma tabla no tiene efecto.
-- Supabase otorga SELECT sobre toda la tabla a anon/authenticated, asi que
-- hay que revocar el SELECT de tabla y volver a otorgarlo columna por columna,
-- omitiendo las dos credenciales. El unico camino para leerlas queda siendo
-- leer_clave_fiscal(), que ademas deja registro en la auditoria.
-- --------------------------------------------------------------------------
DO $$
DECLARE cols TEXT;
BEGIN
  SELECT string_agg(format('%I', column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'clientes_estudio'
     AND column_name NOT IN ('clave_fiscal_afip_enc', 'clave_arba_agip_enc');

  EXECUTE 'REVOKE SELECT ON public.clientes_estudio FROM anon, authenticated';
  EXECUTE format(
    'GRANT SELECT (%s) ON public.clientes_estudio TO anon, authenticated', cols);
END $$;

-- Nota: si mas adelante se agregan columnas a clientes_estudio hay que volver
-- a correr este bloque, porque el GRANT por columna no las incluye solas.

-- =============================================================================
-- STORAGE
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Convencion de rutas: documentos/<cliente_id>/<categoria>/<archivo>
DROP POLICY IF EXISTS storage_staff_all ON storage.objects;
CREATE POLICY storage_staff_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documentos' AND public.es_staff())
  WITH CHECK (bucket_id = 'documentos' AND public.es_staff());

DROP POLICY IF EXISTS storage_cliente_select ON storage.objects;
CREATE POLICY storage_cliente_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.mis_clientes_ids())
  );

DROP POLICY IF EXISTS storage_cliente_insert ON storage.objects;
CREATE POLICY storage_cliente_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.mis_clientes_ids())
    AND (storage.foldername(name))[2] = 'gastos'
  );
