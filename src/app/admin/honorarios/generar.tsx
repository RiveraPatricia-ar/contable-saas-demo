"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Receipt } from "lucide-react";
import { generarHonorariosDelPeriodo, type HonorarioState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: HonorarioState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
      Generar honorarios
    </Button>
  );
}

export function GenerarHonorarios() {
  const [state, formAction] = useFormState(
    generarHonorariosDelPeriodo,
    ESTADO_INICIAL
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generar honorarios del mes</CardTitle>
        <CardDescription>
          Crea una factura de honorarios por cada cliente activo con honorario
          mensual cargado. Los períodos ya generados no se duplican.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="periodo_fiscal">Período</Label>
            <Input
              id="periodo_fiscal"
              name="periodo_fiscal"
              placeholder="2026-09"
              defaultValue={new Date().toISOString().slice(0, 7)}
              className="w-40"
              required
            />
          </div>
          <SubmitButton />

          {state?.error && (
            <p role="alert" className="flex w-full items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state?.error}
            </p>
          )}

          {state?.ok && (
            <p className="flex w-full items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {state?.ok}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
