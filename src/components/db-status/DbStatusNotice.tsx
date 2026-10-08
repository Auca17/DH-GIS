"use client";

type DbStatus = "ok" | "offline" | "empty";

// Tells the user in which state the database is. Shows nothing when everything is fine.
export function DbStatusNotice({ dbStatus }: { dbStatus: DbStatus | null }) {
  if (dbStatus === "offline") {
    return (
      <div
        role="status"
        className="border-b border-border bg-surface-muted px-4 py-2 text-center text-xs font-medium text-foreground/70"
      >
        Sin conexión a la base: mostrando datos de ejemplo
      </div>
    );
  }

  if (dbStatus === "empty") {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-foreground/60">
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          La base está vacía. Corré <code className="font-mono">npm run seed</code> en la terminal.
        </p>
      </main>
    );
  }

  return null;
}
