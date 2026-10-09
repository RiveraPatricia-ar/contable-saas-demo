"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarCheck2,
  CreditCard,
  TrendingUp,
  Send,
  QrCode,
  Grid3x3,
  Building2,
  FileCheck2,
  FileText,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Receipt,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Registro de íconos del menú.
 *
 * Los componentes de lucide-react son funciones, y Next.js no permite pasar
 * funciones desde un Server Component a un Client Component. Por eso el menú
 * viaja con el NOMBRE del ícono (un string) y la resolución al componente
 * ocurre acá, del lado del cliente.
 */
export const ICONOS_NAV = {
  dashboard: LayoutDashboard,
  clientes: Users,
  vencimientos: CalendarDays,
  ddjj: FileCheck2,
  comprobantes: Receipt,
  tareas: ListChecks,
  honorarios: Wallet,
  documentos: FileText,
  subir: Upload,
  consultas: MessageSquare,
  obligaciones: CalendarCheck2,
  planes: CreditCard,
  recategorizacion: TrendingUp,
  envios: Send,
  volantes: QrCode,
  tablero: Grid3x3,
  sociedades: Building2,
} as const;

export type IconoNav = keyof typeof ICONOS_NAV;

export function NavLink({
  href,
  label,
  icono,
  compacto = false,
}: {
  href: string;
  label: string;
  icono: IconoNav;
  compacto?: boolean;
}) {
  const pathname = usePathname();
  const Icon = ICONOS_NAV[icono];

  // El dashboard raíz solo está activo en coincidencia exacta; si no, quedaría
  // marcado en todas las subrutas.
  const esRaiz = href === "/admin" || href === "/portal";
  const activo = esRaiz
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
        compacto ? "shrink-0 px-3 py-2 text-xs" : "px-3 py-2",
        activo
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
