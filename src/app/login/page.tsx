import Link from "next/link";
import { Calculator, ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";
import { CredencialesDemo } from "./credenciales-demo";
import { ESTUDIO } from "@/lib/constants";

export const metadata = { title: "Iniciar sesión — Ortiz-Rivera contadores" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Calculator className="h-5 w-5" />
            </span>
            {ESTUDIO.nombre}
          </Link>

          <h1 className="mt-10 text-2xl font-bold tracking-tight">
            Ingresá al portal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Usá tu CUIT o DNI (sin guiones) y la contraseña que te entregó el
            estudio.
          </p>

          <CredencialesDemo />

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿Todavía no sos cliente?{" "}
            <Link href="/#contacto" className="text-primary hover:underline">
              Agendá una consulta
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden items-center justify-center bg-primary p-12 lg:flex">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <blockquote className="relative max-w-md text-primary-foreground">
          <ShieldCheck className="h-10 w-10 opacity-80" />
          <p className="mt-6 text-2xl font-medium leading-snug">
            Todos tus VEPs, acuses y comprobantes en un solo lugar, con el
            estado de cada obligación siempre a la vista.
          </p>
          <footer className="mt-6 text-sm opacity-80">
            Portal de clientes — {ESTUDIO.nombre}
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
