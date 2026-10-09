"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatARS } from "@/lib/utils";
import {
  ALICUOTAS_IIBB,
  ALICUOTA_IVA_GENERAL,
  VIGENCIA_DECLARADA,
  categoriaPorIngresoAnual,
  cuotaMensual,
} from "@/lib/parametros-fiscales";

type Regimen = "MONOTRIBUTO" | "RESPONSABLE_INSCRIPTO";

export function Simulador() {
  const [regimen, setRegimen] = useState<Regimen>("MONOTRIBUTO");
  const [facturacionMensual, setFacturacionMensual] = useState(2_000_000);
  const [comprasMensuales, setComprasMensuales] = useState(800_000);
  const [jurisdiccion, setJurisdiccion] = useState("CABA");

  const resultado = useMemo(() => {
    const alicuotaIIBB = ALICUOTAS_IIBB[jurisdiccion] ?? 0.035;

    if (regimen === "MONOTRIBUTO") {
      const anual = facturacionMensual * 12;
      const cat = categoriaPorIngresoAnual(anual);
      return {
        categoria: cat?.categoria ?? null,
        excedeTope: cat === null,
        lineas: cat
          ? [
              {
                etiqueta: `Cuota Monotributo (cat. ${cat.categoria})`,
                monto: cuotaMensual(cat),
              },
              { etiqueta: `Ingresos Brutos — ${jurisdiccion}`, monto: facturacionMensual * alicuotaIIBB },
            ]
          : [],
        anual,
      };
    }

    const netoVentas = facturacionMensual / (1 + ALICUOTA_IVA_GENERAL);
    const netoCompras = comprasMensuales / (1 + ALICUOTA_IVA_GENERAL);
    const ivaDebito = netoVentas * ALICUOTA_IVA_GENERAL;
    const ivaCredito = netoCompras * ALICUOTA_IVA_GENERAL;

    return {
      categoria: null,
      excedeTope: false,
      lineas: [
        { etiqueta: "IVA débito fiscal", monto: ivaDebito },
        { etiqueta: "IVA crédito fiscal", monto: -ivaCredito },
        { etiqueta: `Ingresos Brutos — ${jurisdiccion}`, monto: netoVentas * alicuotaIIBB },
      ],
      anual: facturacionMensual * 12,
    };
  }, [regimen, facturacionMensual, comprasMensuales, jurisdiccion]);

  const total = resultado.lineas.reduce((acc, l) => acc + l.monto, 0);

  return (
    <section id="simulador" className="border-b bg-muted/40 py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge className="mb-4">
            <TrendingUp className="h-3.5 w-3.5" />
            Simulador
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            ¿Cuánto vas a pagar de impuestos este mes?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Una estimación rápida según tu régimen y tu nivel de facturación.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Tus datos</CardTitle>
              <CardDescription>
                Todos los importes en pesos argentinos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="regimen">Régimen</Label>
                <Select
                  id="regimen"
                  value={regimen}
                  onChange={(e) => setRegimen(e.target.value as Regimen)}
                >
                  <option value="MONOTRIBUTO">Monotributo</option>
                  <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facturacion">
                  Facturación mensual: {formatARS(facturacionMensual)}
                </Label>
                <input
                  id="facturacion"
                  type="range"
                  min={100_000}
                  max={12_000_000}
                  step={100_000}
                  value={facturacionMensual}
                  onChange={(e) => setFacturacionMensual(Number(e.target.value))}
                  className="w-full accent-[hsl(var(--primary))]"
                />
              </div>

              {regimen === "RESPONSABLE_INSCRIPTO" && (
                <div className="space-y-2">
                  <Label htmlFor="compras">Compras mensuales con IVA</Label>
                  <Input
                    id="compras"
                    type="number"
                    min={0}
                    step={10_000}
                    value={comprasMensuales}
                    onChange={(e) => setComprasMensuales(Number(e.target.value))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="jurisdiccion">Jurisdicción de Ingresos Brutos</Label>
                <Select
                  id="jurisdiccion"
                  value={jurisdiccion}
                  onChange={(e) => setJurisdiccion(e.target.value)}
                >
                  {Object.keys(ALICUOTAS_IIBB).map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Estimación mensual</CardTitle>
              {resultado.categoria && (
                <CardDescription>
                  Categoría sugerida:{" "}
                  <span className="font-semibold text-foreground">
                    {resultado.categoria}
                  </span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {resultado.excedeTope ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <p className="font-medium">Superás el tope del Monotributo</p>
                  <p className="mt-1 text-muted-foreground">
                    Con esa facturación anual corresponde analizar el pase a
                    Responsable Inscripto. Es exactamente el tipo de decisión
                    que conviene conversar con un contador.
                  </p>
                </div>
              ) : (
                <>
                  <ul className="space-y-3 text-sm">
                    {resultado.lineas.map((l) => (
                      <li key={l.etiqueta} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{l.etiqueta}</span>
                        <span className="font-medium tabular-nums">
                          {formatARS(l.monto)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex items-baseline justify-between border-t pt-4">
                    <span className="text-sm font-medium">Total estimado</span>
                    <span className="text-2xl font-bold tabular-nums text-primary">
                      {formatARS(total)}
                    </span>
                  </div>
                </>
              )}

              <Button className="mt-6 w-full" asChild>
                <a href="#contacto">
                  Revisarlo con un contador
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="mx-auto mt-8 flex max-w-3xl items-start gap-2 rounded-lg border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong className="text-foreground">Estimación orientativa.</strong>{" "}
            {VIGENCIA_DECLARADA}. El cálculo no contempla retenciones,
            percepciones, saldos a favor, exenciones ni el régimen de Convenio
            Multilateral, y no reemplaza el asesoramiento de un profesional
            matriculado. Las escalas y alícuotas se cargan en{" "}
            <code>src/lib/parametros-fiscales.ts</code> y deben actualizarse con
            los valores oficiales vigentes.
          </span>
        </p>
      </div>
    </section>
  );
}
