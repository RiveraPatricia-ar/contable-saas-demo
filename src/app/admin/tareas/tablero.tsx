"use client";

import { useTransition } from "react";
import { CalendarClock, User } from "lucide-react";
import { cambiarEstadoTarea } from "./actions";
import type { TareaConRelaciones } from "./page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { formatFecha, diasHasta } from "@/lib/utils";

const COLUMNAS = [
  { estado: "PENDIENTE", titulo: "Pendiente" },
  { estado: "EN_PROCESO", titulo: "En proceso" },
  { estado: "PRESENTADO", titulo: "Presentado" },
  { estado: "FINALIZADO", titulo: "Finalizado" },
] as const;

const PRIORIDAD_VARIANTE = {
  BAJA: "secondary",
  MEDIA: "default",
  ALTA: "warning",
  URGENTE: "destructive",
} as const;

export function TableroTareas({ tareas }: { tareas: TareaConRelaciones[] }) {
  const [pendiente, startTransition] = useTransition();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNAS.map((col) => {
        const items = tareas.filter((t) => t.estado === col.estado);
        return (
          <Card key={col.estado} className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                {col.titulo}
                <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Sin tareas
                </p>
              )}
              {items.map((t) => {
                const dias = t.fecha_limite ? diasHasta(t.fecha_limite) : null;
                return (
                  <div key={t.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">{t.titulo}</p>
                      <Badge variant={PRIORIDAD_VARIANTE[t.prioridad]}>
                        {t.prioridad.toLowerCase()}
                      </Badge>
                    </div>

                    {t.clientes_estudio?.razon_social && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t.clientes_estudio.razon_social}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {t.profiles?.nombre_completo && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {t.profiles.nombre_completo}
                        </span>
                      )}
                      {t.fecha_limite && (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            dias !== null && dias < 0 ? "text-destructive" : ""
                          }`}
                        >
                          <CalendarClock className="h-3 w-3" />
                          {formatFecha(t.fecha_limite)}
                        </span>
                      )}
                    </div>

                    <Select
                      className="mt-3 h-8 text-xs"
                      value={t.estado}
                      disabled={pendiente}
                      onChange={(e) => {
                        const nuevo = e.target.value;
                        startTransition(() => cambiarEstadoTarea(t.id, nuevo));
                      }}
                    >
                      {COLUMNAS.map((c) => (
                        <option key={c.estado} value={c.estado}>
                          {c.titulo}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
