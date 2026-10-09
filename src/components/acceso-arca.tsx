"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { revelarClave } from "@/app/admin/clientes/actions";
import { Button } from "@/components/ui/button";
import { cn, soloDigitos } from "@/lib/utils";

/** Botón chico que copia un valor y confirma con un tilde. */
function Copiar({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      title={`Copiar ${etiqueta}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(valor);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1200);
        } catch {
          setCopiado(false);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors",
        copiado
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-input text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className="opacity-70">{etiqueta}</span>
      {copiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-50" />}
    </button>
  );
}

/**
 * Datos de acceso a ARCA del cliente, para entrar a la CCMA en su nombre.
 *
 * El CUIT se copia siempre; la clave fiscal se descifra recién cuando se
 * aprieta "Revelar", y cada lectura queda registrada en la tabla de auditoría
 * con el usuario y la fecha.
 */
export function AccesoArca({
  clienteId,
  cuit,
}: {
  clienteId: string;
  cuit: string;
}) {
  const [clave, setClave] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const cuitLimpio = soloDigitos(cuit);

  function alternar() {
    if (clave) {
      setClave(null);
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await revelarClave(clienteId, "afip");
      if (res.error) setError(res.error);
      else setClave(res.valor ?? "");
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        <Copiar etiqueta="CUIT" valor={cuitLimpio} />

        {clave ? (
          <>
            <Copiar etiqueta="clave" valor={clave} />
            <span className="rounded-md border border-input px-1.5 py-0.5 font-mono text-xs">
              {clave}
            </span>
          </>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs"
          onClick={alternar}
          disabled={pendiente}
          title={
            clave
              ? "Ocultar la clave"
              : "Revelar la clave fiscal (queda registrado en la auditoría)"
          }
        >
          {pendiente ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : clave ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <KeyRound className="h-3 w-3" />
          )}
          {clave ? "Ocultar" : "Clave"}
        </Button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
