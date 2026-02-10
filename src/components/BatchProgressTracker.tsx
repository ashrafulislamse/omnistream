import { CheckCircle2, XCircle, Loader2, Clock, Link2, RotateCcw } from "lucide-react";

export type BatchItemStatus = "pending" | "fetching" | "done" | "failed";

export interface BatchItem {
  url: string;
  status: BatchItemStatus;
  fileName?: string;
  fileCount?: number;
  error?: string;
}

interface BatchProgressTrackerProps {
  items: BatchItem[];
  onDismiss: () => void;
  onRetry?: (url: string) => void;
  onRetryAllFailed?: () => void;
}

const statusConfig: Record<BatchItemStatus, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, color: "text-muted-foreground" },
  fetching: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-primary" },
  done: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-primary" },
  failed: { icon: <XCircle className="w-3.5 h-3.5" />, color: "text-destructive" },
};

export function BatchProgressTracker({ items, onDismiss, onRetry, onRetryAllFailed }: BatchProgressTrackerProps) {
  if (items.length === 0) return null;

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const total = items.length;
  const allFinished = done + failed === total;
  const progressPct = ((done + failed) / total) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto glass-card p-4 space-y-3 animate-fade-in-up glow-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Batch Fetch
          </span>
          <span className="text-xs text-muted-foreground">
            {done}/{total} complete{failed > 0 ? ` · ${failed} failed` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {failed > 1 && onRetryAllFailed && (
            <button
              onClick={onRetryAllFailed}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Retry All Failed
            </button>
          )}
          {allFinished && (
            <button
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-secondary/50 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {items.map((item, i) => {
          const cfg = statusConfig[item.status];
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                item.status === "fetching" ? "bg-primary/5" : "bg-background/40"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-secondary/50 text-xs font-mono flex items-center justify-center shrink-0 text-muted-foreground">
                {i + 1}
              </span>
              <span className={`shrink-0 ${cfg.color}`}>{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                {item.status === "done" && item.fileName ? (
                  <p className="text-xs text-foreground truncate">{item.fileName} <span className="text-muted-foreground">({item.fileCount} file{(item.fileCount || 0) > 1 ? "s" : ""})</span></p>
                ) : item.status === "failed" ? (
                  <p className="text-xs text-destructive truncate">{item.error || "Failed to fetch"}</p>
                ) : (
                  <p className="text-xs text-muted-foreground truncate font-mono">{item.url}</p>
                )}
              </div>
              {item.status === "failed" && onRetry ? (
                <button
                  onClick={() => onRetry(item.url)}
                  className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Retry
                </button>
              ) : (
                <span className={`text-[10px] font-medium uppercase tracking-wide ${cfg.color}`}>
                  {item.status}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
