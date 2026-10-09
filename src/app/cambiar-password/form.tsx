"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { cambiarPassword, type CambioState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: CambioState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Guardar contraseña
    </Button>
  );
}

export function CambiarPasswordForm() {
  const [state, formAction] = useFormState(cambiarPassword, ESTADO_INICIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña nueva</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
        <p className="text-xs text-muted-foreground">
          Mínimo 10 caracteres, con letras y números.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password_repetida">Repetir contraseña</Label>
        <Input
          id="password_repetida"
          name="password_repetida"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state?.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
