import { requireProfile } from "@/lib/auth";
import { Shell, type ItemNav } from "@/components/shell";

const ITEMS: ItemNav[] = [
  { href: "/admin", label: "Dashboard", icono: "dashboard" },
  { href: "/admin/clientes", label: "Clientes", icono: "clientes" },
  { href: "/admin/vencimientos", label: "Vencimientos", icono: "vencimientos" },
  { href: "/admin/obligaciones", label: "Impuestos del mes", icono: "obligaciones" },
  { href: "/admin/tablero", label: "Tablero de impuestos", icono: "tablero" },
  { href: "/admin/ddjj", label: "DDJJ y VEPs", icono: "ddjj" },
  { href: "/admin/planes", label: "Planes de pago", icono: "planes" },
  { href: "/admin/volantes", label: "Volantes de pago", icono: "volantes" },
  { href: "/admin/envios", label: "Envíos de boletas", icono: "envios" },
  { href: "/admin/recategorizacion", label: "Recategorización", icono: "recategorizacion" },
  { href: "/admin/comprobantes", label: "Comprobantes", icono: "comprobantes" },
  { href: "/admin/tareas", label: "Tareas", icono: "tareas" },
  { href: "/admin/honorarios", label: "Honorarios", icono: "honorarios" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile(["ADMIN", "CONTADOR_STAFF"]);

  return (
    <Shell profile={profile} items={ITEMS} titulo="Panel del estudio">
      {children}
    </Shell>
  );
}
