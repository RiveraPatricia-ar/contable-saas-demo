"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ETIQUETAS_ESTADO_PLAN } from "@/lib/constants";
import { formatCUIT } from "@/lib/utils";
import {
  actualizarPlan,
  borrarCuotas,
  eliminarPlan,
  type PlanState,
} from "../actions";
import type { PlanResumen } from "@/types/database";

const INICIAL: PlanState = {};

const TIPOS_ARCA = [
  "RG 5321 - Plan Deuda General",
  "RG 5711 - Plan Deuda Impositiva y Previsional",
];
const TIPOS_RENTAS = [
  "1571 - R.E.F.P.-S.P. PARCIAL",
  "240 - Regimen de Regularizacion de Deudas Fiscales",
];

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Guardar cambios
    </Button>
  );
}

export function EditarPlan({
  plan,
  clientes,
}: {
  plan: PlanResumen;
  clientes: { id: string; razon_social: string; cuit: string }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [origen, setOrigen] = useState<"ARCA" | "RENTAS">(plan.origen);
  const [state, formAction] = useFormState(actualizarPlan, INICIAL);
  const [aviso, setAviso] = useState<PlanState>({});
  const [pendiente, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  const esRentas = origen === "RENTAS";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Corregir el plan</CardTitle>
          <CardDescription>
            Para arreglar un dato mal cargado. Los importes de cada cuota se
            editan directamente en la tabla de abajo.
          </CardDescription>
        </div>
        <Button
          variant={abierto ? "ghost" : "outline"}
          size="sm"
          onClick={() => setAbierto((v) => !v)}
        >
          <Pencil className="h-4 w-4" />
          {abierto ? "Cerrar" : "Editar"}
        </Button>
      </CardHeader>

      {abierto ? (
        <CardContent className="space-y-6">
          <form
            action={formAction}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="plan_id" value={plan.id} />

            <div className="space-y-1.5">
              <Label htmlFor="e-origen">Organismo</Label>
              <Select
                id="e-origen"
                name="origen"
                value={origen}
                onChange={(e) => setOrigen(e.target.value as "ARCA" | "RENTAS")}
              >
                <option value="ARCA">ARCA — Mis Facilidades</option>
                <option value="RENTAS">Rentas Tucumán</option>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="e-cliente">Cliente</Label>
              <Select
                id="e-cliente"
                name="cliente_id"
                defaultValue={plan.cliente_id}
                required
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social} — {formatCUIT(c.cuit)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="e-tipo">Tipo de plan</Label>
              <Input
                id="e-tipo"
                name="tipo_plan"
                defaultValue={plan.tipo_plan}
                list={esRentas ? "e-tipos-rentas" : "e-tipos-arca"}
                required
              />
              <datalist id="e-tipos-arca">
                {TIPOS_ARCA.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <datalist id="e-tipos-rentas">
                {TIPOS_RENTAS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-numero">Número de plan</Label>
              <Input
                id="e-numero"
                name="numero_plan"
                defaultValue={plan.numero_plan}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-cuotas">Cantidad de cuotas</Label>
              <Input
                id="e-cuotas"
                name="cantidad_cuotas"
                type="number"
                min={1}
                max={240}
                defaultValue={plan.cantidad_cuotas}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-monto">Monto total</Label>
              <Input
                id="e-monto"
                name="monto_total_ars"
                type="number"
                step="0.01"
                min={0}
                defaultValue={plan.monto_total_ars}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-fecha">Fecha de presentación</Label>
              <Input
                id="e-fecha"
                name="fecha_presentacion"
                type="date"
                defaultValue={plan.fecha_presentacion ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-estado">Estado</Label>
              <Select id="e-estado" name="estado" defaultValue={plan.estado}>
                {Object.entries(ETIQUETAS_ESTADO_PLAN).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-venc1">
                {esRentas ? "Día de pago" : "1er vencimiento (día)"}
              </Label>
              <Input
                id="e-venc1"
                name="dia_vencimiento_1"
                type="number"
                min={1}
                max={28}
                defaultValue={plan.dia_vencimiento_1}
              />
            </div>

            {esRentas ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="e-diapago">Día de pago</Label>
                  <Input
                    id="e-diapago"
                    name="dia_pago"
                    type="number"
                    min={1}
                    max={28}
                    defaultValue={plan.dia_pago ?? 15}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-diaenvio">Día de envío al cliente</Label>
                  <Input
                    id="e-diaenvio"
                    name="dia_envio"
                    type="number"
                    min={1}
                    max={28}
                    defaultValue={plan.dia_envio ?? 10}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-tipopp">Tipo plan pago (nro.)</Label>
                  <Input
                    id="e-tipopp"
                    name="rentas_tipo_pp"
                    defaultValue={plan.rentas_tipo_pp ?? ""}
                    placeholder="1571"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-nropp">Número plan pago</Label>
                  <Input
                    id="e-nropp"
                    name="rentas_nro_pp"
                    defaultValue={plan.rentas_nro_pp ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-validac">Código de validación</Label>
                  <Input
                    id="e-validac"
                    name="rentas_cod_validacion"
                    defaultValue={plan.rentas_cod_validacion ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-padron">Padrón</Label>
                  <Input
                    id="e-padron"
                    name="rentas_padron"
                    defaultValue={plan.rentas_padron ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-oblig">Obligación</Label>
                  <Input
                    id="e-oblig"
                    name="rentas_obligacion"
                    defaultValue={plan.rentas_obligacion ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-cpe">Código pago electrónico</Label>
                  <Input
                    id="e-cpe"
                    name="rentas_cod_pago_elec"
                    defaultValue={plan.rentas_cod_pago_elec ?? ""}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="e-venc2">2do vencimiento (día)</Label>
                  <Input
                    id="e-venc2"
                    name="dia_vencimiento_2"
                    type="number"
                    min={1}
                    max={28}
                    defaultValue={plan.dia_vencimiento_2 ?? 26}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-cbu">CBU de débito</Label>
                  <Input
                    id="e-cbu"
                    name="cbu_debito"
                    maxLength={22}
                    defaultValue={plan.cbu_debito ?? ""}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="e-notas">Notas</Label>
              <Textarea
                id="e-notas"
                name="notas"
                rows={2}
                defaultValue={plan.notas ?? ""}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
              <Guardar />
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

          <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium">Si el error es de fondo</p>
            <p className="text-sm text-muted-foreground">
              Cambiar la cantidad de cuotas no rehace las que ya están
              generadas. Borralas y volvé a generarlas con los datos
              corregidos. Las cuotas pagadas no se borran: desmarcalas primero,
              así no se pierde ese dato.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={pendiente}
                onClick={() =>
                  startTransition(async () => {
                    setAviso(await borrarCuotas(plan.id));
                  })
                }
              >
                {pendiente ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Borrar las cuotas
              </Button>

              {confirmando ? (
                <>
                  <span className="text-sm">
                    ¿Eliminar el plan y sus {plan.cuotas_cargadas} cuotas?
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pendiente}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await eliminarPlan(plan.id);
                        if (r.error) setAviso(r);
                        else router.push("/admin/planes");
                      })
                    }
                  >
                    Sí, eliminar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmando(false)}
                  >
                    No
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmando(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar el plan
                </Button>
              )}
            </div>

            {aviso?.error ? (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {aviso?.error}
              </p>
            ) : null}
            {aviso?.ok ? (
              <p className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> {aviso?.mensaje}
              </p>
            ) : null}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
