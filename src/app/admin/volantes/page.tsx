import { FileCheck2, QrCode, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { PanelVolantes } from "./panel";
import { FilaVolante, type FilaVolante as Fila } from "./fila";
import { mailConfigurado } from "@/lib/mail";
import { formatCUIT } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VolantesPage({
  searchParams,
}: {
  searchParams: { periodo?: string };
}) {
  const supabase = createClient();
  const periodo =
    searchParams.periodo && /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.periodo)
      ? searchParams.periodo
      : new Date().toISOString().slice(0, 7);

  const { data, error } = await supabase
    .from("volantes_pago")
    .select("*, clientes_estudio(razon_social, cuit, email_contacto, telefono_contacto)")
    .eq("periodo", periodo)
    .order("concepto")
    .order("cliente_id")
    // Las emisiones reemplazadas van debajo de la vigente del mismo cliente.
    .order("reemplazado")
    .order("emision", { ascending: false });

  const filas: Fila[] = ((data ?? []) as any[]).map((v) => ({
    id: v.id,
    cliente_id: v.cliente_id,
    concepto: v.concepto,
    periodo: v.periodo,
    periodo_desde: v.periodo_desde,
    periodo_hasta: v.periodo_hasta,
    fecha_calculo: v.fecha_calculo,
    fecha_vencimiento: v.fecha_vencimiento,
    numero_vep: v.numero_vep,
    importe_ars: Number(v.importe_ars ?? 0),
    categoria: v.categoria,
    path_archivo: v.path_archivo,
    mime_type: v.mime_type,
    enviado: v.enviado,
    canal_envio: v.canal_envio,
    pagado: v.pagado,
    reemplazado: v.reemplazado ?? false,
    emision: v.emision ?? 1,
    razon_social: v.clientes_estudio?.razon_social ?? "—",
    cuit: formatCUIT(v.clientes_estudio?.cuit ?? ""),
    email_contacto: v.clientes_estudio?.email_contacto ?? null,
    telefono_contacto: v.clientes_estudio?.telefono_contacto ?? null,
  }));

  // Los conteos miran solo las emisiones vigentes: una reemplazada ya no
  // cuenta como pendiente ni como enviada.
  const vigentes = filas.filter((f) => !f.reemplazado);
  const conArchivo = vigentes.filter((f) => f.path_archivo).length;
  const enviados = vigentes.filter((f) => f.enviado).length;
  const impagos = vigentes.filter((f) => !f.pagado).length;

  return (
    <div className="space-y-5">
      <PanelVolantes periodo={periodo} mailListo={mailConfigurado()} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Volantes del mes"
          valor={String(vigentes.length)}
          detalle={`Monotributo y autónomos · ${periodo}`}
          icon={FileCheck2}
        />
        <StatCard
          label="QR cargados"
          valor={`${conArchivo} / ${vigentes.length}`}
          detalle="Listos para enviar"
          icon={QrCode}
          tono={
            vigentes.length > 0 && conArchivo === vigentes.length
              ? "positivo"
              : "alerta"
          }
        />
        <StatCard
          label="Ya enviados"
          valor={`${enviados} / ${vigentes.length}`}
          detalle={`${impagos} sin confirmar el pago`}
          icon={Send}
          tono={
            vigentes.length > 0 && enviados === vigentes.length
              ? "positivo"
              : "neutro"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volantes de {periodo}</CardTitle>
          <CardDescription>
            «Período» va tanto en el desde como en el hasta de la pantalla de
            cálculo de deuda de la CCMA, y la fecha de cálculo la cambiás en la
            misma fila. Si ya generaste el VEP y hay que volver a sacarlo con
            otra fecha, usá «Regenerar con otra fecha»: la emisión anterior
            queda abajo, atenuada, de histórico. A la CCMA se entra con el CUIT y la clave fiscal del cliente
            —los tenés en su fila, y revelar la clave queda registrado en la
            auditoría—. Después generás el VEP con «Pago con QR», capturás el
            QR y lo subís acá; el importe y el número de VEP los podés corregir con lo
            que devuelva ARCA.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {error ? (
            <p className="px-6 pb-6 text-sm text-destructive">
              No se pudo cargar: {error.message}
            </p>
          ) : filas.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No hay volantes en {periodo}. Usá «Armar volantes del mes». Si no
              aparece ninguno, revisá que los clientes tengan marcados los
              aportes en su ficha.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Datos para la CCMA</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>VEP</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead>Enviar</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <FilaVolante key={f.id} f={f} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
