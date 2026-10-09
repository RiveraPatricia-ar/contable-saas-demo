"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { IMPUESTOS, ORGANISMOS } from "@/lib/constants";
import { formatCUIT } from "@/lib/utils";
import {
  configurarObligacion,
  generarObligacionesMes,
  type ObligacionState,
} from "./actions";

const INICIAL: ObligacionState = {};

function Boton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

function Aviso({ state }: { state: ObligacionState }) {
  if (state?.error) {
    return (
      <p className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> {state?.error}
      </p>
    );
  }
  if (state?.ok) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4" /> {state?.mensaje ?? "Listo."}
      </p>
    );
  }
  return null;
}

export function PanelGenerar({
  periodo,
  clientes,
}: {
  periodo: string;
  clientes: { id: string; razon_social: string; cuit: string }[];
}) {
  const [config, setConfig] = useState(false);
  const [stateGen, accionGen] = useFormState(generarObligacionesMes, INICIAL);
  const [stateCfg, accionCfg] = useFormState(configurarObligacion, INICIAL);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Impuestos del mes</CardTitle>
          <CardDescription>
            Generá de una vez las obligaciones del período según los impuestos
            que sigue cada cliente.
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfig((v) => !v)}>
          <Settings2 className="h-4 w-4" />
          {config ? "Cerrar" : "Configurar cliente"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <form action={accionGen} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="periodo">Período (AAAA-MM)</Label>
            <Input
              id="periodo"
              name="periodo"
              defaultValue={periodo}
              placeholder="2026-09"
              className="w-40"
            />
          </div>
          <Boton>
            <RefreshCw className="h-4 w-4" />
            Generar obligaciones
          </Boton>
          <Aviso state={stateGen} />
        </form>

        {config ? (
          <form
            action={accionCfg}
            className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="cliente_id">Cliente</Label>
              <Select id="cliente_id" name="cliente_id" required>
                <option value="">Elegí un cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social} — {formatCUIT(c.cuit)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="impuesto_tipo">Impuesto</Label>
              <Select id="impuesto_tipo" name="impuesto_tipo" required>
                {IMPUESTOS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="organismo">Organismo</Label>
              <Select id="organismo" name="organismo" defaultValue="ARCA">
                {ORGANISMOS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dia_vencimiento">Día de vencimiento</Label>
              <Input
                id="dia_vencimiento"
                name="dia_vencimiento"
                type="number"
                min={1}
                max={28}
                defaultValue={20}
              />
            </div>

            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-5">
              <Boton>Guardar seguimiento</Boton>
              <Aviso state={stateCfg} />
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
