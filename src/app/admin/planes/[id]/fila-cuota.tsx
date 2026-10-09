"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Loader2, Send } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatARS, formatFecha } from "@/lib/utils";
import { ETIQUETAS_ESTADO_CUOTA } from "@/lib/constants";
import { actualizarCuota, marcarCuotaEnviada, marcarCuotaPagada } from "../actions";
import type { CuotaPlan, EstadoCuota } from "@/types/database";

const VARIANTE: Record<EstadoCuota, "secondary" | "default" | "success" | "destructive"> = {
  PENDIENTE: "secondary",
  ENVIADA: "default",
  PAGADA: "success",
  VENCIDA: "destructive",
};

export function FilaCuota({
  cuota,
  planId,
  boletaUrl,
  esArca,
}: {
  cuota: CuotaPlan;
  planId: string;
  boletaUrl: string | null;
  esArca: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [pagada, setPagada] = useState(cuota.estado === "PAGADA");
  const [enviada, setEnviada] = useState(cuota.enviada);
  const [importe, setImporte] = useState(String(cuota.importe_ars ?? 0));
  const [vep, setVep] = useState(cuota.vep_codigo ?? "");

  const url = cuota.boleta_url ?? boletaUrl;

  return (
    <TableRow className={cn(cuota.estado === "VENCIDA" && "bg-destructive/5")}>
      <TableCell className="tabular-nums">{cuota.numero_cuota}</TableCell>

      <TableCell className="whitespace-nowrap text-sm">
        {formatFecha(cuota.fecha_vencimiento)}
        {esArca && cuota.fecha_vencimiento_2 ? (
          <span className="block text-xs text-muted-foreground">
            2º {formatFecha(cuota.fecha_vencimiento_2)}
          </span>
        ) : null}
      </TableCell>

      <TableCell className="text-right">
        <Input
          value={importe}
          type="number"
          step="0.01"
          className="h-8 w-28 text-right text-xs tabular-nums"
          onChange={(e) => setImporte(e.target.value)}
          onBlur={() => {
            if (Number(importe) !== Number(cuota.importe_ars)) {
              startTransition(() => {
                actualizarCuota(cuota.id, planId, {
                  importe_ars: Number(importe) || 0,
                });
              });
            }
          }}
        />
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {formatARS(Number(importe) || 0)}
        </span>
      </TableCell>

      <TableCell>
        <Input
          value={vep}
          placeholder={esArca ? "Código de VEP" : "Nº de boleta"}
          className="h-8 w-36 text-xs"
          onChange={(e) => setVep(e.target.value)}
          onBlur={() => {
            if (vep !== (cuota.vep_codigo ?? "")) {
              startTransition(() => {
                actualizarCuota(cuota.id, planId, {
                  vep_codigo: vep.trim() || null,
                  vep_generado: vep.trim().length > 0,
                });
              });
            }
          }}
        />
      </TableCell>

      <TableCell>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Boleta
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Enviada al cliente"
            disabled={pendiente}
            onClick={() => {
              const v = !enviada;
              setEnviada(v);
              startTransition(async () => {
                const r = await marcarCuotaEnviada(cuota.id, planId, v);
                if (r?.error) setEnviada(!v);
              });
            }}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md border transition-colors",
              enviada
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-input text-muted-foreground hover:bg-muted"
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Cuota pagada"
            disabled={pendiente}
            onClick={() => {
              const v = !pagada;
              setPagada(v);
              startTransition(async () => {
                const r = await marcarCuotaPagada(cuota.id, planId, v);
                if (r?.error) setPagada(!v);
              });
            }}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md border transition-colors",
              pagada
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "border-input text-muted-foreground hover:bg-muted"
            )}
          >
            {pendiente ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant={VARIANTE[pagada ? "PAGADA" : cuota.estado]}>
          {ETIQUETAS_ESTADO_CUOTA[pagada ? "PAGADA" : cuota.estado]}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
