"use client";

import { useState, useTransition } from "react";
import { Check, Download, Loader2, Pencil, Upload, X } from "lucide-react";
import { cambiarEstadoDDJJ, guardarImporteVep, subirPdfDDJJ, urlFirmada } from "./actions";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatARS, formatCUIT, formatFecha } from "@/lib/utils";
import { ETIQUETAS_ESTADO } from "@/lib/constants";
import type { ClienteEstudio, DeclaracionJurada } from "@/types/database";

type DDJJConCliente = DeclaracionJurada & {
  clientes_estudio: Pick<ClienteEstudio, "razon_social" | "cuit"> | null;
};

function BotonDescarga({ path, label }: { path: string; label: string }) {
  const [pendiente, startTransition] = useTransition();

  function abrir() {
    startTransition(async () => {
      const url = await urlFirmada(path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={abrir} disabled={pendiente}>
      {pendiente ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}

function SubirPdf({
  ddjjId,
  clienteId,
  tipo,
}: {
  ddjjId: string;
  clienteId: string;
  tipo: "vep" | "acuse";
}) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const fd = new FormData();
    fd.set("ddjj_id", ddjjId);
    fd.set("cliente_id", clienteId);
    fd.set("tipo", tipo);
    fd.set("archivo", archivo);

    startTransition(async () => {
      const res = await subirPdfDDJJ(fd);
      setError(res.error ?? null);
    });
    e.target.value = "";
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
      {pendiente ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Upload className="h-3.5 w-3.5" />
      )}
      {tipo === "vep" ? "VEP" : "Acuse"}
      <input
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={onChange}
        disabled={pendiente}
      />
      {error && <span className="text-destructive">{error}</span>}
    </label>
  );
}

/** Importe del VEP: se hace clic y se edita en la misma celda. */
function ImporteVep({ ddjj }: { ddjj: DDJJConCliente }) {
  const actual = ddjj.monto_vep_ars || ddjj.monto_impuesto_ars || 0;
  const [editando, setEditando] = useState(false);
  const [importe, setImporte] = useState(actual ? String(actual).replace(".", ",") : "");
  const [codigo, setCodigo] = useState(ddjj.codigo_vep ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function guardar() {
    startTransition(async () => {
      const r = await guardarImporteVep(ddjj.id, importe, codigo);
      if (r.error) setError(r.error);
      else {
        setError(null);
        setEditando(false);
      }
    });
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        title="Cargar o corregir el importe del VEP"
        className="group inline-flex flex-col items-end rounded-md px-1.5 py-1 hover:bg-muted"
      >
        <span className="inline-flex items-center gap-1.5">
          <Pencil className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100" />
          <span
            className={
              actual < 0 ? "text-emerald-600" : actual ? "" : "text-muted-foreground"
            }
          >
            {formatARS(actual)}
          </span>
        </span>
        {actual < 0 && (
          <span className="text-xs text-emerald-600">saldo a favor</span>
        )}
        {ddjj.codigo_vep && (
          <span className="text-xs text-muted-foreground">#{ddjj.codigo_vep}</span>
        )}
      </button>
    );
  }

  return (
    <form
      className="ml-auto flex w-40 flex-col items-end gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <Input
        autoFocus
        inputMode="decimal"
        placeholder="Importe (− si es a favor)"
        value={importe}
        onChange={(e) => setImporte(e.target.value)}
        className="h-8 text-right text-sm tabular-nums"
        aria-label="Importe del VEP"
      />
      <Input
        placeholder="N° de VEP (opcional)"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        className="h-8 text-right text-xs"
        aria-label="Número de VEP"
      />
      <div className="flex gap-1">
        <Button type="submit" size="sm" className="h-7 px-2" disabled={pendiente}>
          {pendiente ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Guardar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => {
            setEditando(false);
            setError(null);
          }}
          aria-label="Cancelar"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}

export function FilaDDJJ({ ddjj }: { ddjj: DDJJConCliente }) {
  const [pendiente, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{ddjj.clientes_estudio?.razon_social ?? "—"}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {formatCUIT(ddjj.clientes_estudio?.cuit)}
        </p>
      </TableCell>
      <TableCell className="text-sm">
        {ddjj.impuesto_tipo}
        <span className="ml-1.5 text-xs text-muted-foreground">{ddjj.organismo}</span>
      </TableCell>
      <TableCell className="text-sm tabular-nums">{ddjj.periodo_fiscal}</TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {formatFecha(ddjj.fecha_vencimiento)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <ImporteVep ddjj={ddjj} />
      </TableCell>
      <TableCell>
        <Select
          className="h-8 w-40 text-xs"
          value={ddjj.estado}
          disabled={pendiente}
          onChange={(e) => {
            const nuevo = e.target.value;
            startTransition(() => cambiarEstadoDDJJ(ddjj.id, nuevo));
          }}
        >
          {Object.entries(ETIQUETAS_ESTADO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          {ddjj.path_pdf_vep ? (
            <BotonDescarga path={ddjj.path_pdf_vep} label="VEP" />
          ) : (
            <SubirPdf ddjjId={ddjj.id} clienteId={ddjj.cliente_id} tipo="vep" />
          )}
          {ddjj.path_pdf_acuse ? (
            <BotonDescarga path={ddjj.path_pdf_acuse} label="Acuse" />
          ) : (
            <SubirPdf ddjjId={ddjj.id} clienteId={ddjj.cliente_id} tipo="acuse" />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
