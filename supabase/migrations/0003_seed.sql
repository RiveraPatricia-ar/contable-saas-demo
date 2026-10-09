-- =============================================================================
-- Seed inicial
--
-- El usuario administrador NO se crea acá. Se da de alta con la Admin API de
-- Supabase, que es la vía soportada, y con una contraseña elegida en el
-- momento:
--
--     node scripts/crear-admin.mjs <CUIT o DNI> "<nombre>" <contraseña>
--
-- Una migración que deje un administrador con contraseña fija y conocida es
-- una puerta abierta, sobre todo en una instalación accesible desde internet.
-- =============================================================================

-- CALENDARIO FISCAL — plantilla por terminacion de CUIT
--
-- IMPORTANTE: las fechas de abajo son una PLANTILLA de ejemplo para que el
-- modulo funcione de entrada. Antes de usarlas en produccion hay que
-- reemplazarlas por el cronograma oficial vigente publicado por ARCA/AFIP y
-- por cada jurisdiccion (ARBA, AGIP, Comision Arbitral), que se actualiza
-- todos los anios mediante resolucion general.
-- -----------------------------------------------------------------------------
INSERT INTO public.calendario_fiscal
  (organismo, impuesto_tipo, periodo_fiscal, terminacion_cuit, fecha_vencimiento, descripcion)
SELECT
  'AFIP',
  'IVA',
  '2026-08',
  t,
  DATE '2026-09-18' + (t / 2)::int,
  'DDJJ IVA — vencimiento segun terminacion de CUIT (PLANTILLA: verificar contra el calendario oficial)'
FROM generate_series(0, 9) AS t
ON CONFLICT (organismo, impuesto_tipo, periodo_fiscal, terminacion_cuit) DO NOTHING;

INSERT INTO public.calendario_fiscal
  (organismo, impuesto_tipo, periodo_fiscal, terminacion_cuit, fecha_vencimiento, descripcion)
VALUES
  ('AFIP', 'MONOTRIBUTO',   '2026-09', NULL, DATE '2026-09-20', 'Pago mensual de Monotributo (PLANTILLA)'),
  ('AFIP', 'F931_SUELDOS',  '2026-08', NULL, DATE '2026-09-11', 'F.931 cargas sociales (PLANTILLA)'),
  ('COMARB', 'SIFERE',      '2026-08', NULL, DATE '2026-09-16', 'Convenio Multilateral CM03 (PLANTILLA)')
ON CONFLICT (organismo, impuesto_tipo, periodo_fiscal, terminacion_cuit) DO NOTHING;
