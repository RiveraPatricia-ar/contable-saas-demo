import { CloudDownload, Mail, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { PanelPreparar } from "./panel";
import { FilaEnvio, type FilaEnvio as Fila } from "./fila";
import { mailConfigurado } from "@/lib/mail";
import { RENTAS_DIAS } from "@/lib/constants";
import { urlConsultaRentas } from "@/lib/planes";

export const dynamic = "force-dynamic";

export default async function EnviosPage({
  searchParams,
}: {
  searchParams: { periodo?: string };
}) {
  const supabase = createClient();
  const periodo =
    searchParams.periodo && /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.periodo)
      ? searchParams.periodo
      : new Date().toISOString().slice(0, 7);

  const { data } = await supabase
    .from("cuotas_plan")
    .select(
      "*, planes_pago!inner(tipo_plan, numero_plan, cantidad_cuotas, origen, estado, rentas_tipo_pp, rentas_nro_pp, rentas_cod_validacion, clientes_estudio(razon_social, email_contacto, telefono_contacto))"
    )
    .eq("periodo", periodo)
    .eq("planes_pago.origen", "RENTAS")
    .eq("planes_pago.estado", "VIGENTE")
    .order("fecha_vencimiento");

  const filas: Fila[] = ((data ?? []) as any[]).map((c) => ({
    cuota_id: c.id,
    numero_cuota: c.numero_cuota,
    total_cuotas: c.planes_pago?.cantidad_cuotas ?? 0,
    fecha_vencimiento: c.fecha_vencimiento,
    importe_ars: Number(c.importe_ars ?? 0),
    path_pdf: c.path_pdf,
    boleta_url: c.boleta_url,
    url_consulta: c.planes_pago
      ? urlConsultaRentas({
          rentas_tipo_pp: c.planes_pago.rentas_tipo_pp,
          rentas_nro_pp: c.planes_pago.rentas_nro_pp,
          rentas_cod_validacion: c.planes_pago.rentas_cod_validacion,
        })
      : null,
    rentas_tipo_pp: c.planes_pago?.rentas_tipo_pp ?? null,
    rentas_nro_pp: c.planes_pago?.rentas_nro_pp ?? null,
    rentas_cod_validacion: c.planes_pago?.rentas_cod_validacion ?? null,
    enviada: c.enviada,
    canal_envio: c.canal_envio,
    fecha_envio: c.fecha_envio,
    razon_social: c.planes_pago?.clientes_estudio?.razon_social ?? "—",
    email_contacto: c.planes_pago?.clientes_estudio?.email_contacto ?? null,
    telefono_contacto: c.planes_pago?.clientes_estudio?.telefono_contacto ?? null,
    tipo_plan: c.planes_pago?.tipo_plan ?? "",
    numero_plan: c.planes_pago?.numero_plan ?? "",
  }));

  const descargadas = filas.filter((f) => f.path_pdf).length;
  const enviadas = filas.filter((f) => f.enviada).length;

  return (
    <div className="space-y-5">
      <PanelPreparar periodo={periodo} mailListo={mailConfigurado()} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Cuotas del mes"
          valor={String(filas.length)}
          detalle={`Planes de Rentas vigentes · ${periodo}`}
          icon={Send}
        />
        <StatCard
          label="Boletas descargadas"
          valor={`${descargadas} / ${filas.length}`}
          detalle="Guardadas en el sistema"
          icon={CloudDownload}
          tono={descargadas === filas.length ? "positivo" : "alerta"}
        />
        <StatCard
          label="Ya enviadas"
          valor={`${enviadas} / ${filas.length}`}
          detalle={`Se mandan el día ${RENTAS_DIAS.envio}`}
          icon={Mail}
          tono={enviadas === filas.length ? "positivo" : "neutro"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Envíos de {periodo}</CardTitle>
          <CardDescription>
            El formulario de Rentas no se autocompleta ni se puede saltear el
            captcha. «Bajar de Rentas» lo abre, y los botoncitos de al lado
            copian cada dato al portapapeles para pegarlo. Después descargás el
            PDF y lo subís acá. De ahí en más el envío
            por mail es automático; el de WhatsApp abre el chat con el mensaje
            escrito.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filas.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No hay cuotas de planes de Rentas en {periodo}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cuota</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Boleta</TableHead>
                  <TableHead>Enviar</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <FilaEnvio key={f.cuota_id} f={f} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
