"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/button-styles";
import { Notice } from "@/components/ui/Notice";

export default function TrailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Trail error boundary caught:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Notice variant="error" role="alert" title="Error en el sendero">
          No se pudo cargar la información del sendero. Podés intentar recargar la página o volver a la lista.
        </Notice>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="primary" onClick={reset}>
            Reintentar
          </Button>
          <Link href="/mapa" className={buttonClassName("ghost")}>
            Volver al mapa
          </Link>
        </div>
      </div>
    </main>
  );
}
