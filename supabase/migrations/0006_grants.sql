-- =============================================================================
-- ContableSaaS AR — 0006
-- Privilegios de tabla para el rol `authenticated`.
--
-- Sintoma que corrige: "permission denied for table clientes_estudio" (42501).
--
-- RLS y GRANT son dos capas distintas y ambas tienen que dar el OK. Las
-- politicas de la migracion 0002 dicen QUE FILAS puede ver cada usuario, pero
-- si el rol no tiene el GRANT sobre la tabla, PostgreSQL corta antes de
-- evaluarlas. Un rechazo por RLS devuelve cero filas; uno por GRANT devuelve
-- este error.
--
-- Se otorga solo a `authenticated`: el visitante anonimo no lee ninguna tabla,
-- entra por la landing y por email_por_username(), que ya tiene su permiso.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLAS DE LA APLICACION
-- -----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'clientes_estudio',
    'declaraciones_juradas',
    'comprobantes',
    'documentos',
    'tareas_estudio',
    'honorarios',
    'consultas',
    'consulta_mensajes',
    'calendario_fiscal',
    'auditoria_credenciales',
    'vinculos_cliente',
    'obligaciones_config',
    'planes_pago',
    'cuotas_plan'
  ] LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t
    );
  END LOOP;
END $$;

-- auditoria_credenciales lleva un BIGSERIAL: sin la secuencia, el INSERT falla.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. VISTAS
--    Son security_invoker, asi que siguen respetando la RLS de las tablas de
--    origen: el GRANT solo habilita a consultarlas.
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.planes_resumen             TO authenticated;
GRANT SELECT ON public.clientes_con_vinculos      TO authenticated;
GRANT SELECT ON public.ingresos_ultimos_12m       TO authenticated;
GRANT SELECT ON public.recategorizacion_pendiente TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. LO QUE SE CREE DE ACA EN ADELANTE
--    Evita repetir este problema con cada tabla nueva.
-- -----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. CONTROL
--    Deberia devolver una fila por tabla. Si alguna falta, no se aplico.
-- -----------------------------------------------------------------------------
-- SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type)
--   FROM information_schema.role_table_grants
--  WHERE grantee = 'authenticated' AND table_schema = 'public'
--  GROUP BY table_name
--  ORDER BY table_name;
