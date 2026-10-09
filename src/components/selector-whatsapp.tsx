"use client";

import { useEffect, useState } from "react";
import { Monitor, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  guardarDestino,
  leerDestino,
  type DestinoWhatsApp,
} from "@/lib/whatsapp";

/** Elige si los envíos van por WhatsApp Web o por la app de escritorio. */
export function SelectorWhatsApp() {
  const [destino, setDestino] = useState<DestinoWhatsApp>("web");

  // Se lee recién en el cliente: el servidor no tiene acceso a localStorage.
  useEffect(() => setDestino(leerDestino()), []);

  function elegir(d: DestinoWhatsApp) {
    setDestino(d);
    guardarDestino(d);
  }

  const opciones: { valor: DestinoWhatsApp; etiqueta: string; icono: typeof Globe }[] = [
    { valor: "web", etiqueta: "WhatsApp Web", icono: Globe },
    { valor: "app", etiqueta: "App de escritorio", icono: Monitor },
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Enviar por WhatsApp con</p>
      <div className="inline-flex rounded-lg border p-0.5">
        {opciones.map(({ valor, etiqueta, icono: Icono }) => (
          <button
            key={valor}
            type="button"
            onClick={() => elegir(valor)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              destino === valor
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icono className="h-3.5 w-3.5" />
            {etiqueta}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {destino === "web"
          ? "Todos los envíos usan la misma pestaña de WhatsApp Web, sin pantalla intermedia."
          : "La primera vez Chrome pregunta «¿Abrir WhatsApp?»: tildá «Siempre permitir» y no vuelve a preguntar."}
      </p>
    </div>
  );
}
