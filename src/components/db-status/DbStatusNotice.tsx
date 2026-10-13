"use client";

import { Notice } from "@/components/ui/Notice";

type DbStatus = "ok" | "offline" | "empty";

// Tells the user in which state the database is. Shows nothing when everything is fine.
export function DbStatusNotice({ dbStatus }: { dbStatus: DbStatus | null }) {
  if (dbStatus === "offline") {
    return (
      <div className="w-full">
        <Notice
          variant="warning"
          role="status"
          className="rounded-none border-x-0 border-t-0 py-2.5 px-4 text-xs"
        >
          Sin conexión a la base: mostrando datos de ejemplo (modo demo activo)
        </Notice>
      </div>
    );
  }

  if (dbStatus === "empty") {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <Notice
          variant="error"
          title="Base de datos vacía"
          role="alert"
          className="max-w-md text-left"
        >
          La base está vacía. Corré{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs font-semibold">
            npm run seed
          </code>{" "}
          en la terminal para cargar los datos iniciales.
        </Notice>
      </div>
    );
  }

  return null;
}
