"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { subirGasto, type PortalState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: PortalState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      Enviar al estudio
    </Button>
  );
}

export function SubirGastoForm({ clienteId }: { clienteId: string }) {
  const [state, formAction] = useFormState(subirGasto, ESTADO_INICIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subir comprobantes y gastos</CardTitle>
        <CardDescription>
          Facturas de compra, tickets o extractos bancarios en PDF o imagen,
          hasta 10 MB por archivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="cliente_id" value={clienteId} />

          <div className="space-y-2">
            <Label htmlFor="titulo">Descripción</Label>
            <Input
              id="titulo"
              name="titulo"
              placeholder="Factura proveedor — agosto"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="archivo">Archivo *</Label>
            <Input
              id="archivo"
              name="archivo"
              type="file"
              accept="application/pdf,image/*"
              required
            />
          </div>

          {state?.error && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state?.error}
            </p>
          )}

          {state?.ok && (
            <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400 sm:col-span-2">
              <CheckCircle2 className="h-4 w-4" />
              {state?.ok}
            </p>
          )}

          <div className="sm:col-span-2">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
