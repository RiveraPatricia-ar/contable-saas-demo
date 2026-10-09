"use client";

import { useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Building2, Link2, Loader2, Trash2, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ETIQUETAS_FORMA_JURIDICA, ETIQUETAS_ROL_VINCULO } from "@/lib/constants";
import { formatCUIT } from "@/lib/utils";
import {
  desvincularSociedad,
  vincularSociedad,
  type VinculoState,
} from "../actions";

const INICIAL: VinculoState = {};

export type VinculoFila = {
  id: string;
  rol_vinculo: string;
  participacion: number | null;
  otro: {
    id: string;
    razon_social: string;
    cuit: string;
    forma_juridica: string;
  } | null;
};

function Boton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
      Vincular
    </Button>
  );
}

export function Vinculos({
  clienteId,
  esSociedad,
  vinculos,
  candidatos,
}: {
  clienteId: string;
  esSociedad: boolean;
  vinculos: VinculoFila[];
  candidatos: { id: string; razon_social: string; cuit: string }[];
}) {
  const [state, action] = useFormState(vincularSociedad, INICIAL);
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {esSociedad ? "Titulares y representantes" : "Sociedades vinculadas"}
        </CardTitle>
        <CardDescription>
          {esSociedad
            ? "Personas físicas que responden por esta sociedad."
            : "Sociedades de las que esta persona es titular o representante. Cada CUIT lleva sus propios impuestos y planes."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {vinculos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin vínculos cargados.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {vinculos.map((v) => (
              <li key={v.id} className="flex items-center gap-3 p-3">
                {esSociedad ? (
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/clientes/${v.otro?.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {v.otro?.razon_social ?? "—"}
                  </Link>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatCUIT(v.otro?.cuit ?? "")}
                    {v.otro?.forma_juridica
                      ? ` · ${ETIQUETAS_FORMA_JURIDICA[v.otro.forma_juridica] ?? ""}`
                      : ""}
                  </p>
                </div>
                <Badge variant="secondary">
                  {ETIQUETAS_ROL_VINCULO[v.rol_vinculo] ?? v.rol_vinculo}
                  {v.participacion ? ` · ${v.participacion}%` : ""}
                </Badge>
                <button
                  type="button"
                  title="Quitar vínculo"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    startTransition(() => {
                      desvincularSociedad(v.id, clienteId);
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {esSociedad ? null : (
          <form action={action} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="persona_id" value={clienteId} />
            <div className="min-w-[16rem] flex-1 space-y-1.5">
              <Label htmlFor="sociedad_id">Sociedad</Label>
              <Select id="sociedad_id" name="sociedad_id" required>
                <option value="">Elegí una sociedad ya cargada…</option>
                {candidatos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social} — {formatCUIT(c.cuit)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rol_vinculo">Rol</Label>
              <Select id="rol_vinculo" name="rol_vinculo" defaultValue="TITULAR">
                {Object.entries(ETIQUETAS_ROL_VINCULO).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="participacion">% participación</Label>
              <Input
                id="participacion"
                name="participacion"
                type="number"
                min={0}
                max={100}
                step="0.01"
                className="w-28"
              />
            </div>
            <Boton />
            {state?.error ? (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {state?.error}
              </p>
            ) : null}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
