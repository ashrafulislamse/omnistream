import { useState } from "react";
import { useDownloadHistory } from "@/hooks/useDownloadHistory";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/PaginationBar";
import { History, Download, Loader2, Search, Calendar, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DownloadHistoryPage() {
  const { history, loading } = useDownloadHistory();
  const [search, setSearch] = useState("");

  const filtered = history.filter(
    (item) => !search || item.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const { paginatedItems, page, totalPages, startIndex, endIndex, totalItems, nextPage, prevPage, goToPage, hasNext, hasPrev } =
    usePagination(filtered, { pageSize: 15 });

  return (
    <div className="container px-4 py-6 sm:py-8 space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
            Download History
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {history.length} download{history.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Info banner */}
      {history.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <span>Download links expire. To re-download, go to <strong className="text-foreground">Saved Files</strong> and fetch fresh links.</span>
        </div>
      )}

      {/* Search */}
      {history.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search downloads..."
            className="pl-9 h-9 glass-card border-border/50 text-sm"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 sm:p-14 text-center">
          <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">
            {history.length === 0 ? "No download history yet." : "No downloads match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedItems.map((item) => (
            <div key={item.id} className="glass-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4 group hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-foreground truncate">{item.file_name}</p>
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  {item.file_type && <span className="capitalize">{item.file_type}</span>}
                  {item.file_size && <span>{item.file_size}</span>}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground/50 hidden sm:block shrink-0">Link expired</span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <PaginationBar
        page={page} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex}
        totalItems={totalItems} onPrev={prevPage} onNext={nextPage} onGoTo={goToPage}
        hasPrev={hasPrev} hasNext={hasNext}
      />
    </div>
  );
}
