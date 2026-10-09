"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Download,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Upload,
} from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatARS, formatFecha } from "@/lib/utils";
import { mensajeWhatsApp } from "@/lib/mensajes";
import { abrirWhatsApp, numeroWhatsApp } from "@/lib/whatsapp";
import {
  enviarBoletaPorMail,
  marcarEnviadaPorWhatsApp,
  subirBoletaManual,
  urlBoletaGuardada,
  type EnvioState,
} from "./actions";

/**
 * Dato del plan con copiado al portapapeles. El formulario de Rentas no se
 * autocompleta desde la dirección, así que hay que pegar los valores a mano.
 */
function DatoCopiable({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      title={`Copiar ${etiqueta}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(valor);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1200);
        } catch {
          setCopiado(false);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors",
        copiado
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-input text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className="opacity-70">{etiqueta}</span>
      <span className="font-medium tabular-nums">{valor}</span>
      {copiado ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

/** El botón va aparte: useFormStatus solo lee el estado desde dentro del form. */
function BotonSubir() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Upload className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

/** Subida del PDF que se bajó a mano del sitio de Rentas. */
function SubirBoleta({ cuotaId }: { cuotaId: string }) {
  const [state, action] = useFormState(subirBoletaManual, {} as EnvioState);

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="cuota_id" value={cuotaId} />
      <Input
        type="file"
        name="archivo"
        accept="application/pdf"
        required
        className="h-8 w-40 text-xs file:mr-2 file:text-xs"
      />
      <BotonSubir />
      {state?.error ? (
        <span className="text-xs text-destructive">{state?.error}</span>
      ) : null}
    </form>
  );
}

export type FilaEnvio = {
  cuota_id: string;
  numero_cuota: number;
  total_cuotas: number;
  fecha_vencimiento: string;
  importe_ars: number;
  path_pdf: string | null;
  boleta_url: string | null;
  enviada: boolean;
  url_consulta: string | null;
  rentas_tipo_pp: string | null;
  rentas_nro_pp: string | null;
  rentas_cod_validacion: string | null;
  canal_envio: string | null;
  fecha_envio: string | null;
  razon_social: string;
  email_contacto: string | null;
  telefono_contacto: string | null;
  tipo_plan: string;
  numero_plan: string;
};

export function FilaEnvio({ f }: { f: FilaEnvio }) {
  const [pendiente, startTransition] = useTransition();
  const [enviada, setEnviada] = useState(f.enviada);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const datos = {
    razonSocial: f.razon_social,
    tipoPlan: f.tipo_plan,
    numeroPlan: f.numero_plan,
    numeroCuota: f.numero_cuota,
    totalCuotas: f.total_cuotas,
    vencimiento: f.fecha_vencimiento,
    importe: Number(f.importe_ars ?? 0),
  };

  const wa = numeroWhatsApp(f.telefono_contacto);

  async function abrirPdf() {
    if (!f.path_pdf) return;
    const url = await urlBoletaGuardada(f.path_pdf);
    if (url) window.open(url, "_blank", "noopener");
    else setError("No se pudo abrir el PDF guardado.");
  }

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium leading-tight">{f.razon_social}</p>
        <p className="text-xs text-muted-foreground">
          {f.tipo_plan} · N° {f.numero_plan}
        </p>
      </TableCell>

      <TableCell className="whitespace-nowrap text-sm">
        cuota {f.numero_cuota}/{f.total_cuotas}
        <span className="block text-xs text-muted-foreground">
          vence {formatFecha(f.fecha_vencimiento)}
        </span>
      </TableCell>

      <TableCell className="text-right text-sm tabular-nums">
        {formatARS(f.importe_ars)}
      </TableCell>

      <TableCell>
        {f.path_pdf ? (
          <Button variant="outline" size="sm" onClick={abrirPdf}>
            <Download className="h-3.5 w-3.5" />
            Boleta
          </Button>
        ) : (
          <div className="space-y-1.5">
            {f.url_consulta ? (
              <>
                <a
                  href={f.url_consulta}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Bajar de Rentas
                </a>
                <div className="flex flex-wrap items-center gap-1">
                  {f.rentas_tipo_pp ? (
                    <DatoCopiable etiqueta="tipo" valor={f.rentas_tipo_pp} />
                  ) : null}
                  {f.rentas_nro_pp ? (
                    <DatoCopiable etiqueta="nº" valor={f.rentas_nro_pp} />
                  ) : null}
                  {f.rentas_cod_validacion ? (
                    <DatoCopiable
                      etiqueta="valid."
                      valor={f.rentas_cod_validacion}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Faltan los datos del plan
              </span>
            )}
            <SubirBoleta cuotaId={f.cuota_id} />
          </div>
        )}
      </TableCell>

      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pendiente || !f.path_pdf || !f.email_contacto}
            title={
              !f.email_contacto
                ? "El cliente no tiene mail cargado"
                : !f.path_pdf
                ? "Primero hay que descargar la boleta"
                : `Enviar a ${f.email_contacto}`
            }
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const r = await enviarBoletaPorMail(f.cuota_id);
                if (r.error) setError(r.error);
                else {
                  setEnviada(true);
                  setAviso(r.mensaje ?? "Enviado.");
                }
              })
            }
          >
            {pendiente ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Mail
          </Button>

          {wa ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                abrirWhatsApp(wa, mensajeWhatsApp(datos, f.boleta_url));
                startTransition(async () => {
                  await marcarEnviadaPorWhatsApp(f.cuota_id);
                  setEnviada(true);
                });
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              sin teléfono
            </span>
          )}
        </div>

        {error ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
        {aviso ? (
          <p className="mt-1.5 text-xs text-emerald-600">{aviso}</p>
        ) : null}
      </TableCell>

      <TableCell>
        <Badge variant={enviada ? "success" : "secondary"}>
          {enviada ? (
            <>
              <Check className="h-3 w-3" />
              {f.canal_envio === "EMAIL"
                ? "Por mail"
                : f.canal_envio === "WHATSAPP"
                ? "Por WhatsApp"
                : "Enviada"}
            </>
          ) : (
            "Sin enviar"
          )}
        </Badge>
        {f.fecha_envio ? (
          <p className={cn("mt-1 text-xs text-muted-foreground")}>
            {formatFecha(f.fecha_envio)}
          </p>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
