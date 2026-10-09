"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ListPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectorWhatsApp } from "@/components/selector-whatsapp";
import { URL_CCMA, VOLANTES_DIAS } from "@/lib/constants";
import { generarVolantesMes, type VolanteState } from "./actions";

const INICIAL: VolanteState = {};

function Boton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ListPlus className="h-4 w-4" />
      )}
      Armar volantes del mes
    </Button>
  );
}

export function PanelVolantes({
  periodo,
  mailListo,
}: {
  periodo: string;
  mailListo: boolean;
}) {
  const [state, action] = useFormState(generarVolantesMes, INICIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Volantes de Monotributo y Autónomos
        </CardTitle>
        <CardDescription>
          Arma la lista de quién paga qué este mes, con la cuota del monotributo
          ya calculada según la categoría y la fecha de cálculo a{" "}
          {VOLANTES_DIAS.margenCalculo} días. El VEP se genera en la CCMA, que
          pide clave fiscal, y el QR se sube acá.
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
          <Button asChild variant="outline">
            <a href={URL_CCMA} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Abrir la CCMA
            </a>
          </Button>
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
              El envío por mail está apagado: faltan <code>GMAIL_USER</code> y{" "}
              <code>GMAIL_APP_PASSWORD</code> en <code>.env.local</code>.
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
