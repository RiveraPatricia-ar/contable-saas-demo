import type { Metadata } from "next";
import "./globals.css";
import { BandaDemo } from "@/components/banda-demo";

export const metadata: Metadata = {
  title: "Patricia Rivera — Servicios contables | Demo",
  description:
    "Demostración de un sistema de gestión para estudios contables argentinos: vencimientos, DDJJ, planes de pago, recategorización de monotributo y portal de clientes. Datos ficticios.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body>
        <BandaDemo />
        {children}
      </body>
    </html>
  );
}
