import { Skeleton } from "@/components/ui/skeleton";

export function StatsCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg shimmer-skeleton" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-20 shimmer-skeleton" />
          <Skeleton className="h-6 w-16 shimmer-skeleton" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full shimmer-skeleton" />
    </div>
  );
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}
