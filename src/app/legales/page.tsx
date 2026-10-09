import Link from "next/link";
import { ESTUDIO } from "@/lib/constants";

export const metadata = { title: "Términos y privacidad — Patricia Rivera Servicios contables" };

export default function LegalesPage() {
  return (
    <div className="container max-w-3xl py-16">
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Volver al inicio
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        Términos de uso y política de privacidad
      </h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          Este documento es una plantilla de partida. Antes de publicar el sitio
          conviene que lo revise un profesional del derecho y lo adapte a la
          operatoria real del estudio y a la Ley 25.326 de Protección de los
          Datos Personales y su normativa complementaria.
        </p>

        <section>
          <h2 className="text-base font-semibold text-foreground">Responsable</h2>
          <p className="mt-2">
            {ESTUDIO.razonSocial}, CUIT {ESTUDIO.cuit}, con domicilio en{" "}
            {ESTUDIO.domicilio}.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Datos que tratamos
          </h2>
          <p className="mt-2">
            Datos identificatorios y fiscales de los clientes del estudio,
            comprobantes, declaraciones juradas y documentación respaldatoria,
            tratados con la única finalidad de prestar el servicio contable
            contratado.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Credenciales fiscales
          </h2>
          <p className="mt-2">
            Las claves de acceso a organismos que el cliente decida compartir se
            almacenan cifradas, su lectura queda registrada en un log de
            auditoría y solo es accesible para el personal del estudio.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Alcance del contenido del sitio
          </h2>
          <p className="mt-2">
            Las herramientas de cálculo y la información general publicadas son
            orientativas, pueden no reflejar la normativa vigente al momento de
            la consulta y no constituyen asesoramiento profesional
            individualizado.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Contacto</h2>
          <p className="mt-2">
            Por ejercicio de derechos de acceso, rectificación o supresión:{" "}
            {ESTUDIO.email}.
          </p>
        </section>
      </div>
    </div>
  );
}
