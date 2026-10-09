"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react";
import { crearDDJJ, type DDJJState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IMPUESTOS, ETIQUETAS_ESTADO } from "@/lib/constants";
import { formatCUIT } from "@/lib/utils";

const ESTADO_INICIAL: DDJJState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Cargar DDJJ
    </Button>
  );
}

export function NuevaDDJJ({
  clientes,
}: {
  clientes: { id: string; razon_social: string; cuit: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(crearDDJJ, ESTADO_INICIAL);

  const periodoActual = new Date().toISOString().slice(0, 7);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Cargar liquidación</CardTitle>
          <CardDescription>
            IVA, IIBB, SICORE, F.931 y demás obligaciones del cliente.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => setAbierto((v) => !v)}>
          {abierto ? "Cerrar" : "Nueva DDJJ"}
        </Button>
      </CardHeader>

      {abierto && (
        <CardContent>
          <form action={formAction} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cliente_id">Cliente *</Label>
              <Select id="cliente_id" name="cliente_id" required>
                <option value="">Elegí un cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social} — {formatCUIT(c.cuit)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="impuesto_tipo">Impuesto *</Label>
              <Select id="impuesto_tipo" name="impuesto_tipo" required>
                {IMPUESTOS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organismo">Organismo</Label>
              <Select id="organismo" name="organismo" defaultValue="AFIP">
                <option value="AFIP">AFIP / ARCA</option>
                <option value="ARBA">ARBA</option>
                <option value="AGIP">AGIP</option>
                <option value="COMARB">Comisión Arbitral</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodo_fiscal">Período (AAAA-MM) *</Label>
              <Input
                id="periodo_fiscal"
                name="periodo_fiscal"
                placeholder="2026-08"
                defaultValue={periodoActual}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_vencimiento">Vencimiento *</Label>
              <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto_impuesto_ars">Impuesto determinado (ARS)</Label>
              <Input id="monto_impuesto_ars" name="monto_impuesto_ars" type="number" step="0.01" defaultValue={0} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto_vep_ars">Importe del VEP (ARS)</Label>
              <Input id="monto_vep_ars" name="monto_vep_ars" type="number" step="0.01" defaultValue={0} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo_vep">Código de VEP</Label>
              <Input id="codigo_vep" name="codigo_vep" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select id="estado" name="estado" defaultValue="PENDIENTE">
                {Object.entries(ETIQUETAS_ESTADO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" name="notas" rows={2} />
            </div>

            {state?.error && (
              <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive md:col-span-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {state?.error}
              </p>
            )}

            {state?.ok && (
              <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400 md:col-span-3">
                <CheckCircle2 className="h-4 w-4" />
                Declaración cargada.
              </p>
            )}

            <div className="md:col-span-3">
              <SubmitButton />
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
