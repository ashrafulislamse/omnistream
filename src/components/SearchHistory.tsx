import { useState } from "react";
import { Clock, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchHistoryEntry } from "@/hooks/useSearchHistory";

interface SearchHistoryProps {
  history: SearchHistoryEntry[];
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
  onClear: () => void;
}

const COLLAPSED_COUNT = 3;

export function SearchHistory({ history, onSelect, onRemove, onClear }: SearchHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) return null;

  const visible = expanded ? history : history.slice(0, COLLAPSED_COUNT);
  const hasMore = history.length > COLLAPSED_COUNT;

  return (
    <div className="w-full max-w-2xl mx-auto mt-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Searches
          <span className="text-xs bg-secondary/60 dark:bg-secondary/80 px-1.5 py-0.5 rounded-md text-foreground">{history.length}</span>
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive h-7">
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>
      <div className="space-y-1.5">
        {visible.map((entry) => (
          <div
            key={entry.url}
            className="glass-card px-3 sm:px-4 py-2.5 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => onSelect(entry.url)}
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-xs sm:text-sm text-foreground truncate font-mono">{entry.url}</p>
              {entry.fileName && (
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">{entry.fileName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground/60 hidden sm:block">
                {new Date(entry.timestamp).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(entry.url); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1.5"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Show less</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Show {history.length - COLLAPSED_COUNT} more</>
          )}
        </button>
      )}
    </div>
  );
}
