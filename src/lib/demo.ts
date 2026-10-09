/**
 * Modo demo.
 *
 * Se activa con NEXT_PUBLIC_MODO_DEMO=true en el entorno del despliegue
 * público. En la instalación real del estudio la variable no existe, así que
 * todo esto queda apagado y el sistema se comporta igual que siempre.
 *
 * Qué hace cuando está encendido:
 *   · muestra una franja permanente avisando que los datos son ficticios;
 *   · deja las credenciales de prueba a la vista en el login;
 *   · bloquea las operaciones destructivas, para que una visita no pueda
 *     dejar el demo vacío para la siguiente.
 */
export const MODO_DEMO =
  String(process.env.NEXT_PUBLIC_MODO_DEMO ?? "").toLowerCase() === "true";

/** Credenciales que se muestran en el login del demo. */
export const CREDENCIALES_DEMO = {
  admin: {
    usuario: process.env.NEXT_PUBLIC_DEMO_USUARIO ?? "20111111112",
    password: process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "DemoEstudio2026",
    etiqueta: "Contadora del estudio — acceso total",
  },
};

/**
 * Error que lanzan las acciones bloqueadas en el demo. Las Server Actions lo
 * devuelven como mensaje para que se vea en pantalla.
 */
export const MENSAJE_DEMO_BLOQUEADO =
  "Esto es una demostración con datos ficticios: las bajas y los borrados " +
  "están deshabilitados para que el próximo visitante encuentre el sistema " +
  "completo. Todo lo demás se puede probar con normalidad.";

/** Devuelve un error listo para retornar desde una Server Action. */
export function bloqueoDemo<T extends { error?: string }>(): T {
  return { error: MENSAJE_DEMO_BLOQUEADO } as T;
}
