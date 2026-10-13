import Link from "next/link";
import { buttonClassName } from "@/components/ui/button-styles";

export default function TrailNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="font-mono text-sm font-bold uppercase tracking-widest text-primary-ink">
          Sendero no encontrado
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-text">
          El sendero no existe o no está disponible
        </h1>
        <p className="text-sm leading-relaxed text-text-muted">
          No encontramos ningún trazado con ese identificador. Verificá la URL o explorá el mapa para elegir otro sendero.
        </p>
        <div className="pt-2">
          <Link href="/mapa" className={buttonClassName("primary")}>
            Volver a los senderos
          </Link>
        </div>
      </div>
    </main>
  );
}
