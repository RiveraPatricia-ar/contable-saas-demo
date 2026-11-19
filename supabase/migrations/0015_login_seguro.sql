-- =============================================================================
-- ContableSaaS AR — 0015
-- Login más seguro (auditoría 19/11/2026):
--   1. Registro de intentos fallidos para limitar la prueba de contraseñas.
--   2. La búsqueda "DNI/CUIT -> email" deja de estar disponible para
--      visitantes: ahora la hace solo el servidor con service_role.
--
-- ⚠️ ORDEN IMPORTANTE:
--   Antes de correr esta migración, el sistema tiene que estar publicado con
--   la versión nueva del login (la que usa SUPABASE_SERVICE_ROLE_KEY) y esa
--   variable tiene que estar cargada en Vercel. Si se corre antes, el login
--   por CUIT/DNI deja de funcionar hasta que se publique.
--
-- Cómo aplicarla: Supabase -> SQL Editor -> pegar este archivo -> Run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Intentos de login fallidos
--    clave = 'u:<usuario>' o 'ip:<ip>'. Solo la lee y escribe el servidor.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intentos_login (
  id      BIGSERIAL PRIMARY KEY,
  clave   TEXT NOT NULL,
  creado  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS intentos_login_clave_creado
  ON public.intentos_login (clave, creado DESC);

-- RLS activa y SIN políticas: anon y authenticated no ven ni escriben nada.
-- service_role ignora RLS, así que el servidor sí puede usarla.
ALTER TABLE public.intentos_login ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intentos_login FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.intentos_login_id_seq FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. email_por_username: solo para el servidor
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.email_por_username(TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.email_por_username(TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- CONTROL
--   Debe devolver false para anon (el visitante ya no puede usarla):
--   SELECT has_function_privilege('anon', 'public.email_por_username(text)', 'execute');
--   Intentos fallidos de las últimas 24 h, por usuario o IP:
--   SELECT clave, count(*) FROM public.intentos_login
--    WHERE creado > now() - interval '24 hours' GROUP BY clave ORDER BY 2 DESC;
-- =============================================================================
