"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { importarComprobantes, type ImportState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatCUIT } from "@/lib/utils";

const ESTADO_INICIAL: ImportState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
      Importar
    </Button>
  );
}

export function ImportarCSV({
  clientes,
  clienteSeleccionado,
}: {
  clientes: { id: string; razon_social: string; cuit: string }[];
  clienteSeleccionado?: string;
}) {
  const [state, formAction] = useFormState(importarComprobantes, ESTADO_INICIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Importar Libro IVA (CSV)</CardTitle>
        <CardDescription>
          Acepta los CSV de Mis Comprobantes (Emitidos o Recibidos) y
          planillas propias. Reconoce separador coma o punto y coma, importes
          con coma o punto decimal, y fechas dd/mm/aaaa o aaaa-mm-dd. Se guardan solo los totales del período; reimportar los reemplaza.

        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cliente_id_imp">Cliente</Label>
            <Select id="cliente_id_imp" name="cliente_id" defaultValue={clienteSeleccionado} required>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razon_social} — {formatCUIT(c.cuit)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_operacion">Libro</Label>
            <Select id="tipo_operacion" name="tipo_operacion" defaultValue="VENTA">
              <option value="VENTA">Ventas</option>
              <option value="COMPRA">Compras</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="archivo">Archivo CSV</Label>
            <Input id="archivo" name="archivo" type="file" accept=".csv,text/csv" required />
          </div>

          {state?.error && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive md:col-span-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state?.error}
            </p>
          )}

          {state?.ok && (
            <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400 md:col-span-4">
              <CheckCircle2 className="h-4 w-4" />
              {state?.ok}
            </p>
          )}

          <div className="md:col-span-4">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
