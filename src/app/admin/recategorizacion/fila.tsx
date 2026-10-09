"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, EyeOff, Loader2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatARS, formatCUIT, formatFecha } from "@/lib/utils";
import type {
  DiagnosticoRecategorizacion,
  EstadoRecategorizacion,
} from "@/lib/parametros-fiscales";
import {
  aplicarCategoria,
  excluirDeRecategorizacion,
  guardarIngresosManuales,
} from "./actions";

export type FilaRecat = {
  id: string;
  razon_social: string;
  cuit: string;
  categoria_monotributo: string | null;
  fecha_ultima_recategorizacion: string | null;
  ingresos_12m_manual: number | null;
  ventas_12m: number;
  ingresos_considerados: number;
  ingresos_son_manuales: boolean;
  diagnostico: DiagnosticoRecategorizacion;
};

const ETIQUETA: Record<EstadoRecategorizacion, string> = {
  OK: "Al día",
  CERCA_DEL_TOPE: "Cerca del tope",
  DEBE_SUBIR: "Debe subir",
  PUEDE_BAJAR: "Puede bajar",
  EXCEDE_MONOTRIBUTO: "Excede el monotributo",
  SIN_DATOS: "Sin ingresos cargados",
};

const VARIANTE: Record<
  EstadoRecategorizacion,
  "success" | "warning" | "destructive" | "secondary" | "default"
> = {
  OK: "success",
  CERCA_DEL_TOPE: "warning",
  DEBE_SUBIR: "destructive",
  PUEDE_BAJAR: "default",
  EXCEDE_MONOTRIBUTO: "destructive",
  SIN_DATOS: "secondary",
};

/** Barra de consumo del tope de la categoría actual. */
function Barra({ uso }: { uso: number | null }) {
  if (uso === null) return null;
  const pct = Math.min(uso * 100, 100);
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full",
          uso >= 1
            ? "bg-destructive"
            : uso >= 0.9
            ? "bg-amber-500"
            : "bg-emerald-500"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function FilaRecategorizacion({ fila }: { fila: FilaRecat }) {
  const [pendiente, startTransition] = useTransition();
  const [manual, setManual] = useState(
    fila.ingresos_12m_manual !== null ? String(fila.ingresos_12m_manual) : ""
  );
  const d = fila.diagnostico;
  const debeActuar = d.estado === "DEBE_SUBIR" || d.estado === "PUEDE_BAJAR";

  return (
    <TableRow
      className={cn(
        d.estado === "DEBE_SUBIR" && "bg-destructive/5",
        d.estado === "EXCEDE_MONOTRIBUTO" && "bg-destructive/10"
      )}
    >
      <TableCell>
        <Link
          href={`/admin/clientes/${fila.id}`}
          className="font-medium hover:underline"
        >
          {fila.razon_social}
        </Link>
        <p className="text-xs tabular-nums text-muted-foreground">
          {formatCUIT(fila.cuit)}
        </p>
      </TableCell>

      <TableCell className="min-w-[12rem]">
        <p className="text-sm tabular-nums">
          {formatARS(fila.ingresos_considerados)}
        </p>
        <p className="text-xs text-muted-foreground">
          {fila.ingresos_son_manuales
            ? "cargado a mano"
            : `${formatARS(fila.ventas_12m)} en comprobantes`}
        </p>
        <Barra uso={d.usoDelTope} />
      </TableCell>

      <TableCell className="text-center">
        <Badge variant="secondary">{fila.categoria_monotributo ?? "—"}</Badge>
        {d.usoDelTope !== null ? (
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {Math.round(d.usoDelTope * 100)}% del tope
          </p>
        ) : null}
      </TableCell>

      <TableCell className="text-center">
        {d.categoriaSugerida ? (
          <Badge variant={debeActuar ? "default" : "secondary"}>
            {d.categoriaSugerida}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">fuera de escala</span>
        )}
        {debeActuar && d.diferenciaCuota !== 0 ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
            {d.diferenciaCuota > 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {formatARS(Math.abs(d.diferenciaCuota))}/mes
          </p>
        ) : null}
      </TableCell>

      <TableCell>
        <Badge variant={VARIANTE[d.estado]}>{ETIQUETA[d.estado]}</Badge>
        {fila.fecha_ultima_recategorizacion ? (
          <p className="mt-1 text-xs text-muted-foreground">
            última: {formatFecha(fila.fecha_ultima_recategorizacion)}
          </p>
        ) : null}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            value={manual}
            type="number"
            step="0.01"
            min={0}
            placeholder="Ingresos a mano"
            className="h-8 w-36 text-xs tabular-nums"
            onChange={(e) => setManual(e.target.value)}
            onBlur={() => {
              const actual =
                fila.ingresos_12m_manual !== null
                  ? String(fila.ingresos_12m_manual)
                  : "";
              if (manual !== actual) {
                startTransition(() => {
                  guardarIngresosManuales(
                    fila.id,
                    manual.trim() === "" ? null : Number(manual)
                  );
                });
              }
            }}
          />

          {debeActuar && d.categoriaSugerida ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pendiente}
              onClick={() =>
                startTransition(() => {
                  aplicarCategoria(fila.id, d.categoriaSugerida as string);
                })
              }
            >
              {pendiente ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Pasar a {d.categoriaSugerida}
            </Button>
          ) : null}

          <button
            type="button"
            title="No avisar más sobre este cliente"
            className="text-muted-foreground hover:text-foreground"
            onClick={() =>
              startTransition(() => {
                excluirDeRecategorizacion(fila.id);
              })
            }
          >
            <EyeOff className="h-4 w-4" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
