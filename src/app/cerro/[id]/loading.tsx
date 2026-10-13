import { Skeleton } from "@/components/ui/Skeleton";

export default function TrailLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
      {/* Header skeleton */}
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-8 w-64 rounded" />
        <Skeleton className="h-4 w-40 rounded" />
      </div>

      {/* Map preview skeleton */}
      <Skeleton className="h-64 w-full rounded-xl" ariaLabel="Cargando mapa del trazado..." />

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>

      {/* Button action skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}
