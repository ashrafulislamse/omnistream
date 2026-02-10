import { Download, Pause, Play, X, CheckCircle, AlertCircle, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DownloadItem } from "@/hooks/useDownloadQueue";

interface DownloadQueueProps {
  queue: DownloadItem[];
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  onReorder?: (from: number, to: number) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  queued: <Download className="w-4 h-4 text-muted-foreground" />,
  downloading: <Download className="w-4 h-4 text-primary animate-pulse" />,
  paused: <Pause className="w-4 h-4 text-accent" />,
  completed: <CheckCircle className="w-4 h-4 text-primary" />,
  failed: <AlertCircle className="w-4 h-4 text-destructive" />,
};

export function DownloadQueue({ queue, onStart, onPause, onResume, onRemove, onClearCompleted, onReorder }: DownloadQueueProps) {
  if (queue.length === 0) return null;

  const hasCompleted = queue.some((d) => d.status === "completed" || d.status === "failed");

  return (
    <div className="w-full glass-card p-4 sm:p-6 animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
          <Download className="w-5 h-5 text-primary" />
          Download Queue ({queue.length})
        </h3>
        {hasCompleted && (
          <Button variant="ghost" size="sm" onClick={onClearCompleted} className="text-xs text-muted-foreground">
            <Trash2 className="w-3 h-3 mr-1" />
            Clear Done
          </Button>
        )}
      </div>

      <div className="space-y-2 sm:space-y-3">
        {queue.map((item, index) => (
          <div key={item.id} className="bg-background/50 rounded-lg p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Reorder controls */}
                {onReorder && queue.length > 1 && (
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => index > 0 && onReorder(index, index - 1)}
                      disabled={index === 0}
                      className="p-0.5 rounded hover:bg-secondary/50 disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => index < queue.length - 1 && onReorder(index, index + 1)}
                      disabled={index === queue.length - 1}
                      className="p-0.5 rounded hover:bg-secondary/50 disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                )}
                {statusIcons[item.status]}
                <span className="text-xs sm:text-sm text-foreground truncate">{item.file.name}</span>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                {item.status === "queued" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStart(item.id)}>
                    <Play className="w-3 h-3" />
                  </Button>
                )}
                {item.status === "downloading" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPause(item.id)}>
                    <Pause className="w-3 h-3" />
                  </Button>
                )}
                {item.status === "paused" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onResume(item.id)}>
                    <Play className="w-3 h-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onRemove(item.id)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {(item.status === "downloading" || item.status === "paused") && (
              <div className="space-y-1">
                <Progress value={item.progress} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(item.progress)}%</span>
                  {item.speed && <span>{item.speed}</span>}
                </div>
              </div>
            )}

            {item.status === "completed" && (
              <p className="text-xs text-primary">Download complete</p>
            )}
            {item.status === "failed" && (
              <p className="text-xs text-destructive">{item.error || "Download failed"}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
