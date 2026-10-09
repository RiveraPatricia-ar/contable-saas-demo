import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { CambiarPasswordForm } from "./form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Cambiar contraseña — Ortiz-Rivera contadores" };

export default async function CambiarPasswordPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="mb-2 inline-grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <CardTitle>
            {profile.debe_cambiar_password
              ? "Definí tu contraseña"
              : "Cambiar contraseña"}
          </CardTitle>
          <CardDescription>
            {profile.debe_cambiar_password
              ? "Tu cuenta usa una contraseña inicial asignada por el estudio. Por seguridad tenés que reemplazarla antes de continuar."
              : "Elegí una contraseña nueva para tu cuenta."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CambiarPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
