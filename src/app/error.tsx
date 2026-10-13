"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/button-styles";
import { Notice } from "@/components/ui/Notice";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Notice variant="error" role="alert" title="Algo salió mal">
          Ocurrió un error inesperado al procesar la pantalla. Podés reintentar la acción o volver al inicio.
        </Notice>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="primary" onClick={reset}>
            Reintentar
          </Button>
          <Link href="/mapa" className={buttonClassName("ghost")}>
            Ir al mapa
          </Link>
        </div>
      </div>
    </main>
  );
}
