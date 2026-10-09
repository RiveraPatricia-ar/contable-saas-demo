import { AlertTriangle, Check, Clock, Wallet } from "lucide-react";
import { cn, formatARS, formatFecha } from "@/lib/utils";
import { TEXTO_ESTADO, type Celda } from "@/lib/tablero";

const ESTILO = {
  PRESENTADA:
    "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  PENDIENTE:
    "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/30",
  VENCIDA: "bg-destructive/10 text-destructive border-destructive/30",
} as const;

const ICONO = { PRESENTADA: Check, PENDIENTE: Clock, VENCIDA: AlertTriangle };

/**
 * Casillero de la grilla. El color dice si se presentó; el ícono de billetera
 * chiquito, si además está pagado. Al pasar el mouse muestra el detalle.
 */
export function CeldaEstado({ c }: { c?: Celda }) {
  if (!c) {
    return (
      <span className="block text-center text-xs text-muted-foreground/50">—</span>
    );
  }

  const Icono = ICONO[c.estado];
  const detalle = [
    TEXTO_ESTADO[c.estado],
    `vence ${formatFecha(c.vencimiento)}`,
    c.importe > 0 ? formatARS(c.importe) : null,
    c.pagada ? "pagada" : "impaga",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      title={detalle}
      className={cn(
        "mx-auto flex h-7 w-full max-w-[5.5rem] items-center justify-center gap-1 rounded-md border text-xs font-medium",
        ESTILO[c.estado]
      )}
    >
      <Icono className="h-3.5 w-3.5" />
      {c.pagada ? <Wallet className="h-3 w-3 opacity-70" /> : null}
    </span>
  );
}

export function Referencias() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {(["PRESENTADA", "PENDIENTE", "VENCIDA"] as const).map((e) => {
        const Icono = ICONO[e];
        return (
          <span key={e} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-5 w-7 items-center justify-center rounded border",
                ESTILO[e]
              )}
            >
              <Icono className="h-3 w-3" />
            </span>
            {TEXTO_ESTADO[e]}
          </span>
        );
      })}
      <span className="inline-flex items-center gap-1.5">
        <Wallet className="h-3.5 w-3.5" /> además pagada
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-7 text-center">—</span> no corresponde
      </span>
    </div>
  );
}
