"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generarCuotas, type PlanState } from "../actions";

const INICIAL: PlanState = {};

function Boton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />}
      Generar cuotas
    </Button>
  );
}

export function GenerarCuotas({ planId }: { planId: string }) {
  const [state, action] = useFormState(generarCuotas, INICIAL);
  const mesActual = new Date().toISOString().slice(0, 7);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="plan_id" value={planId} />
      <div className="space-y-1.5">
        <Label htmlFor="primer_mes">Mes de la 1ª cuota</Label>
        <Input id="primer_mes" name="primer_mes" defaultValue={mesActual} className="w-36" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="importe_cuota">Importe por cuota</Label>
        <Input id="importe_cuota" name="importe_cuota" type="number" step="0.01" min={0} className="w-36" />
      </div>
      <Boton />
      {state?.error ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {state?.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> {state?.mensaje}
        </p>
      ) : null}
    </form>
  );
}
