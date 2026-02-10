import { Skeleton } from "@/components/ui/skeleton";
import { Play } from "lucide-react";

export function VideoPlayerSkeleton() {
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary/30">
      <Skeleton className="absolute inset-0 shimmer-skeleton" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center animate-pulse">
          <Play className="w-7 h-7 text-muted-foreground/50 ml-1" />
        </div>
      </div>
      {/* Fake controls bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/60 to-transparent">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full shimmer-skeleton" />
          <Skeleton className="h-1.5 flex-1 rounded-full shimmer-skeleton" />
          <Skeleton className="h-4 w-12 rounded shimmer-skeleton" />
        </div>
      </div>
    </div>
  );
}
