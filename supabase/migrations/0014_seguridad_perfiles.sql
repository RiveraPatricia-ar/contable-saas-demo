-- =============================================================================
-- ContableSaaS AR — 0014
-- Seguridad de perfiles: impide que un usuario se asigne otro rol.
--
-- Problema que corrige (auditoría 19/11/2026):
--   La política profiles_self_update permite que cada usuario modifique SU
--   fila de profiles, y el GRANT de la 0006 da UPDATE sobre todas las columnas.
--   Un CLIENTE con sesión podía cambiar su propio `rol` a 'ADMIN' y, a partir
--   de ahí, es_staff() lo dejaba ver todos los clientes y revelar las claves
--   fiscales con leer_clave_fiscal().
--   Además, handle_new_user() tomaba el rol de raw_user_meta_data, que lo
--   completa quien se registra; si el registro público estuviera habilitado,
--   cualquiera podía darse de alta como ADMIN.
--
-- Cómo aplicarla: Supabase -> SQL Editor -> pegar este archivo -> Run.
-- Es segura de correr más de una vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Campos del perfil que solo puede cambiar un ADMIN
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_campos_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Sin usuario de la app (SQL Editor o scripts con service_role): se permite.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.es_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id       IS DISTINCT FROM OLD.id
  OR NEW.rol      IS DISTINCT FROM OLD.rol
  OR NEW.activo   IS DISTINCT FROM OLD.activo
  OR NEW.username IS DISTINCT FROM OLD.username
  OR NEW.email    IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'No autorizado a modificar esos datos del perfil'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.proteger_campos_perfil() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_proteger_campos_perfil ON public.profiles;
CREATE TRIGGER trg_proteger_campos_perfil
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_perfil();

-- -----------------------------------------------------------------------------
-- 2. Alta de usuarios: el rol sale de app_metadata (solo lo escribe el
--    service_role), nunca de user_metadata (lo escribe quien se registra).
--    Los scripts crear-admin / crear-usuario igual fijan el rol después con
--    un upsert sobre profiles usando service_role, así que siguen funcionando.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_username TEXT;
BEGIN
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
    COALESCE((NEW.raw_app_meta_data ->> 'rol')::public.rol_usuario_enum, 'CLIENTE'),
    COALESCE((NEW.raw_user_meta_data ->> 'debe_cambiar_password')::BOOLEAN, TRUE)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

-- -----------------------------------------------------------------------------
-- 3. CONTROL (correr después de aplicar)
--    a) Debe aparecer el trigger:
--       SELECT tgname FROM pg_trigger WHERE tgname = 'trg_proteger_campos_perfil';
--    b) Nadie debería ser ADMIN o CONTADOR_STAFF sin que vos lo sepas:
--       SELECT username, nombre_completo, email, rol, updated_at
--         FROM public.profiles WHERE rol <> 'CLIENTE' ORDER BY updated_at DESC;
-- =============================================================================
