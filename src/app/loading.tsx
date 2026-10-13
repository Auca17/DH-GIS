import { Skeleton } from "@/components/ui/Skeleton";

export default function RootLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 space-y-4">
      <Skeleton className="h-8 w-48 rounded" ariaLabel="Cargando contenido..." />
      <Skeleton className="h-4 w-72 rounded" ariaLabel="Cargando datos..." />
      <div className="flex gap-4 pt-4">
        <Skeleton className="h-24 w-36 rounded-xl" />
        <Skeleton className="h-24 w-36 rounded-xl" />
      </div>
    </div>
  );
}
