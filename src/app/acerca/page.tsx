import type { Metadata } from "next";
import Link from "next/link";
import { DhLogo } from "@/components/brand/DhLogo";
import { DownhillRider } from "@/components/brand/DownhillRider";
import { buttonClassName } from "@/components/ui/button-styles";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "El equipo detrás de DH y cómo está organizada su base de datos MongoDB.",
};

// Order requested by the team.
const EQUIPO = [
  { nombre: "Augustus Rufino", iniciales: "AR" },
  { nombre: "Nicolas Beltran", iniciales: "NB" },
  { nombre: "Ariel Cohen", iniciales: "AC" },
  { nombre: "Josefina Porolli", iniciales: "JP" },
];

const COLECCIONES = [
  {
    nombre: "trails",
    descripcion: "Los senderos. Los tramos van embebidos porque siempre se leen junto con el sendero.",
    campos: ["slug", "start (GeoJSON)", "path", "segments[ ]", "stats"],
  },
  {
    nombre: "descents",
    descripcion: "Cada bajada. Crece sin límite, así que referencia al sendero y al rider.",
    campos: ["trailId → trails", "userId → users", "durationMs", "validated"],
  },
  {
    nombre: "reviews",
    descripcion: "Las opiniones, también referenciadas para no inflar el documento del sendero.",
    campos: ["trailId → trails", "userId → users", "rating", "createdAt"],
  },
  {
    nombre: "users",
    descripcion: "Los riders. Se unen a descensos y opiniones con $lookup.",
    campos: ["displayName (único)", "createdAt"],
  },
];

const INDICES = [
  {
    indice: "trails { start: \"2dsphere\" }",
    porque: "Búsquedas por cercanía ($geoNear) y \"¿estoy dentro del radio de salida?\" ($geoWithin).",
  },
  {
    indice: "trails { slug: 1 } único",
    porque: "Abrir un sendero directo desde la URL; la base rechaza dos slugs iguales.",
  },
  {
    indice: "descents { trailId, status, validated, durationMs }",
    porque: "El ranking: primero los campos de igualdad y al final el de orden, así los mejores tiempos salen ya ordenados.",
  },
  {
    indice: "descents { runId: 1 } único parcial",
    porque: "Cada corrida se guarda una sola vez aunque el pedido llegue repetido.",
  },
  {
    indice: "reviews { trailId: 1, createdAt: -1 }",
    porque: "Las opiniones de un sendero, la más nueva primero, sin ordenar en memoria.",
  },
  {
    indice: "users { displayName: 1 } único",
    porque: "Nombres de rider sin duplicados.",
  },
];

// Trail line drawn down the mountain; the rider follows the same path.
const TRAIL_PATH =
  "M360 74 C 420 110, 370 150, 450 168 S 530 214, 572 226 S 690 252, 770 292";

