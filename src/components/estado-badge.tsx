import { Badge } from "@/components/ui/badge";
import { ETIQUETAS_ESTADO } from "@/lib/constants";
import type { EstadoTramite } from "@/types/database";

const VARIANTES: Record<EstadoTramite, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PENDIENTE: "secondary",
  EN_PROCESO: "default",
  ESPERANDO_VEP: "warning",
  PRESENTADO: "default",
  PAGADO: "success",
  FINALIZADO: "success",
  VENCIDO: "destructive",
};

export function EstadoBadge({ estado }: { estado: EstadoTramite }) {
  return (
    <Badge variant={VARIANTES[estado] ?? "secondary"}>
      {ETIQUETAS_ESTADO[estado] ?? estado}
    </Badge>
  );
}
