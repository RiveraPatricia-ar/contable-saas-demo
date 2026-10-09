import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { miClientePrincipal } from "@/lib/portal";
import { BotonDescarga } from "@/components/boton-descarga";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFecha } from "@/lib/utils";
import type { Documento } from "@/types/database";

export const dynamic = "force-dynamic";

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  CONSTANCIA: "Constancia de inscripción",
  F931: "F.931",
  ACUSE: "Acuse de presentación",
  BALANCE: "Balance",
  HABILITACION: "Habilitación",
  VEP: "VEP",
  GASTO: "Comprobante enviado",
  OTROS: "Otros",
};

export default async function DocumentosPage() {
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
    .order("created_at", { ascending: false });

  const documentos = (data ?? []) as Documento[];

  const porCategoria = documentos.reduce<Record<string, Documento[]>>(
    (acc, d) => {
      (acc[d.categoria] ??= []).push(d);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mis documentos</CardTitle>
          <CardDescription>
            Constancias, acuses, F.931, balances y toda la documentación que el
            estudio dejó disponible para vos.
          </CardDescription>
        </CardHeader>
      </Card>

      {documentos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay documentos publicados.
          </CardContent>
        </Card>
      ) : (
        Object.entries(porCategoria).map(([categoria, docs]) => (
          <Card key={categoria}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {ETIQUETAS_CATEGORIA[categoria] ?? categoria}
                <Badge variant="secondary" className="ml-2">
                  {docs.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.periodo_fiscal ? `${d.periodo_fiscal} · ` : ""}
                        {formatFecha(d.created_at.slice(0, 10))}
                      </p>
                    </div>
                  </div>
                  <BotonDescarga path={d.path_archivo} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
