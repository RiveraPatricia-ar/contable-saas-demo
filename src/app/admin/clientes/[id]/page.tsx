import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "../cliente-form";
import { actualizarCliente } from "../actions";
import { ClaveRevelable } from "./clave-revelable";
import { Vinculos, type VinculoFila } from "./vinculos";
import { ImpuestosDelMes } from "./impuestos-del-mes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCUIT } from "@/lib/utils";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClienteEstudio } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ClienteDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { periodo?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("clientes_estudio")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) notFound();
  const cliente = data as ClienteEstudio;

  const esSociedad = cliente.tipo_persona === "JURIDICA";
  const campos = "id, razon_social, cuit, forma_juridica";

  const [vincRes, candidatosRes] = await Promise.all([
    esSociedad
      ? supabase
          .from("vinculos_cliente")
          .select(`id, rol_vinculo, participacion, otro:persona_id(${campos})`)
          .eq("sociedad_id", cliente.id)
      : supabase
          .from("vinculos_cliente")
          .select(`id, rol_vinculo, participacion, otro:sociedad_id(${campos})`)
          .eq("persona_id", cliente.id),
    supabase
      .from("clientes_estudio")
      .select("id, razon_social, cuit")
      .eq("tipo_persona", "JURIDICA")
      .eq("estado_activo", true)
      .order("razon_social"),
  ]);

  const vinculos = (vincRes.data ?? []) as unknown as VinculoFila[];
  const candidatos = (candidatosRes.data ?? []) as {
    id: string;
    razon_social: string;
    cuit: string;
  }[];

  const actualizar = actualizarCliente.bind(null, cliente.id);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/admin/clientes" className="text-sm text-primary hover:underline">
          ← Volver a clientes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">
            {cliente.razon_social}
          </h2>
          <Badge variant={cliente.estado_activo ? "success" : "secondary"}>
            {cliente.estado_activo ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm tabular-nums text-muted-foreground">
            CUIT {formatCUIT(cliente.cuit)}
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/clientes/exportar?id=${cliente.id}`}>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar ficha
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claves guardadas</CardTitle>
          <CardDescription>
            Revelar una clave queda asentado en el registro de auditoría con tu
            usuario y la fecha.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ClaveRevelable clienteId={cliente.id} campo="afip" label="Clave Fiscal AFIP" />
          <ClaveRevelable clienteId={cliente.id} campo="arba_agip" label="Clave ARBA / AGIP" />
        </CardContent>
      </Card>

      <ImpuestosDelMes
        clienteId={cliente.id}
        periodo={
          searchParams.periodo &&
          /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.periodo)
            ? searchParams.periodo
            : new Date().toISOString().slice(0, 7)
        }
      />

      <Vinculos
        clienteId={cliente.id}
        esSociedad={esSociedad}
        vinculos={vinculos}
        candidatos={candidatos}
      />

      <ClienteForm
        accion={actualizar}
        cliente={cliente}
        label="Guardar cambios"
      />
    </div>
  );
}
