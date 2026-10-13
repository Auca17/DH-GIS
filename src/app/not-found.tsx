import Link from "next/link";
import { buttonClassName } from "@/components/ui/button-styles";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="font-mono text-sm font-bold uppercase tracking-widest text-primary-ink">
          Error 404
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Página no encontrada
        </h1>
        <p className="text-sm leading-relaxed text-text-muted">
          La ruta que buscás no existe o fue modificada. Volvé al mapa para ver los senderos disponibles.
        </p>
        <div className="pt-2">
          <Link href="/mapa" className={buttonClassName("primary")}>
            Volver al mapa
          </Link>
        </div>
      </div>
    </main>
  );
}
