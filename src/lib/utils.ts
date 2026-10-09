import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un importe en pesos argentinos. */
export function formatARS(value: number | null | undefined) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

/** Formatea una fecha ISO (YYYY-MM-DD) al formato dd/MM/yyyy. */
export function formatFecha(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Muestra un CUIT de 11 digitos como 20-12345678-9. */
export function formatCUIT(cuit: string | null | undefined) {
  const digits = (cuit ?? "").replace(/\D/g, "");
  if (digits.length !== 11) return cuit ?? "—";
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/** Quita guiones y espacios de un CUIT/DNI. */
export function soloDigitos(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Valida el digito verificador de un CUIT argentino (modulo 11).
 */
export function validarCUIT(cuit: string): boolean {
  const d = soloDigitos(cuit);
  if (d.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) suma += Number(d[i]) * pesos[i];
  const resto = suma % 11;
  let verificador = 11 - resto;
  if (verificador === 11) verificador = 0;
  if (verificador === 10) verificador = 9;
  return verificador === Number(d[10]);
}

/** Dias restantes hasta una fecha (negativo si ya vencio). */
export function diasHasta(fecha: string | Date): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const d = typeof fecha === "string" ? new Date(`${fecha}T00:00:00`) : fecha;
  return Math.round((d.getTime() - hoy.getTime()) / 86_400_000);
}
