"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCUIT } from "@/lib/utils";
import { crearPlan, type PlanState } from "./actions";

const INICIAL: PlanState = {};

/**
 * Planes de Mis Facilidades de ARCA. La lista es una ayuda, no un limite: el
 * campo deja escribir cualquier otro, porque ARCA publica regimenes nuevos y
 * reabre los viejos seguido. Agregar aca los que se usen seguido.
 */
const TIPOS_ARCA = [
  "RG 5321 - Plan Deuda General",
  "RG 5711 - Plan Deuda Impositiva y Previsional",
];

/** Planes de Rentas Tucuman. Mismo criterio: se puede escribir otro. */
const TIPOS_RENTAS = [
  "1571 - R.E.F.P.-S.P. PARCIAL",
  "240 - Regimen de Regularizacion de Deudas Fiscales",
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Cargar plan
    </Button>
  );
}

export function NuevoPlan({
  clientes,
}: {
  clientes: { id: string; razon_social: string; cuit: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [origen, setOrigen] = useState<"ARCA" | "RENTAS">("ARCA");
  const [state, formAction] = useFormState(crearPlan, INICIAL);

  const esRentas = origen === "RENTAS";
  const mesActual = new Date().toISOString().slice(0, 7);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Planes de facilidades</CardTitle>
          <CardDescription>
            ARCA vence el 16 y el 26; Rentas se paga el 15 y se envía el día 10.
          </CardDescription>
        </div>
        <Button variant={abierto ? "ghost" : "default"} size="sm" onClick={() => setAbierto((v) => !v)}>
          {abierto ? "Cerrar" : "Nuevo plan"}
        </Button>
      </CardHeader>

      {abierto ? (
        <CardContent>
          <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="origen">Organismo</Label>
              <Select
                id="origen"
                name="origen"
                value={origen}
                onChange={(e) => setOrigen(e.target.value as "ARCA" | "RENTAS")}
              >
                <option value="ARCA">ARCA — Mis Facilidades</option>
                <option value="RENTAS">Rentas Tucumán</option>
              </Select>
            </div>

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

            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="tipo_plan">Tipo de plan</Label>
              <Input
                id="tipo_plan"
                name="tipo_plan"
                list={esRentas ? "tipos-rentas" : "tipos-arca"}
                placeholder={
                  esRentas
                    ? "Elegí uno o escribí el tipo de plan"
                    : "Elegí uno o escribí la RG"
                }
                required
              />
              <datalist id="tipos-arca">
                {TIPOS_ARCA.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <datalist id="tipos-rentas">
                {TIPOS_RENTAS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Copiá el texto tal cual figura en la columna «Tipo» del
                organismo. Si no está en la lista, escribilo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numero_plan">Número de plan</Label>
              <Input
                id="numero_plan"
                name="numero_plan"
                placeholder={esRentas ? "542504" : "V904235"}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cantidad_cuotas">Cantidad de cuotas</Label>
              <Input id="cantidad_cuotas" name="cantidad_cuotas" type="number" min={1} max={240} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monto_total_ars">Monto total</Label>
              <Input id="monto_total_ars" name="monto_total_ars" type="number" step="0.01" min={0} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fecha_presentacion">Fecha de presentación</Label>
              <Input id="fecha_presentacion" name="fecha_presentacion" type="date" />
            </div>

            {esRentas ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="rentas_tipo_pp">Tipo plan pago (nro.)</Label>
                  <Input id="rentas_tipo_pp" name="rentas_tipo_pp" placeholder="1571" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rentas_nro_pp">Número plan pago</Label>
                  <Input id="rentas_nro_pp" name="rentas_nro_pp" placeholder="542504" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rentas_cod_validacion">Código de validación</Label>
                  <Input id="rentas_cod_validacion" name="rentas_cod_validacion" placeholder="4437" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rentas_padron">Padrón</Label>
                  <Input id="rentas_padron" name="rentas_padron" placeholder="23261383144" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rentas_obligacion">Obligación</Label>
                  <Input id="rentas_obligacion" name="rentas_obligacion" placeholder="2610182337" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rentas_cod_pago_elec">Código pago electrónico</Label>
                  <Input id="rentas_cod_pago_elec" name="rentas_cod_pago_elec" placeholder="45157121836" />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="cbu_debito">CBU de débito (opcional)</Label>
                <Input id="cbu_debito" name="cbu_debito" maxLength={22} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="primer_mes">Mes de la 1ª cuota</Label>
              <Input id="primer_mes" name="primer_mes" placeholder="AAAA-MM" defaultValue={mesActual} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="importe_cuota">Importe por cuota</Label>
              <Input id="importe_cuota" name="importe_cuota" type="number" step="0.01" min={0} />
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" name="notas" rows={2} />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
              <SubmitButton />
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
            </div>
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}
