"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  Loader2,
  Mail,
  MessageCircle,
  RotateCcw,
  Upload,
} from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatARS, formatFecha } from "@/lib/utils";
import { ETIQUETAS_CONCEPTO } from "@/lib/constants";
import { mensajeVolanteWhatsApp } from "@/lib/mensajes";
import { abrirWhatsApp, numeroWhatsApp } from "@/lib/whatsapp";
import { AccesoArca } from "@/components/acceso-arca";
import {
  actualizarVolante,
  enviarVolantePorMail,
  marcarVolanteEnviado,
  marcarVolantePagado,
  nuevaEmision,
  subirVolante,
  urlVolante,
  type VolanteState,
} from "./actions";

export type FilaVolante = {
  id: string;
  cliente_id: string;
  concepto: "MONOTRIBUTO" | "AUTONOMO";
  periodo: string;
  periodo_desde: string | null;
  periodo_hasta: string | null;
  fecha_calculo: string | null;
  fecha_vencimiento: string;
  numero_vep: string | null;
  importe_ars: number;
  categoria: string | null;
  path_archivo: string | null;
  mime_type: string | null;
  enviado: boolean;
  canal_envio: string | null;
  pagado: boolean;
  reemplazado: boolean;
  emision: number;
  razon_social: string;
  cuit: string;
  email_contacto: string | null;
  telefono_contacto: string | null;
};

/**
 * Baja la imagen guardada y la devuelve como PNG. El portapapeles de los
 * navegadores solo acepta imágenes en PNG, así que un JPG hay que convertirlo.
 */
async function imagenComoPng(path: string): Promise<Blob> {
  const url = await urlVolante(path);
  if (!url) throw new Error("No se pudo obtener el archivo.");

  const original = await (await fetch(url)).blob();
  if (original.type === "image/png") return original;

  const bitmap = await createImageBitmap(original);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo convertir la imagen."))),
      "image/png"
    )
  );
}

/** Valor con copiado al portapapeles, para pegarlo en la CCMA. */
function Copiable({ etiqueta, valor }: { etiqueta: string; valor: string }) {
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
      {copiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-50" />}
    </button>
  );
}

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

/** Subida del QR capturado o del PDF del VEP. */
function SubirArchivo({ volanteId }: { volanteId: string }) {
  const [state, action] = useFormState(subirVolante, {} as VolanteState);
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="volante_id" value={volanteId} />
      <Input
        type="file"
        name="archivo"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        required
        className="h-8 w-36 text-xs file:mr-2 file:text-xs"
      />
      <BotonSubir />
      {state?.error ? (
        <span className="text-xs text-destructive">{state?.error}</span>
      ) : null}
    </form>
  );
}

