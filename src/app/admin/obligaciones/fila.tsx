"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatARS, formatFecha, diasHasta } from "@/lib/utils";
import { ETIQUETAS_IMPUESTO } from "@/lib/constants";
import { guardarBoletaUrl, marcarObligacion } from "./actions";
import type { DeclaracionJurada } from "@/types/database";

type Campo =
  | "presentada"
  | "boleta_generada"
  | "enviada_al_cliente"
  | "boleta_pagada";

export type ObligacionFila = DeclaracionJurada & {
  clientes_estudio: { razon_social: string; cuit: string } | null;
};

/** Casilla de seguimiento: presentada / boleta / envío / pagada. */
function Casilla({
  id,
  campo,
  valor,
  etiqueta,
}: {
  id: string;
  campo: Campo;
  valor: boolean;
  etiqueta: string;
}) {
  const [pendiente, startTransition] = useTransition();
  const [estado, setEstado] = useState(valor);

  return (
    <button
      type="button"
      title={etiqueta}
      aria-label={etiqueta}
      aria-pressed={estado}
      disabled={pendiente}
      onClick={() => {
        const nuevo = !estado;
        setEstado(nuevo);
        startTransition(async () => {
          const r = await marcarObligacion(id, campo, nuevo);
          if (r?.error) setEstado(!nuevo);
        });
      }}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md border transition-colors",
        estado
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "border-input text-muted-foreground hover:bg-muted",
        pendiente && "opacity-60"
      )}
    >
      {pendiente ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className={cn("h-3.5 w-3.5", !estado && "opacity-25")} />
      )}
    </button>
  );
}

/** Campo de link de boleta, se guarda al salir del input. */
function LinkBoleta({ id, url }: { id: string; url: string | null }) {
  const [valor, setValor] = useState(url ?? "");
  const [, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={valor}
        placeholder="Link de la boleta"
        className="h-8 w-44 text-xs"
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          if (valor !== (url ?? "")) {
            startTransition(() => guardarBoletaUrl(id, valor));
          }
        }}
      />
      {valor ? (
        <a
          href={valor}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground"
          title="Abrir boleta"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  );
}

export function FilaObligacion({ o }: { o: ObligacionFila }) {
  const dias = diasHasta(o.fecha_vencimiento);
  const vencida = dias < 0 && !o.boleta_pagada;

  return (
    <TableRow className={cn(vencida && "bg-destructive/5")}>
      <TableCell>
        <p className="font-medium leading-tight">
          {o.clientes_estudio?.razon_social ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {o.clientes_estudio?.cuit ?? ""}
        </p>
      </TableCell>

      <TableCell className="text-sm">
        {ETIQUETAS_IMPUESTO[o.impuesto_tipo] ?? o.impuesto_tipo}
        <span className="ml-1.5 text-xs text-muted-foreground">
          {o.organismo}
        </span>
      </TableCell>

      <TableCell className="whitespace-nowrap text-sm">
        {formatFecha(o.fecha_vencimiento)}
        {o.boleta_pagada ? null : (
          <Badge
            variant={dias < 0 ? "destructive" : dias <= 3 ? "warning" : "secondary"}
            className="ml-2"
          >
            {dias < 0 ? `${Math.abs(dias)} d. vencida` : `en ${dias} d.`}
          </Badge>
        )}
      </TableCell>

      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
        {formatARS(o.monto_impuesto_ars)}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-1.5">
          <Casilla id={o.id} campo="presentada" valor={o.presentada} etiqueta="Presentada" />
          <Casilla id={o.id} campo="boleta_generada" valor={o.boleta_generada} etiqueta="Boleta generada" />
          <Casilla id={o.id} campo="enviada_al_cliente" valor={o.enviada_al_cliente} etiqueta="Enviada al cliente" />
          <Casilla id={o.id} campo="boleta_pagada" valor={o.boleta_pagada} etiqueta="Boleta pagada" />
        </div>
      </TableCell>

      <TableCell>
        <LinkBoleta id={o.id} url={o.boleta_url} />
      </TableCell>
    </TableRow>
  );
}
