import Link from "next/link";
import { Calculator, LogIn } from "lucide-react";
import { ESTUDIO } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="py-12">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Calculator className="h-4 w-4" />
              </span>
              {ESTUDIO.nombre}
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {ESTUDIO.razonSocial} — CUIT {ESTUDIO.cuit}
              <br />
              {ESTUDIO.matricula}
              <br />
              {ESTUDIO.domicilio}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Servicios</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#servicios" className="hover:text-foreground">Monotributo</a></li>
              <li><a href="#servicios" className="hover:text-foreground">Responsable Inscripto</a></li>
              <li><a href="#servicios" className="hover:text-foreground">Ingresos Brutos</a></li>
              <li><a href="#servicios" className="hover:text-foreground">Sueldos y F.931</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Accesos</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <LogIn className="h-3.5 w-3.5" />
                  Portal de clientes
                </Link>
              </li>
              <li><a href="#planes" className="hover:text-foreground">Planes y precios</a></li>
              <li><a href="#contacto" className="hover:text-foreground">Agendar consulta</a></li>
              <li><Link href="/legales" className="hover:text-foreground">Términos y privacidad</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {ESTUDIO.razonSocial}. Todos los derechos reservados.
          </p>
          <p>
            El contenido del sitio es informativo y no constituye asesoramiento
            profesional individualizado.
          </p>
        </div>
      </div>
    </footer>
  );
}
