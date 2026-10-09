import { FlaskConical } from "lucide-react";
import { MODO_DEMO } from "@/lib/demo";

/**
 * Franja fija que avisa que el sistema está corriendo con datos inventados.
 * No se renderiza nada cuando el modo demo está apagado.
 */
export function BandaDemo() {
  if (!MODO_DEMO) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-medium text-amber-950">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span>
        Demostración con datos ficticios. Ningún nombre, CUIT ni importe
        corresponde a un contribuyente real.
      </span>
    </div>
  );
}
