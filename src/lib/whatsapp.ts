/**
 * Apertura de chats de WhatsApp sin pasar por la página intermedia.
 *
 * El link clásico (wa.me o api.whatsapp.com/send) muestra siempre una
 * pantalla de «Abrir aplicación / Continuar en WhatsApp Web». Con muchos
 * envíos seguidos eso es un clic de más por cada uno. Acá se va directo:
 *
 *   · web → web.whatsapp.com/send, reusando SIEMPRE la misma pestaña, así no
 *           se acumula una pestaña nueva por cada cliente.
 *   · app → whatsapp://send, que abre la aplicación de escritorio. Chrome
 *           pregunta «¿Abrir WhatsApp?» la primera vez; tildando «Siempre
 *           permitir» no vuelve a preguntar.
 *
 * La elección se recuerda en este navegador.
 */

export type DestinoWhatsApp = "web" | "app";

const CLAVE = "contable.destinoWhatsApp";
const PESTANA = "whatsapp-estudio";

export function leerDestino(): DestinoWhatsApp {
  try {
    const v = window.localStorage.getItem(CLAVE);
    return v === "app" ? "app" : "web";
  } catch {
    return "web";
  }
}

export function guardarDestino(destino: DestinoWhatsApp) {
  try {
    window.localStorage.setItem(CLAVE, destino);
  } catch {
    // Navegación privada o almacenamiento bloqueado: se usa el valor por
    // defecto en cada clic, no es grave.
  }
}

/** Número en formato internacional, sin signos. Asume Argentina si no trae código. */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  if (digitos.length < 8) return null;
  return digitos.startsWith("54") ? digitos : `54${digitos}`;
}

export function urlWhatsApp(
  numero: string,
  mensaje: string,
  destino: DestinoWhatsApp
): string {
  const texto = encodeURIComponent(mensaje);
  return destino === "app"
    ? `whatsapp://send?phone=${numero}&text=${texto}`
    : `https://web.whatsapp.com/send?phone=${numero}&text=${texto}`;
}

/**
 * Abre el chat con el mensaje escrito. Se llama directo desde el clic: si se
 * espera algo antes, Chrome lo toma como ventana emergente y la bloquea.
 */
export function abrirWhatsApp(numero: string, mensaje: string) {
  const destino = leerDestino();
  const url = urlWhatsApp(numero, mensaje, destino);

  if (destino === "app") {
    // Un link de protocolo no abre pestaña: se lo pasa al sistema operativo.
    window.location.href = url;
  } else {
    // Pestaña con nombre fijo: el segundo envío reemplaza al primero en la
    // misma pestaña en lugar de abrir otra.
    window.open(url, PESTANA);
  }
}
