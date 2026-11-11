"use client";

import { useState, useTransition } from "react";
import { FileText, Pencil, CalendarPlus } from "lucide-react";
import { actualizarDescripcionTarea } from "./actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function hoy() {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function DescripcionTarea({
  id,
  descripcion,
}: {
  id: string;
  descripcion: string | null;
}) {
  const [abierta, setAbierta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(descripcion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();

  const tiene = !!descripcion?.trim();

  function empezarEdicion() {
    setTexto(descripcion ?? "");
    setError(null);
    setAbierta(true);
    setEditando(true);
  }

  function agregarFecha() {
    setTexto((t) => (t.trim() ? `${t.replace(/\s+$/, "")}\n\n${hoy()}: ` : `${hoy()}: `));
  }

  function guardar() {
    startTransition(async () => {
      const res = await actualizarDescripcionTarea(id, texto);
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditando(false);
      setAbierta(true);
    });
  }

  if (editando) {
    return (
      <div className="mt-2 space-y-2">
        <Textarea
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          className="text-xs"
          placeholder="Detalle de la tarea…"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="h-7 px-2 text-xs" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setEditando(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 px-2 text-xs"
            onClick={agregarFecha}
            disabled={guardando}
            title="Agregar una nota con la fecha de hoy al final"
          >
            <CalendarPlus className="h-3 w-3" />
            Nota con fecha
          </Button>
        </div>
      </div>
    );
  }

  if (!tiene) {
    return (
      <button
        type="button"
        onClick={empezarEdicion}
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3 w-3" />
        Agregar descripción
      </button>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setAbierta((a) => !a)}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <FileText className="h-3 w-3" />
          {abierta ? "Ocultar descripción" : "Ver descripción"}
        </button>
        <button
          type="button"
          onClick={empezarEdicion}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
          Editar
        </button>
      </div>
      {abierta && (
        <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs leading-relaxed">
          {descripcion}
        </p>
      )}
    </div>
  );
}
