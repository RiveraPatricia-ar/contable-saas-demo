"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import type { ClienteState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIAS_AUTONOMO,
  CATEGORIAS_MONOTRIBUTO,
  ETIQUETAS_ACTIVIDAD,
  ETIQUETAS_FORMA_JURIDICA,
  ETIQUETAS_IIBB,
  ETIQUETAS_IVA,
  PROVINCIAS,
} from "@/lib/constants";
import type { ClienteEstudio } from "@/types/database";

const ESTADO_INICIAL: ClienteState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function ClienteForm({
  accion,
  cliente,
  label = "Guardar cliente",
}: {
  accion: (prev: ClienteState, formData: FormData) => Promise<ClienteState>;
  cliente?: ClienteEstudio;
  label?: string;
}) {
  const [state, formAction] = useFormState(accion, ESTADO_INICIAL);
  const [condicionIva, setCondicionIva] = useState(
    cliente?.condicion_iva ?? "MONOTRIBUTO"
  );
  const [tieneEmpleados, setTieneEmpleados] = useState(
    cliente?.tiene_empleados ?? false
  );
  const [aportaAutonomo, setAportaAutonomo] = useState(
    cliente?.aporta_autonomo ?? false
  );

  return (
    <form action={formAction} className="space-y-5" autoComplete="off">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos identificatorios</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cuit">CUIT *</Label>
            <Input
              id="cuit"
              name="cuit"
              inputMode="numeric"
              placeholder="20123456789"
              defaultValue={cliente?.cuit}
              required
            />
            <p className="text-xs text-muted-foreground">
              11 dígitos, con o sin guiones. Se valida el dígito verificador.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_persona">Tipo de persona</Label>
            <Select
              id="tipo_persona"
              name="tipo_persona"
              defaultValue={cliente?.tipo_persona ?? "FISICA"}
            >
              <option value="FISICA">Persona humana</option>
              <option value="JURIDICA">Persona jurídica</option>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="razon_social">Razón social / Apellido y nombre *</Label>
            <Input
              id="razon_social"
              name="razon_social"
              defaultValue={cliente?.razon_social}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre_fantasia">Nombre de fantasía</Label>
            <Input
              id="nombre_fantasia"
              name="nombre_fantasia"
              defaultValue={cliente?.nombre_fantasia ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="actividad_principal">Actividad principal</Label>
            <Input
              id="actividad_principal"
              name="actividad_principal"
              defaultValue={cliente?.actividad_principal ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_contacto">Email</Label>
            <Input
              id="email_contacto"
              name="email_contacto"
              type="email"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              defaultValue={cliente?.email_contacto ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono_contacto">Teléfono</Label>
            <Input
              id="telefono_contacto"
              name="telefono_contacto"
              defaultValue={cliente?.telefono_contacto ?? ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="domicilio_fiscal">Domicilio fiscal</Label>
            <Input
              id="domicilio_fiscal"
              name="domicilio_fiscal"
              defaultValue={cliente?.domicilio_fiscal ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provincia">Provincia</Label>
            <Select
              id="provincia"
              name="provincia"
              defaultValue={cliente?.provincia ?? "CABA"}
            >
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_inicio_actividades">Inicio de actividades</Label>
            <Input
              id="fecha_inicio_actividades"
              name="fecha_inicio_actividades"
              type="date"
              defaultValue={cliente?.fecha_inicio_actividades ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Situación fiscal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="condicion_iva">Condición frente al IVA *</Label>
            <Select
              id="condicion_iva"
              name="condicion_iva"
              value={condicionIva}
              onChange={(e) => setCondicionIva(e.target.value as ClienteEstudio["condicion_iva"])}
            >
              {Object.entries(ETIQUETAS_IVA).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>

          {condicionIva === "MONOTRIBUTO" && (
            <div className="space-y-2">
              <Label htmlFor="categoria_monotributo">Categoría *</Label>
              <Select
                id="categoria_monotributo"
                name="categoria_monotributo"
                defaultValue={cliente?.categoria_monotributo ?? "A"}
              >
                {CATEGORIAS_MONOTRIBUTO.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="condicion_iibb">Ingresos Brutos</Label>
            <Select
              id="condicion_iibb"
              name="condicion_iibb"
              defaultValue={cliente?.condicion_iibb ?? "NO_INSCRIPTO"}
            >
              {Object.entries(ETIQUETAS_IIBB).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_iibb">N° de inscripción IIBB</Label>
            <Input
              id="numero_iibb"
              name="numero_iibb"
              defaultValue={cliente?.numero_iibb ?? ""}
            />
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <input
              id="tiene_empleados"
              name="tiene_empleados"
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              checked={tieneEmpleados}
              onChange={(e) => setTieneEmpleados(e.target.checked)}
            />
            <Label htmlFor="tiene_empleados" className="cursor-pointer">
              Tiene empleados en relación de dependencia
            </Label>
          </div>

          {tieneEmpleados && (
            <div className="space-y-2">
              <Label htmlFor="cantidad_empleados">Cantidad de empleados</Label>
              <Input
                id="cantidad_empleados"
                name="cantidad_empleados"
                type="number"
                min={0}
                defaultValue={cliente?.cantidad_empleados ?? 0}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="forma_juridica">Forma jurídica</Label>
            <Select
              id="forma_juridica"
              name="forma_juridica"
              defaultValue={cliente?.forma_juridica ?? "UNIPERSONAL"}
            >
              {Object.entries(ETIQUETAS_FORMA_JURIDICA).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="padron_rentas">Padrón de Rentas</Label>
            <Input
              id="padron_rentas"
              name="padron_rentas"
              defaultValue={cliente?.padron_rentas ?? ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Aportes previsionales</Label>
            <p className="text-xs text-muted-foreground">
              Un mismo cliente puede pagar el componente del monotributo y, a la
              vez, aportes de autónomo por su participación societaria.
            </p>
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  name="aporta_monotributo"
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  defaultChecked={cliente?.aporta_monotributo ?? false}
                />
                Paga aporte de monotributo
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  name="aporta_autonomo"
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={aportaAutonomo}
                  onChange={(e) => setAportaAutonomo(e.target.checked)}
                />
                Paga aporte de autónomo
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actividad_monotributo">Actividad (monotributo)</Label>
            <Select
              id="actividad_monotributo"
              name="actividad_monotributo"
              defaultValue={cliente?.actividad_monotributo ?? "SERVICIOS"}
            >
              {Object.entries(ETIQUETAS_ACTIVIDAD).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              La escala tiene una cuota distinta para cada una.
            </p>
          </div>

          {aportaAutonomo && (
            <div className="space-y-2">
              <Label htmlFor="categoria_autonomo">Categoría de autónomo</Label>
              <Select
                id="categoria_autonomo"
                name="categoria_autonomo"
                defaultValue={cliente?.categoria_autonomo ?? "I"}
              >
                {CATEGORIAS_AUTONOMO.map((c) => (
                  <option key={c} value={c}>
                    Categoría {c}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex items-center gap-3 md:col-span-2">
            <input
              id="excluir_de_recategorizacion"
              name="excluir_de_recategorizacion"
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              defaultChecked={cliente?.excluir_de_recategorizacion ?? false}
            />
            <Label htmlFor="excluir_de_recategorizacion" className="cursor-pointer">
              No avisar sobre recategorización de este cliente
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alias_planilla">Alias en la planilla</Label>
            <Input
              id="alias_planilla"
              name="alias_planilla"
              placeholder="Ej. ANDINA TEXTIL - V. CASTELLANOS"
              defaultValue={cliente?.alias_planilla ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="honorario_mensual_ars">Honorario mensual (ARS)</Label>
            <Input
              id="honorario_mensual_ars"
              name="honorario_mensual_ars"
              type="number"
              min={0}
              step="0.01"
              defaultValue={cliente?.honorario_mensual_ars ?? 0}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Credenciales de organismos
          </CardTitle>
          <CardDescription>
            Se guardan cifradas en la base y no se muestran en pantalla. Dejar
            los campos vacíos mantiene la clave que ya estaba guardada. Cada
            lectura queda registrada en la auditoría.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clave_fiscal_afip">Clave Fiscal AFIP</Label>
            <Input
              id="clave_fiscal_afip"
              name="clave_fiscal_afip"
              type="password"
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              placeholder="Sin cambios"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clave_arba_agip">Clave ARBA / Ciudad (AGIP)</Label>
            <Input
              id="clave_arba_agip"
              name="clave_arba_agip"
              type="password"
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              placeholder="Sin cambios"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas internas</CardTitle>
          <CardDescription>Visible solo para el estudio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            name="notas_internas"
            rows={3}
            defaultValue={cliente?.notas_internas ?? ""}
          />
          <div className="flex items-center gap-3">
            <input
              id="estado_activo"
              name="estado_activo"
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              defaultChecked={cliente?.estado_activo ?? true}
            />
            <Label htmlFor="estado_activo" className="cursor-pointer">
              Cliente activo
            </Label>
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state?.error}
        </p>
      )}

      {state?.ok && (
        <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Cambios guardados.
        </p>
      )}

      <div className="flex justify-end gap-3">
        <SubmitButton label={label} />
      </div>
    </form>
  );
}
