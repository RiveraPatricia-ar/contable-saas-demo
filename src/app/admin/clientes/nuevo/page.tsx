import Link from "next/link";
import { ClienteForm } from "../cliente-form";
import { crearCliente } from "../actions";

export const metadata = { title: "Nuevo cliente" };

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/admin/clientes" className="text-sm text-primary hover:underline">
          ← Volver a clientes
        </Link>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Nuevo cliente</h2>
      </div>

      <ClienteForm accion={crearCliente} label="Crear cliente" />
    </div>
  );
}