export default function AcercaPage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero: mountain, trail drawing itself, rider descending it */}
      <section className="dh-contours relative overflow-hidden bg-secondary text-white">
        <div className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-6">
          <p className="dh-fade-up font-mono text-xs font-bold uppercase tracking-[0.3em]">
            Nosotros
          </p>
          <h1
            className="dh-fade-up mt-2 max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Cuatro riders de datos, un cerro y una base MongoDB.
          </h1>
          <p
            className="dh-fade-up mt-4 max-w-xl text-base leading-relaxed text-white sm:text-lg"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            DH es nuestro proyecto para Diseño de Bases de Datos en la Universidad de Mendoza:
            medimos descensos de mountain bike con datos geográficos y armamos el ranking con
            consultas, aggregations e índices.
          </p>
        </div>

        <svg
          viewBox="0 0 800 320"
          className="mt-6 block w-full"
          role="img"
          aria-label="Ilustración: un rider baja por un sendero marcado en la montaña"
          preserveAspectRatio="xMidYMax meet"
        >
          <polygon
            points="0,320 0,250 120,180 220,212 360,62 470,140 560,112 700,202 800,170 800,320"
            fill="var(--text)"
            opacity="0.92"
          />
          {/* Snow cap */}
          <polygon points="360,62 392,98 374,92 360,106 344,94 328,100" fill="var(--bg)" />
          {/* Trail line drawing itself */}
          <path
            d={TRAIL_PATH}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="6"
            strokeLinecap="round"
            className="dh-draw"
            style={{ "--len": 700 } as React.CSSProperties}
          />
          {/* Start and finish flags */}
          <circle cx="360" cy="74" r="7" fill="var(--success)" stroke="var(--bg)" strokeWidth="2" />
          <circle cx="770" cy="292" r="7" fill="var(--danger)" stroke="var(--bg)" strokeWidth="2" />
          {/* Rider riding the trail (CSS offset-path follows TRAIL_PATH) */}
          <g className="dh-follow" style={{ offsetPath: `path("${TRAIL_PATH}")` }}>
            <svg x="-34" y="-46" width="68" height="48" viewBox="0 0 200 140" overflow="visible">
              <DownhillRider title="" />
            </svg>
          </g>
        </svg>
      </section>

      {/* Team as race number plates */}
      <section aria-labelledby="equipo-title" className="bg-background px-4 py-14 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <h2 id="equipo-title" className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            El equipo
          </h2>
          <p className="mt-2 max-w-xl text-text-muted">
            Cada uno con su placa de carrera, como en una largada de downhill.
          </p>

          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {EQUIPO.map((persona, i) => (
              <li
                key={persona.nombre}
                className="dh-fade-up group"
                style={{ "--i": i } as React.CSSProperties}
              >
                {/* The plate hangs from two zip ties and swings a little on hover. */}
                <div className="relative origin-top transition-transform duration-300 ease-out group-hover:rotate-[-3deg] motion-reduce:transition-none motion-reduce:group-hover:rotate-0">
                  <div aria-hidden="true" className="flex justify-center gap-16">
                    <span className="h-4 w-1.5 rounded-full bg-text" />
                    <span className="h-4 w-1.5 rounded-full bg-text" />
                  </div>
                  <div className="overflow-hidden rounded-2xl border-4 border-text bg-surface shadow-[6px_6px_0_var(--text)]">
                    <div className="flex items-center justify-between bg-primary px-4 py-2">
                      <DhLogo size={28} title="" />
                      <span className="font-mono text-xs font-bold uppercase tracking-widest text-text">
                        Rider
                      </span>
                    </div>
                    <div className="px-4 pb-5 pt-3 text-center">
                      <p className="font-mono text-7xl font-bold leading-none tracking-tighter text-text">
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-3 text-lg font-bold text-text">{persona.nombre}</p>
                      <p className="mt-1 font-mono text-xs font-semibold tracking-widest text-primary-ink">
                        {persona.iniciales} · DISEÑO DE BASES DE DATOS
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How the database is organized (the graded part) */}
      <section aria-labelledby="base-title" className="border-y border-border bg-surface-muted px-4 py-14 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-primary-ink">
            Bajo el capó
          </p>
          <h2 id="base-title" className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Cómo está organizada la base
          </h2>
          <p className="mt-2 max-w-2xl text-text-muted">
            MongoDB local, driver oficial y cuatro colecciones. La regla: embebemos lo que se lee
            junto y referenciamos lo que crece.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {COLECCIONES.map((coleccion, i) => (
              <article
                key={coleccion.nombre}
                className="dh-fade-up rounded-xl border border-border bg-surface p-5 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                style={{ "--i": i } as React.CSSProperties}
              >
                <h3 className="font-mono text-lg font-bold text-text">{coleccion.nombre}</h3>
                <p className="mt-1 text-sm text-text-muted">{coleccion.descripcion}</p>
                <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Campos de ${coleccion.nombre}`}>
                  {coleccion.campos.map((campo) => (
                    <li
                      key={campo}
                      className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-xs text-text"
                    >
                      {campo}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <h3 className="mt-12 text-2xl font-bold tracking-tight text-text">Índices y por qué</h3>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {INDICES.map((item) => (
              <li key={item.indice} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
                <code className="shrink-0 font-mono text-sm font-bold text-text sm:w-80">{item.indice}</code>
                <span className="text-sm text-text-muted">{item.porque}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-background px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-text">¿Listo para bajar?</h2>
        <p className="mt-2 text-text-muted">Elegí un sendero y probá el modo demo.</p>
        <Link href="/mapa" className={buttonClassName("primary", "lg", "mt-6")}>
          Ir al mapa
        </Link>
      </section>
    </main>
  );
}
