"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react";
import { crearTarea, type TareaState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ESTADO_INICIAL: TareaState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Crear tarea
    </Button>
  );
}

export function NuevaTarea({
  clientes,
  staff,
}: {
  clientes: { id: string; razon_social: string }[];
  staff: { id: string; nombre_completo: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(crearTarea, ESTADO_INICIAL);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Tareas del estudio</CardTitle>
          <CardDescription>
            Asigná trabajo a los colaboradores y seguí su estado.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => setAbierto((v) => !v)}>
          {abierto ? "Cerrar" : "Nueva tarea"}
        </Button>
      </CardHeader>

      {abierto && (
        <CardContent>
          <form action={formAction} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="titulo">Título *</Label>
              <Input id="titulo" name="titulo" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente_id_t">Cliente</Label>
              <Select id="cliente_id_t" name="cliente_id" defaultValue="">
                <option value="">Sin cliente asociado</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.razon_social}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asignado_a">Asignada a</Label>
              <Select id="asignado_a" name="asignado_a" defaultValue="">
                <option value="">Sin asignar</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre_completo}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridad">Prioridad</Label>
              <Select id="prioridad" name="prioridad" defaultValue="MEDIA">
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_limite">Fecha límite</Label>
              <Input id="fecha_limite" name="fecha_limite" type="date" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" name="descripcion" rows={2} />
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
                Tarea creada.
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
