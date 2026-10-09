import { createClient } from "@/lib/supabase/server";
import { NuevaDDJJ } from "./nueva-ddjj";
import { FilaDDJJ } from "./fila-ddjj";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { patronBusqueda } from "@/lib/filtros-clientes";
import type { ClienteEstudio, DeclaracionJurada } from "@/types/database";

export const dynamic = "force-dynamic";

type DDJJConCliente = DeclaracionJurada & {
  clientes_estudio: Pick<ClienteEstudio, "razon_social" | "cuit"> | null;
};

export default async function DDJJPage({
  searchParams,
}: {
  searchParams: { q?: string; periodo?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? "";
  const periodoTxt = searchParams.periodo?.trim() ?? "";
  const periodo = /^\d{4}-(0[1-9]|1[0-2])$/.test(periodoTxt) ? periodoTxt : "";
  const periodoInvalido = periodoTxt !== "" && !periodo;

  // Búsqueda por cliente: primero se buscan los clientes que coinciden por
  // nombre, nombre de fantasía o CUIT, y después sus declaraciones.
  let idsClientes: string[] | null = null;
  if (q) {
    const patron = patronBusqueda(q);
    const digitos = q.replace(/\D/g, "");
    const condiciones = [
      patron ? `razon_social.ilike.${patron}` : null,
      patron ? `nombre_fantasia.ilike.${patron}` : null,
      digitos.length >= 3 ? `cuit.ilike.%${digitos}%` : null,
    ].filter(Boolean);
    if (condiciones.length) {
      const { data } = await supabase
        .from("clientes_estudio")
        .select("id")
        .or(condiciones.join(","));
      idsClientes = ((data ?? []) as { id: string }[]).map((c) => c.id);
    } else {
      idsClientes = [];
    }
  }

  let consultaDDJJ = supabase
    .from("declaraciones_juradas")
    .select("*, clientes_estudio(razon_social, cuit)")
    .order("fecha_vencimiento", { ascending: false })
    .limit(100);
  if (periodo) consultaDDJJ = consultaDDJJ.eq("periodo_fiscal", periodo);
  if (idsClientes) {
    consultaDDJJ = idsClientes.length
      ? consultaDDJJ.in("cliente_id", idsClientes)
      : consultaDDJJ.eq("cliente_id", "00000000-0000-0000-0000-000000000000");
  }

  const [ddjjRes, clientesRes] = await Promise.all([
    consultaDDJJ,
    supabase
      .from("clientes_estudio")
      .select("id, razon_social, cuit")
      .eq("estado_activo", true)
      .order("razon_social"),
  ]);

  const ddjj = (ddjjRes.data ?? []) as DDJJConCliente[];
  const clientes = (clientesRes.data ?? []) as Pick<
    ClienteEstudio,
    "id" | "razon_social" | "cuit"
  >[];

  return (
    <div className="space-y-5">
      <NuevaDDJJ clientes={clientes} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Declaraciones juradas</CardTitle>
          <CardDescription>
            {q || periodo
              ? `Liquidaciones${q ? ` de los clientes que coinciden con «${q}»` : ""}${
                  periodo ? ` del período ${periodo}` : ""
                } (hasta 100).`
              : "Últimas 100 liquidaciones cargadas."}{" "}
            Adjuntá el VEP y el acuse desde cada fila.
          </CardDescription>
          <form className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Buscar cliente por nombre o CUIT"
                className="pl-9"
              />
            </div>
            <Input
              name="periodo"
              defaultValue={periodoTxt}
              placeholder="Período AAAA-MM"
              aria-label="Período (AAAA-MM)"
              className="w-40 tabular-nums"
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
            {(q || periodoTxt) && (
              <Link href="/admin/ddjj" className="text-sm text-primary hover:underline">
                Limpiar
              </Link>
            )}
          </form>
          {periodoInvalido && (
            <p className="text-sm text-destructive">
              El período «{periodoTxt}» no es válido: usá el formato AAAA-MM (por ejemplo 2026-10).
            </p>
          )}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {ddjj.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {q || periodo
                ? "No hay declaraciones que coincidan con la búsqueda."
                : "Todavía no hay declaraciones cargadas."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">VEP</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Adjuntos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ddjj.map((d) => (
                  <FilaDDJJ key={d.id} ddjj={d} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
