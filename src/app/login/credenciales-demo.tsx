import { KeyRound } from "lucide-react";
import { MODO_DEMO, CREDENCIALES_DEMO } from "@/lib/demo";

/**
 * Caja con el usuario y la contraseña de prueba. Solo aparece en el
 * despliegue público; en la instalación del estudio no se renderiza nada.
 */
export function CredencialesDemo() {
  if (!MODO_DEMO) return null;

  const { usuario, password, etiqueta } = CREDENCIALES_DEMO.admin;

  return (
    <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-4 w-4" />
        Acceso de prueba
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{etiqueta}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Usuario</dt>
        <dd className="font-mono tabular-nums">{usuario}</dd>
        <dt className="text-muted-foreground">Contraseña</dt>
        <dd className="font-mono">{password}</dd>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Los datos que vas a ver son inventados. Podés crear, editar y navegar
        con libertad; las bajas y los borrados están deshabilitados.
      </p>
    </div>
  );
}
