"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { urlFirmadaPortal } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";

export function BotonDescarga({
  path,
  label = "Descargar",
  variant = "outline",
}: {
  path: string;
  label?: string;
  variant?: "outline" | "ghost" | "default";
}) {
  const [pendiente, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={variant}
      disabled={pendiente}
      onClick={() =>
        startTransition(async () => {
          const url = await urlFirmadaPortal(path);
          if (url) window.open(url, "_blank", "noopener,noreferrer");
        })
      }
    >
      {pendiente ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}
