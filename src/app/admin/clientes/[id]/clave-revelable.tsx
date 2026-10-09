"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { revelarClave } from "../actions";
import { Button } from "@/components/ui/button";

export function ClaveRevelable({
  clienteId,
  campo,
  label,
}: {
  clienteId: string;
  campo: "afip" | "arba_agip";
  label: string;
}) {
  const [valor, setValor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function alternar() {
    if (valor) {
      setValor(null);
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await revelarClave(clienteId, campo);
      if (res.error) setError(res.error);
      else setValor(res.valor ?? "");
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 font-mono text-sm text-muted-foreground">
        {valor ?? "••••••••••"}
      </p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2"
        onClick={alternar}
        disabled={pendiente}
      >
        {pendiente ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : valor ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        {valor ? "Ocultar" : "Revelar"}
      </Button>
    </div>
  );
}
