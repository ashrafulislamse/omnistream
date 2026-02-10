import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (page: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function PaginationBar({
  page,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPrev,
  onNext,
  onGoTo,
  hasPrev,
  hasNext,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to show
  const pages: (number | "...")[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      <p className="text-xs text-muted-foreground">
        Showing {startIndex + 1}–{endIndex} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!hasPrev}
          onClick={onPrev}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onGoTo(p)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${
                p === page
                  ? "bg-primary/15 text-primary border border-primary/30 dark:bg-primary/20 dark:border-primary/40 shadow-sm dark:shadow-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 dark:hover:bg-secondary/80"
              }`}
            >
              {p}
            </button>
          )
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!hasNext}
          onClick={onNext}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