export function FilaVolante({ f }: { f: FilaVolante }) {
  const [pendiente, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(f.enviado);
  const [pagado, setPagado] = useState(f.pagado);
  const [importe, setImporte] = useState(String(f.importe_ars ?? 0));
  const [vep, setVep] = useState(f.numero_vep ?? "");
  const [fecha, setFecha] = useState(f.fecha_calculo ?? "");
  const [regenerando, setRegenerando] = useState(false);
  const [fechaNueva, setFechaNueva] = useState(hoyMas(5));

  // Una vez generado el VEP en ARCA, la fecha de esa emisión ya no se toca:
  // si hace falta otra fecha, se crea una emisión nueva y esta queda de
  // histórico. Antes de eso, la fecha se edita libremente.
  const yaGenerado = Boolean(f.numero_vep || f.path_archivo);
  const bloqueado = f.reemplazado;
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const esImagen = (f.mime_type ?? "").startsWith("image/");

  const datos = {
    razonSocial: f.razon_social,
    concepto: f.concepto,
    periodo: f.periodo,
    vencimiento: f.fecha_vencimiento,
    importe: Number(importe) || 0,
    numeroVep: vep || null,
    fechaCalculo: f.fecha_calculo,
  };

  const wa = numeroWhatsApp(f.telefono_contacto);

  /**
   * WhatsApp no deja adjuntar archivos desde un link, solo texto. Para que
   * el QR llegue igual, se copia la imagen al portapapeles y se abre el chat:
   * la persona pega con Ctrl+V y envía.
   *
   * Las dos cosas se disparan en el mismo clic, sin esperar nada antes: si no,
   * el navegador bloquea tanto el portapapeles como la ventana nueva.
   */
  function enviarPorWhatsApp(numero: string) {
    setError(null);
    setAviso(null);

    if (f.path_archivo && esImagen && "ClipboardItem" in window) {
      const png = imagenComoPng(f.path_archivo);
      navigator.clipboard
        .write([new ClipboardItem({ "image/png": png })])
        .then(() =>
          setAviso("QR copiado. En el chat pegalo con Ctrl+V y envialo.")
        )
        .catch(() =>
          setError(
            "No se pudo copiar el QR. Descargalo con «Ver QR» y adjuntalo a mano."
          )
        );
    } else if (f.path_archivo && !esImagen) {
      setAviso(
        "Es un PDF: WhatsApp no lo toma pegado. Descargalo con «Ver QR» y arrastralo al chat."
      );
    }

    abrirWhatsApp(numero, mensajeVolanteWhatsApp(datos));

    startTransition(async () => {
      await marcarVolanteEnviado(f.id);
      setEnviado(true);
    });
  }


  async function verArchivo() {
    if (!f.path_archivo) return;
    const url = await urlVolante(f.path_archivo);
    if (url) window.open(url, "_blank", "noopener");
    else setError("No se pudo abrir el archivo.");
  }

  return (
    <TableRow
      className={cn(
        pagado && "opacity-70",
        bloqueado && "bg-muted/40 opacity-60"
      )}
    >
      <TableCell>
        <p className="font-medium leading-tight">{f.razon_social}</p>
        <p className="text-xs tabular-nums text-muted-foreground">{f.cuit}</p>
        <div className="mt-1">
          <AccesoArca clienteId={f.cliente_id} cuit={f.cuit} />
        </div>
      </TableCell>

      <TableCell>
        <Badge variant={f.concepto === "MONOTRIBUTO" ? "default" : "secondary"}>
          {ETIQUETAS_CONCEPTO[f.concepto]}
        </Badge>
        {f.categoria ? (
          <span className="ml-1.5 text-xs text-muted-foreground">
            cat. {f.categoria}
          </span>
        ) : null}
      </TableCell>

      {/* Datos para pegar en la pantalla "Cálculo de deuda a fecha" */}
      <TableCell className="min-w-[15rem]">
        <div className="flex flex-wrap items-center gap-1">
          {/* El "desde" y el "hasta" son siempre el período que se paga. */}
          <Copiable etiqueta="período" valor={mmAaaa(f.periodo)} />
          {fecha ? (
            <Copiable etiqueta="cálculo" valor={ddMmAaaa(fecha)} />
          ) : null}
        </div>

        {bloqueado ? null : !yaGenerado ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">cálculo</span>
            <Input
              type="date"
              value={fecha}
              className="h-7 w-36 text-xs"
              onChange={(e) => {
                const v = e.target.value;
                setFecha(v);
                if (v && v !== f.fecha_calculo) {
                  startTransition(() => {
                    actualizarVolante(f.id, { fecha_calculo: v });
                  });
                }
              }}
            />
          </div>
        ) : regenerando ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Input
              type="date"
              value={fechaNueva}
              className="h-7 w-36 text-xs"
              onChange={(e) => setFechaNueva(e.target.value)}
            />
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={pendiente || !fechaNueva}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const r = await nuevaEmision(f.id, fechaNueva);
                  if (r.error) setError(r.error);
                  else setRegenerando(false);
                })
              }
            >
              Crear emisión
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setRegenerando(false)}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-7 px-1.5 text-xs"
            disabled={pagado}
            title={
              pagado
                ? "Está pagado"
                : "Volver a generar el mismo período con otra fecha de cálculo"
            }
            onClick={() => setRegenerando(true)}
          >
            <RotateCcw className="h-3 w-3" />
            Regenerar con otra fecha
          </Button>
        )}

        <p className="mt-1 text-xs text-muted-foreground">
          vence {formatFecha(f.fecha_vencimiento)}
          {f.emision > 1 ? ` · emisión ${f.emision}` : ""}
        </p>
      </TableCell>

      <TableCell className="text-right">
        <Input
          value={importe}
          type="number"
          step="0.01"
          disabled={bloqueado}
          className="h-8 w-28 text-right text-xs tabular-nums"
          onChange={(e) => setImporte(e.target.value)}
          onBlur={() => {
            if (Number(importe) !== Number(f.importe_ars)) {
              startTransition(() => {
                actualizarVolante(f.id, { importe_ars: Number(importe) || 0 });
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
          placeholder="N° de VEP"
          disabled={bloqueado}
          className="h-8 w-32 text-xs tabular-nums"
          onChange={(e) => setVep(e.target.value)}
          onBlur={() => {
            if (vep !== (f.numero_vep ?? "")) {
              startTransition(() => {
                actualizarVolante(f.id, { numero_vep: vep.trim() || null });
              });
            }
          }}
        />
      </TableCell>

      <TableCell>
        {f.path_archivo ? (
          <Button variant="outline" size="sm" onClick={verArchivo}>
            <Eye className="h-3.5 w-3.5" />
            Ver QR
          </Button>
        ) : bloqueado ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <SubirArchivo volanteId={f.id} />
        )}
      </TableCell>

      <TableCell>
        {bloqueado ? (
          <Badge variant="secondary">
            Reemplazada
          </Badge>
        ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pendiente || !f.path_archivo || !f.email_contacto}
            title={
              !f.email_contacto
                ? "El cliente no tiene mail cargado"
                : !f.path_archivo
                ? "Primero subí el QR"
                : `Enviar a ${f.email_contacto}`
            }
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const r = await enviarVolantePorMail(f.id);
                if (r.error) setError(r.error);
                else setEnviado(true);
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
              disabled={!f.path_archivo}
              title={
                !f.path_archivo
                  ? "Primero subí el QR"
                  : esImagen
                  ? "Copia el QR y abre el chat: pegalo con Ctrl+V"
                  : "Abre el chat; el PDF se adjunta a mano"
              }
              onClick={() => enviarPorWhatsApp(wa)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">sin teléfono</span>
          )}
        </div>
        )}

        {error ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
        {aviso ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-emerald-600">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {aviso}
          </p>
        ) : null}
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          <Badge variant={enviado ? "success" : "secondary"}>
            {enviado
              ? f.canal_envio === "EMAIL"
                ? "Por mail"
                : f.canal_envio === "WHATSAPP"
                ? "Por WhatsApp"
                : "Enviado"
              : "Sin enviar"}
          </Badge>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs transition-colors",
              pagado
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "border-input text-muted-foreground hover:bg-muted"
            )}
            onClick={() => {
              const v = !pagado;
              setPagado(v);
              startTransition(async () => {
                const r = await marcarVolantePagado(f.id, v);
                if (r.error) setPagado(!v);
              });
            }}
          >
            <Check className={cn("h-3 w-3", !pagado && "opacity-30")} />
            {pagado ? "Pagado" : "Impago"}
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Hoy más N días, AAAA-MM-DD, en hora local. */
function hoyMas(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** AAAA-MM -> MM/AAAA, que es como lo pide la CCMA. */
function mmAaaa(periodo: string): string {
  const [anio, mes] = periodo.split("-");
  return `${mes}/${anio}`;
}

/** AAAA-MM-DD -> DD/MM/AAAA. */
function ddMmAaaa(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}
