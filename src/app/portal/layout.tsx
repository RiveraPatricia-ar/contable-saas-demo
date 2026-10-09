import { requireProfile } from "@/lib/auth";
import { Shell, type ItemNav } from "@/components/shell";

const ITEMS: ItemNav[] = [
  { href: "/portal", label: "Mi situación", icono: "dashboard" },
  { href: "/portal/veps", label: "Mis VEPs y pagos", icono: "honorarios" },
  { href: "/portal/documentos", label: "Mis documentos", icono: "documentos" },
  { href: "/portal/comprobantes", label: "Subir comprobantes", icono: "subir" },
  { href: "/portal/consultas", label: "Consultas", icono: "consultas" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile(["CLIENTE", "ADMIN", "CONTADOR_STAFF"]);

  return (
    <Shell profile={profile} items={ITEMS} titulo="Portal de clientes">
      {children}
    </Shell>
  );
}
