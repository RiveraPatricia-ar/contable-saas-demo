"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { borrarObligacion } from "../../obligaciones/actions";

/** Botón de papelera con confirmación en línea para borrar un impuesto mal cargado. */
export function BorrarImpuesto({ id, nombre }: { id: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const borrar = (alcance: "mes" | "siempre") =>
    startTransition(async () => {
      setError(null);
      const r = await borrarObligacion(id, alcance);
      if (r?.error) setError(r.error);
      else setAbierto(false);
    });

  if (!abierto) {
    return (
      <button
        type="button"
        title={`Borrar ${nombre}`}
        aria-label={`Borrar ${nombre}`}
        onClick={() => setAbierto(true)}
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 rounded-md bg-red-500/5 p-2 text-xs">
      <span className="mr-auto text-muted-foreground">
        ¿Borrar <strong className="text-foreground">{nombre}</strong>?
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pendiente}
        onClick={() => borrar("mes")}
      >
        Solo este mes
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={pendiente}
        onClick={() => borrar("siempre")}
        className="bg-red-600 text-white hover:bg-red-700"
        title="Lo saca de la configuración del cliente: no se vuelve a generar"
      >
        {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        No lo paga: quitar siempre
      </Button>
      <button
        type="button"
        aria-label="Cancelar"
        onClick={() => setAbierto(false)}
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      {error ? <p className="w-full text-right text-red-600">{error}</p> : null}
    </div>
  );
}
