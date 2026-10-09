import Link from "next/link";
import { Calculator, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ESTUDIO } from "@/lib/constants";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Calculator className="h-5 w-5" />
          </span>
          <span className="text-lg tracking-tight">{ESTUDIO.nombre}</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#servicios" className="hover:text-foreground">Servicios</a>
          <a href="#simulador" className="hover:text-foreground">Simulador</a>
          <a href="#planes" className="hover:text-foreground">Planes</a>
          <a href="#contacto" className="hover:text-foreground">Contacto</a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <a href="#contacto">Agendar consulta</a>
          </Button>
          <Button asChild>
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
