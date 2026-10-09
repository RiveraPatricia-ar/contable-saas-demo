"use client";

import { useTransition } from "react";
import { cambiarEstadoHonorario } from "./actions";
import type { HonorarioConCliente } from "./page";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { formatARS, formatCUIT, formatFecha } from "@/lib/utils";

const ESTADOS = [
  ["BORRADOR", "Borrador"],
  ["EMITIDA", "Emitida"],
  ["COBRADA", "Cobrada"],
  ["VENCIDA", "Vencida"],
  ["ANULADA", "Anulada"],
] as const;

export function FilaHonorario({ honorario }: { honorario: HonorarioConCliente }) {
  const [pendiente, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">
          {honorario.clientes_estudio?.razon_social ?? "—"}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {formatCUIT(honorario.clientes_estudio?.cuit)}
        </p>
      </TableCell>
      <TableCell className="tabular-nums">{honorario.periodo_fiscal}</TableCell>
      <TableCell className="text-sm">{honorario.concepto}</TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {formatFecha(honorario.fecha_vencimiento)}
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {formatARS(honorario.monto_ars)}
      </TableCell>
      <TableCell>
        <Select
          className="h-8 w-32 text-xs"
          value={honorario.estado}
          disabled={pendiente}
          onChange={(e) => {
            const nuevo = e.target.value;
            startTransition(() => cambiarEstadoHonorario(honorario.id, nuevo));
          }}
        >
          {ESTADOS.map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </TableCell>
    </TableRow>
  );
}
