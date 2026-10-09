"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { guardarSaldoFavorAnterior, type SaldoState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const ESTADO_INICIAL: SaldoState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Guardar
    </Button>
  );
}

export function SaldoFavorAnterior({
  clienteId,
  periodo,
  valor,
  guardado,
}: {
  clienteId: string;
  periodo: string;
  valor: number;
  guardado: boolean;
}) {
  const [state, formAction] = useFormState(guardarSaldoFavorAnterior, ESTADO_INICIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saldo a favor del período anterior</CardTitle>
        <CardDescription>
          Saldo técnico de IVA a favor que arrastra el cliente. Se descuenta del
          saldo del período {periodo}.{" "}
          {guardado
            ? "Este importe fue cargado por el estudio."
            : "Se completó solo con el saldo a favor que dejó el período anterior. Podés corregirlo y guardarlo."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="cliente_id" value={clienteId} />
          <input type="hidden" name="periodo" value={periodo} />
          <div className="space-y-2 sm:w-64">
            <Label htmlFor="saldo_favor_anterior">Importe ($)</Label>
            <Input
              key={`${clienteId}-${periodo}-${valor}`}
              id="saldo_favor_anterior"
              name="saldo_favor_anterior"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={valor ? valor.toFixed(2).replace(".", ",") : ""}
              className="tabular-nums"
            />
          </div>
          <SubmitButton />
        </form>

        {state?.error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state?.error}
          </p>
        )}
        {state?.ok && (
          <p className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {state?.ok}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
