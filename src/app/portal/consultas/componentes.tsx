"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, MessageSquarePlus, Send } from "lucide-react";
import { abrirConsulta, responderConsulta, type PortalState } from "../actions";
import type { MensajeConAutor } from "./page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Consulta } from "@/types/database";

const ESTADO_INICIAL: PortalState = {};

function Aviso({ state }: { state: PortalState }) {
  if (state?.error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {state?.error}
      </p>
    );
  }
  if (state?.ok) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        {state?.ok}
      </p>
    );
  }
  return null;
}

function Enviar({ label, icon: Icon }: { label: string; icon: typeof Send }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export function NuevaConsulta({ clienteId }: { clienteId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction] = useFormState(abrirConsulta, ESTADO_INICIAL);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Consultas con tu contador</CardTitle>
          <CardDescription>
            Escribinos por acá y te respondemos en el mismo hilo.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => setAbierto((v) => !v)}>
          {abierto ? "Cerrar" : "Nueva consulta"}
        </Button>
      </CardHeader>

      {abierto && (
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="cliente_id" value={clienteId} />

            <div className="space-y-2">
              <Label htmlFor="asunto">Asunto</Label>
              <Input id="asunto" name="asunto" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuerpo">Mensaje</Label>
              <Textarea id="cuerpo" name="cuerpo" rows={4} required />
            </div>

            <Aviso state={state} />
            <Enviar label="Enviar consulta" icon={MessageSquarePlus} />
          </form>
        </CardContent>
      )}
    </Card>
  );
}

export function HiloConsulta({
  consulta,
  mensajes,
  usuarioId,
}: {
  consulta: Consulta;
  mensajes: MensajeConAutor[];
  usuarioId: string;
}) {
  const [state, formAction] = useFormState(responderConsulta, ESTADO_INICIAL);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <CardTitle className="text-base">{consulta.asunto}</CardTitle>
        <Badge
          variant={
            consulta.estado === "CERRADA"
              ? "secondary"
              : consulta.estado === "RESPONDIDA"
                ? "success"
                : "warning"
          }
        >
          {consulta.estado.toLowerCase()}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {mensajes.map((m) => {
            const propio = m.autor_id === usuarioId;
            return (
              <div
                key={m.id}
                className={cn("flex", propio ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm",
                    propio
                      ? "bg-primary text-primary-foreground"
                      : "border bg-muted/50"
                  )}
                >
                  {!propio && m.profiles?.nombre_completo && (
                    <p className="mb-1 text-xs font-medium opacity-70">
                      {m.profiles.nombre_completo}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.cuerpo}</p>
                </div>
              </div>
            );
          })}
        </div>

        {consulta.estado !== "CERRADA" && (
          <form action={formAction} className="flex gap-2">
            <input type="hidden" name="consulta_id" value={consulta.id} />
            <Textarea
              name="cuerpo"
              rows={2}
              placeholder="Escribí tu respuesta…"
              className="flex-1"
              required
            />
            <Enviar label="Enviar" icon={Send} />
          </form>
        )}

        <Aviso state={state} />
      </CardContent>
    </Card>
  );
}
