import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ESTUDIO } from "@/lib/constants";

export function Contacto() {
  return (
    <section id="contacto" className="border-b bg-muted/40 py-20">
      <div className="container grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Agendá una consulta contable
          </h2>
          <p className="mt-4 text-muted-foreground">
            Contanos tu situación y te respondemos con una propuesta concreta.
            La primera conversación no tiene costo.
          </p>

          <div className="mt-8 space-y-4 text-sm">
            <p className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-primary" />
              <a href={`mailto:${ESTUDIO.email}`} className="hover:underline">
                {ESTUDIO.email}
              </a>
            </p>
            <p className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-primary" />
              {ESTUDIO.telefono}
            </p>
            <p className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-primary" />
              WhatsApp {ESTUDIO.whatsapp}
            </p>
            <p className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-primary" />
              {ESTUDIO.domicilio}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {/*
              El envío está preparado como formulario clásico. Conectarlo a un
              Route Handler (/api/consulta) o al servicio de email del estudio.
            */}
            <form action="/api/consulta" method="post" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre y apellido</Label>
                  <Input id="nombre" name="nombre" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuit">CUIT / DNI</Label>
                  <Input id="cuit" name="cuit" inputMode="numeric" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" name="telefono" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="situacion">Tu situación actual</Label>
                <Select id="situacion" name="situacion" defaultValue="MONOTRIBUTO">
                  <option value="MONOTRIBUTO">Monotributista</option>
                  <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                  <option value="PYME">PyME con empleados</option>
                  <option value="INICIO">Estoy por iniciar actividades</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mensaje">Contanos brevemente qué necesitás</Label>
                <Textarea id="mensaje" name="mensaje" rows={4} />
              </div>

              <Button type="submit" className="w-full" size="lg">
                Solicitar consulta
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Usamos tus datos solo para responder esta consulta.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
