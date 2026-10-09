import Link from "next/link";
import { FileSpreadsheet, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatARS, formatCUIT } from "@/lib/utils";
import {
  ETIQUETAS_FORMA_JURIDICA,
  ETIQUETAS_IIBB,
  ETIQUETAS_IVA,
  ETIQUETAS_ROL_VINCULO,
} from "@/lib/constants";
import type { ClienteEstudio } from "@/types/database";
import {
  ESTADOS_CLIENTES,
  FILTROS_CLIENTES,
  aplicarFiltrosClientes,
  estadoPorClave,
  sociedadesDeTitularesQueCoinciden,
} from "@/lib/filtros-clientes";

export const dynamic = "force-dynamic";

/** Mismos filtros que usa la exportación a Excel. */
const FILTROS = FILTROS_CLIENTES;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string; tipo?: string; estado?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q?.trim();
  const tipo = FILTROS.some((f) => f.clave === searchParams.tipo)
    ? searchParams.tipo ?? ""
    : "";
  const filtro = FILTROS.find((f) => f.clave === tipo) ?? FILTROS[0];
  const estado = estadoPorClave(searchParams.estado);

  // Además del nombre y el CUIT, la búsqueda trae las sociedades del titular
  // o representante que coincide (mismo criterio que la exportación).
  const idsTitular = await sociedadesDeTitularesQueCoinciden(supabase, q);
  const query = aplicarFiltrosClientes(
    supabase.from("clientes_estudio").select("*").order("razon_social", { ascending: true }),
    q,
    filtro,
    idsTitular,
    estado
  );

  // Conteos para las solapas. Las de tipo cuentan dentro del estado elegido;
  // las de estado, dentro del tipo elegido.
  const { data: paraContar } = await supabase
    .from("clientes_estudio")
    .select("condicion_iva, forma_juridica, estado_activo");

  const todos = (paraContar ?? []) as Pick<
    ClienteEstudio,
    "condicion_iva" | "forma_juridica" | "estado_activo"
  >[];

  const cumpleTipo = (
    c: (typeof todos)[number],
    f: (typeof FILTROS)[number]
  ) =>
    f.campo === null ||
    c[f.campo as "condicion_iva" | "forma_juridica"] === f.valor;
  const cumpleEstado = (
    c: (typeof todos)[number],
    e: (typeof ESTADOS_CLIENTES)[number]
  ) => e.valor === null || c.estado_activo === e.valor;

  const contar = (f: (typeof FILTROS)[number]) =>
    todos.filter((c) => cumpleTipo(c, f) && cumpleEstado(c, estado)).length;
  const contarEstado = (e: (typeof ESTADOS_CLIENTES)[number]) =>
    todos.filter((c) => cumpleEstado(c, e) && cumpleTipo(c, filtro)).length;

  const { data, error } = await query;
  const clientes = (data ?? []) as ClienteEstudio[];

  // Titulares / representantes: para cada sociedad, las personas vinculadas;
  // para cada persona, las sociedades de las que es titular o representante.
  type Contraparte = { id: string; razon_social: string; cuit: string };
  type VincLista = {
    persona_id: string;
    sociedad_id: string;
    rol_vinculo: string;
    persona: Contraparte | null;
    sociedad: Contraparte | null;
  };
  const ids = clientes.map((c) => c.id);
  const { data: vincData } = ids.length
    ? await supabase
        .from("vinculos_cliente")
        .select(
          "persona_id, sociedad_id, rol_vinculo, persona:persona_id(id, razon_social, cuit), sociedad:sociedad_id(id, razon_social, cuit)"
        )
        .or(`persona_id.in.(${ids.join(",")}),sociedad_id.in.(${ids.join(",")})`)
    : { data: [] };
  const vinculos = (vincData ?? []) as unknown as VincLista[];
  const ORDEN_ROL: Record<string, number> = {
    TITULAR: 0,
    REPRESENTANTE: 1,
    SOCIO: 2,
    APODERADO: 3,
  };
  const vinculosDe = (c: ClienteEstudio) =>
    vinculos
      .filter((v) =>
        c.tipo_persona === "JURIDICA" ? v.sociedad_id === c.id : v.persona_id === c.id
      )
      .map((v) => ({
        rol: v.rol_vinculo,
        otro: c.tipo_persona === "JURIDICA" ? v.persona : v.sociedad,
      }))
      .filter((v): v is { rol: string; otro: Contraparte } => Boolean(v.otro))
      .sort((a, b) => (ORDEN_ROL[a.rol] ?? 9) - (ORDEN_ROL[b.rol] ?? 9));

  const href = (claveTipo: string, claveEstado: string = estado.clave) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (claveTipo) p.set("tipo", claveTipo);
    if (claveEstado) p.set("estado", claveEstado);
    const s = p.toString();
    return s ? `/admin/clientes?${s}` : "/admin/clientes";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full sm:max-w-xs">
          {tipo ? <input type="hidden" name="tipo" value={tipo} /> : null}
          {estado.clave ? (
            <input type="hidden" name="estado" value={estado.clave} />
          ) : null}
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por razón social, CUIT o titular"
            className="pl-9"
          />
        </form>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            {/* Link común (no de Next): es una descarga, no una página. */}
            <a
              href={`/admin/clientes/exportar${(() => {
                const p = new URLSearchParams();
                if (q) p.set("q", q);
                if (tipo) p.set("tipo", tipo);
                if (estado.clave) p.set("estado", estado.clave);
                const t = p.toString();
                return t ? `?${t}` : "";
              })()}`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar a Excel
            </a>
          </Button>
          <Button asChild>
            <Link href="/admin/clientes/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const activo = f.clave === tipo;
          return (
            <Link
              key={f.clave || "todos"}
              href={href(f.clave)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                activo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.etiqueta}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  activo ? "bg-primary-foreground/20" : "bg-muted"
                )}
              >
                {contar(f)}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Estado
        </span>
        {ESTADOS_CLIENTES.map((e) => {
          const activo = e.clave === estado.clave;
          return (
            <Link
              key={e.clave || "activos"}
              href={href(tipo, e.clave)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activo
                  ? "border-foreground/40 bg-muted text-foreground"
                  : "border-input bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {e.etiqueta}
              <span className="rounded-full bg-background px-1.5 tabular-nums">
                {contarEstado(e)}
              </span>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          {error ? (
            <p className="p-6 text-sm text-destructive">
              No se pudo cargar la lista: {error.message}
            </p>
          ) : clientes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {q || tipo || estado.clave
                  ? estado.clave === "inactivos" && !q && !tipo
                    ? "No hay clientes dados de baja."
                    : "Ningún cliente coincide con la búsqueda."
                  : "Todavía no hay clientes cargados."}
              </p>
              {!q && !tipo && !estado.clave && (
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/admin/clientes/nuevo">Cargar el primero</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón social</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Titular / Representante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Condición IVA</TableHead>
                  <TableHead>IIBB</TableHead>
                  <TableHead className="text-right">Honorario</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {c.razon_social}
                      </Link>
                      {c.nombre_fantasia && (
                        <p className="text-xs text-muted-foreground">
                          {c.nombre_fantasia}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCUIT(c.cuit)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const vs = vinculosDe(c);
                        if (vs.length === 0) {
                          return c.tipo_persona === "JURIDICA" ? (
                            <span className="text-muted-foreground">Sin cargar</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          );
                        }
                        const esSoc = c.tipo_persona === "JURIDICA";
                        return (
                          <ul className="space-y-1">
                            {vs.map((v) => {
                              const rol = ETIQUETAS_ROL_VINCULO[v.rol] ?? v.rol;
                              return (
                                <li key={`${v.otro.id}-${v.rol}`}>
                                  {!esSoc && (
                                    <span className="text-muted-foreground">
                                      {rol} de{" "}
                                    </span>
                                  )}
                                  <Link
                                    href={`/admin/clientes/${v.otro.id}`}
                                    className="hover:text-primary hover:underline"
                                  >
                                    {v.otro.razon_social}
                                  </Link>
                                  <p className="text-xs text-muted-foreground tabular-nums">
                                    {esSoc ? `${rol} · ` : ""}
                                    {formatCUIT(v.otro.cuit)}
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.tipo_persona === "JURIDICA" ? (
                        <Badge variant="secondary">
                          {ETIQUETAS_FORMA_JURIDICA[c.forma_juridica] ??
                            c.forma_juridica}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Persona</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ETIQUETAS_IVA[c.condicion_iva]}
                      {c.categoria_monotributo && (
                        <Badge className="ml-2">{c.categoria_monotributo}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ETIQUETAS_IIBB[c.condicion_iibb]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatARS(c.honorario_mensual_ars)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.estado_activo ? "success" : "secondary"}>
                        {c.estado_activo ? "Activo" : "Inactivo"}
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
