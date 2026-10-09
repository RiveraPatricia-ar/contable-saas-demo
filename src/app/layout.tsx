import type { Metadata } from "next";
import "./globals.css";
import { BandaDemo } from "@/components/banda-demo";

export const metadata: Metadata = {
  title: "Ortiz-Rivera contadores — Estudio contable online para PyMEs y Monotributistas",
  description:
    "Gestión contable, liquidación de impuestos (IVA, IIBB, F.931) y facturación en un solo lugar, con la supervisión de contadores expertos en Argentina.",
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
