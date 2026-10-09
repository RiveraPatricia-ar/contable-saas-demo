import { createClient } from "@/lib/supabase/server";
import { miClientePrincipal } from "@/lib/portal";
import { SubirGastoForm } from "./form";
import { BotonDescarga } from "@/components/boton-descarga";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFecha } from "@/lib/utils";
import type { Documento } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SubirComprobantesPage() {
  const cliente = await miClientePrincipal();
  if (!cliente) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay un CUIT vinculado a tu usuario.
      </p>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("documentos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .eq("categoria", "GASTO")
    .order("created_at", { ascending: false })
    .limit(50);

  const enviados = (data ?? []) as Documento[];

  return (
    <div className="space-y-5">
      <SubirGastoForm clienteId={cliente.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comprobantes enviados</CardTitle>
          <CardDescription>
            Los últimos 50 archivos que subiste para que el estudio los liquide.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {enviados.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Todavía no enviaste comprobantes.
            </p>
          ) : (
            enviados.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    Enviado el {formatFecha(d.created_at.slice(0, 10))}
                  </p>
                </div>
                <BotonDescarga path={d.path_archivo} label="Ver" variant="ghost" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
