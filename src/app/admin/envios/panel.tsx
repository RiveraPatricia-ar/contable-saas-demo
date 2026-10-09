"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, CloudDownload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectorWhatsApp } from "@/components/selector-whatsapp";
import { prepararEnviosDelMes, type EnvioState } from "./actions";

const INICIAL: EnvioState = {};

function Boton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CloudDownload className="h-4 w-4" />
      )}
      Preparar envíos del mes
    </Button>
  );
}

export function PanelPreparar({
  periodo,
  mailListo,
}: {
  periodo: string;
  mailListo: boolean;
}) {
  const [state, action] = useFormState(prepararEnviosDelMes, INICIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Boletas de Rentas</CardTitle>
        <CardDescription>
          Intenta descargar la boleta de la cuota del mes de cada plan
          vigente. Ojo: el sitio de Rentas tiene captcha, así que lo más
          probable es que haya que bajarlas a mano desde la tabla de abajo y
          subirlas. El botón sirve por si alguna vez Rentas lo permite.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <form action={action} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="periodo">Mes (AAAA-MM)</Label>
            <Input
              id="periodo"
              name="periodo"
              defaultValue={periodo}
              className="w-36"
            />
          </div>
          <Boton />
        </form>

        {state?.error ? (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state?.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p className="flex items-start gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state?.mensaje}
          </p>
        ) : null}

        <div className="border-t pt-4">
          <SelectorWhatsApp />
        </div>

        {!mailListo ? (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              El envío por mail está apagado. Para prenderlo, agregá{" "}
              <code>GMAIL_USER</code> y <code>GMAIL_APP_PASSWORD</code> en el
              archivo <code>.env.local</code> y reiniciá el servidor. El botón de
              WhatsApp funciona igual.
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
