import { Skeleton } from "@/components/ui/skeleton";

interface FileCardSkeletonProps {
  compact?: boolean;
}

export function FileCardSkeleton({ compact }: FileCardSkeletonProps) {
  if (compact) {
    return (
      <div className="flex gap-3 p-2.5 rounded-xl border border-transparent">
        <Skeleton className="w-28 sm:w-32 aspect-video rounded-lg shrink-0 shimmer-skeleton" />
        <div className="flex-1 py-0.5 space-y-2">
          <Skeleton className="h-4 w-full shimmer-skeleton" />
          <Skeleton className="h-3 w-20 shimmer-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-5 space-y-3">
      <Skeleton className="aspect-video rounded-lg shimmer-skeleton" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4 shimmer-skeleton" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16 rounded-md shimmer-skeleton" />
          <Skeleton className="h-4 w-12 rounded-md shimmer-skeleton" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-9 flex-1 rounded-md shimmer-skeleton" />
        <Skeleton className="h-9 flex-1 rounded-md shimmer-skeleton" />
        <Skeleton className="h-9 w-9 rounded-md shimmer-skeleton" />
      </div>
    </div>
  );
}

export function FileCardSkeletonGrid({ count = 6, compact }: { count?: number; compact?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <FileCardSkeleton key={i} compact={compact} />
      ))}
    </>
  );
}
