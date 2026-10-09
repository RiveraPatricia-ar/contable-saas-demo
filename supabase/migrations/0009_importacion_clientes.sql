-- =============================================================================
-- ContableSaaS AR — 0009
-- Ajustes para la importación masiva de clientes desde la planilla.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. MONOTRIBUTISTAS SIN CATEGORIA
--    La planilla del estudio no trae la categoría. El CHECK anterior impedía
--    dar de alta un monotributista sin ella. Se elimina: el alta queda
--    permitida y la falta se ve en la pantalla de recategorización y en el
--    formulario del cliente, que sigue pidiéndola al editar.
-- -----------------------------------------------------------------------------
ALTER TABLE public.clientes_estudio
  DROP CONSTRAINT IF EXISTS monotributo_con_categoria;

-- -----------------------------------------------------------------------------
-- 2. CARGA DE CLAVES FISCALES DESDE UN SCRIPT
--    guardar_clave_fiscal() exigía un usuario del estudio con sesión. Un
--    script de importación entra con la clave de servicio, que no tiene
--    sesión de usuario. Se lo admite también, con su propia marca en la
--    auditoría. La clave sigue guardándose cifrada con la clave maestra de
--    Vault: el script nunca la escribe en texto plano en la tabla.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guardar_clave_fiscal(
  p_cliente_id UUID,
  p_campo TEXT,
  p_valor TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_key TEXT;
  v_es_servicio BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
BEGIN
  IF NOT (public.es_staff() OR v_es_servicio) THEN
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

  -- actor_id queda NULL cuando lo carga el script; el campo aclara el origen.
  INSERT INTO public.auditoria_credenciales (cliente_id, actor_id, accion, campo)
  VALUES (
    p_cliente_id,
    auth.uid(),
    'ESCRITURA',
    CASE WHEN v_es_servicio THEN p_campo || ' (importacion)' ELSE p_campo END
  );
END $$;

REVOKE ALL ON FUNCTION public.guardar_clave_fiscal(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_clave_fiscal(UUID, TEXT, TEXT) TO authenticated, service_role;
