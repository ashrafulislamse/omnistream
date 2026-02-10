import { useState, useEffect } from "react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { useThumbnailProxy } from "@/hooks/useThumbnailProxy";
import type { WatchEntry } from "@/hooks/useWatchHistory";

interface ContinueWatchingProps {
  entries: WatchEntry[];
  onSelect: (entry: WatchEntry) => void;
}

const PAGE_SIZE = 6;

export function ContinueWatching({ entries, onSelect }: ContinueWatchingProps) {
  const [page, setPage] = useState(0);
  const { getThumbnail, proxyThumbnails } = useThumbnailProxy();
  const [, forceUpdate] = useState(0);

  // Proxy thumbnails when entries load
  useEffect(() => {
    if (entries.length > 0) {
      const thumbUrls = entries.map((e) => e.thumbnail).filter(Boolean) as string[];
      proxyThumbnails(thumbUrls, () => forceUpdate((n) => n + 1));
    }
  }, [entries, proxyThumbnails]);

  if (entries.length === 0) return null;

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const visible = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatTime = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Play className="w-4 h-4 text-primary fill-primary" />
          Continue Watching
          <span className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded-md">{entries.length}</span>
        </h3>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-muted-foreground font-medium px-1">
              {page + 1}/{totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {visible.map((entry) => (
          <button
            key={entry.fileId}
            onClick={() => onSelect(entry)}
            className="glass-card overflow-hidden text-left group hover:border-primary/30 transition-all duration-300"
          >
            <div className="relative aspect-video bg-muted/10">
              {entry.thumbnail ? (
                <ThumbnailImage 
                  src={entry.thumbnail} 
                  proxiedSrc={getThumbnail(entry.thumbnail)} 
                  alt={entry.fileName} 
                  showStorageIndicator 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/30">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center">
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-primary ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-sm text-[10px] font-mono text-foreground">
                {formatTime(entry.position)} / {formatTime(entry.duration)}
              </div>
            </div>
            <div className="px-2.5 pt-2">
              <Progress value={(entry.position / entry.duration) * 100} className="h-1 bg-muted/20" />
            </div>
            <div className="p-2.5 pt-1.5">
              <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 leading-tight">{entry.fileName}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{Math.round((entry.position / entry.duration) * 100)}% watched</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}