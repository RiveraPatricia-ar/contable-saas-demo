import Link from "next/link";
import { AlertTriangle, CalendarClock, CreditCard, Search, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NuevoPlan } from "./nuevo-plan";
import { ETIQUETAS_ESTADO_PLAN, RENTAS_DIAS } from "@/lib/constants";
import { formatARS, formatCUIT, formatFecha } from "@/lib/utils";
import type { ClienteEstudio, PlanResumen } from "@/types/database";

export const dynamic = "force-dynamic";

/** Pasa a minúsculas y saca los acentos, para comparar nombres sin importar cómo se escribieron. */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? "";

  const [planesRes, clientesRes] = await Promise.all([
    supabase
      .from("planes_resumen")
      .select("*")
      .order("origen")
      .order("razon_social"),
    supabase
      .from("clientes_estudio")
      .select("id, razon_social, cuit")
      .eq("estado_activo", true)
      .order("razon_social"),
  ]);

  const planes = (planesRes.data ?? []) as PlanResumen[];
  const clientes = (clientesRes.data ?? []) as Pick<
    ClienteEstudio,
    "id" | "razon_social" | "cuit"
  >[];

  // Filtro por cliente: cada palabra escrita tiene que estar en el nombre
  // («gonzalez romina» encuentra «GONZALEZ ROMINA VIVIANA»), o bien los
  // números escritos tienen que estar en el CUIT.
  const palabras = normalizar(q).split(/[^a-z0-9ñ&]+/).filter(Boolean);
  const digitos = q.replace(/\D/g, "");
  const planesFiltrados = q
    ? planes.filter((p) => {
        const nombre = normalizar(p.razon_social ?? "");
        const porNombre = palabras.length > 0 && palabras.every((w) => nombre.includes(w));
        const porCuit = digitos.length >= 3 && (p.cuit ?? "").replace(/\D/g, "").includes(digitos);
        return porNombre || porCuit;
      })
    : planes;

  const vigentes = planes.filter((p) => p.estado === "VIGENTE");
  const conVencidas = vigentes.filter((p) => p.cuotas_vencidas > 0);
  const deudaVencida = vigentes.reduce((a, p) => a + Number(p.vencido_ars ?? 0), 0);
  const hoy = new Date().getDate();
  const rentasPorEnviar = vigentes.filter(
    (p) => p.origen === "RENTAS" && hoy >= (p.dia_envio ?? RENTAS_DIAS.envio)
  ).length;

  return (
    <div className="space-y-5">
      <NuevoPlan clientes={clientes} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Planes vigentes"
          valor={String(vigentes.length)}
          detalle={`${planes.length} cargados en total`}
          icon={CreditCard}
        />
        <StatCard
          label="Planes con cuotas vencidas"
          valor={String(conVencidas.length)}
          detalle={formatARS(deudaVencida)}
          icon={AlertTriangle}
          tono={conVencidas.length > 0 ? "critico" : "positivo"}
        />
        <StatCard
          label="Boletas de Rentas a enviar"
          valor={String(rentasPorEnviar)}
          detalle={`Se mandan el día ${RENTAS_DIAS.envio}`}
          icon={Send}
          tono={rentasPorEnviar > 0 ? "alerta" : "neutro"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos los planes</CardTitle>
          <CardDescription>
            Entrá a un plan para ver sus cuotas, generar el VEP o la boleta y
            marcar lo que ya se envió o se pagó.
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
            <Button type="submit" variant="outline">
              Buscar
            </Button>
            {q && (
              <>
                <Link href="/admin/planes" className="text-sm text-primary hover:underline">
                  Limpiar
                </Link>
                <span className="text-sm text-muted-foreground">
                  {planesFiltrados.length} de {planes.length} planes
                </span>
              </>
            )}
          </form>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {planesFiltrados.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {q
                ? `No hay planes de clientes que coincidan con «${q}».`
                : "Todavía no hay planes cargados."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Organismo</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Cuotas</TableHead>
                  <TableHead>Próximo vto.</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planesFiltrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/admin/planes/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.razon_social}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatCUIT(p.cuit)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.origen === "ARCA" ? "default" : "secondary"}>
                        {p.origen === "ARCA" ? "ARCA" : "Rentas Tucumán"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[18rem] text-sm">
                      <p className="truncate">{p.tipo_plan}</p>
                      <p className="text-xs text-muted-foreground">
                        N° {p.numero_plan}
                      </p>
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      <span className="text-emerald-600">{p.cuotas_pagadas}</span>
                      {" / "}
                      {p.cantidad_cuotas}
                      {p.cuotas_vencidas > 0 ? (
                        <Badge variant="destructive" className="ml-2">
                          {p.cuotas_vencidas} vencida
                          {p.cuotas_vencidas === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatFecha(p.proximo_vencimiento)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.estado === "VIGENTE"
                            ? "default"
                            : p.estado === "FINALIZADO"
                            ? "success"
                            : "destructive"
                        }
                      >
                        {ETIQUETAS_ESTADO_PLAN[p.estado]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
