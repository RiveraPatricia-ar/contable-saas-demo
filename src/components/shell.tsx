import Link from "next/link";
import { Calculator, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { ESTUDIO } from "@/lib/constants";
import type { Profile } from "@/types/database";
import { NavLink, type IconoNav } from "@/components/nav-link";

/**
 * El ícono viaja como nombre, no como componente: Next.js no permite pasar
 * funciones de un Server Component a un Client Component, y NavLink es cliente.
 */
export interface ItemNav {
  href: string;
  label: string;
  icono: IconoNav;
}

export function Shell({
  profile,
  items,
  titulo,
  children,
}: {
  profile: Profile;
  items: ItemNav[];
  titulo: string;
  children: React.ReactNode;
}) {
  const iniciales = profile.nombre_completo
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Calculator className="h-4 w-4" />
          </span>
          <span className="truncate">{ESTUDIO.nombre}</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {iniciales}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {profile.nombre_completo}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile.rol === "CLIENTE" ? "Cliente" : "Estudio"}
              </p>
            </div>
          </div>
          <form action={logout}>
            <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/90 px-5 backdrop-blur">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {titulo}
          </h1>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Ver sitio
          </Link>
        </header>

        {/* Navegación en mobile */}
        <div className="flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 lg:hidden">
          {items.map((item) => (
            <NavLink key={item.href} {...item} compacto />
          ))}
        </div>

        <main className="flex-1 p-5 md:p-7">{children}</main>
      </div>
    </div>
  );
}
