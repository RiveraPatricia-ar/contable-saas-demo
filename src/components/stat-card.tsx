import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  valor,
  detalle,
  icon: Icon,
  tono = "neutro",
}: {
  label: string;
  valor: string;
  detalle?: string;
  icon: LucideIcon;
  tono?: "neutro" | "positivo" | "alerta" | "critico";
}) {
  const tonos = {
    neutro: "bg-primary/10 text-primary",
    positivo: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    alerta: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    critico: "bg-destructive/10 text-destructive",
  } as const;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">
            {valor}
          </p>
          {detalle && (
            <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
          )}
        </div>
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", tonos[tono])}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}
