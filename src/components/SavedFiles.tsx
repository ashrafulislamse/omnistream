import { Download, Trash2, Clock, Film, FileText, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FetchedFilesEntry } from "@/hooks/useFetchedFiles";
import type { TeraBoxFile } from "@/types/terabox";

interface SavedFilesProps {
  entries: FetchedFilesEntry[];
  onDownload: (file: TeraBoxFile) => void;
  onBulkDownload: (files: TeraBoxFile[]) => void;
  onRemove: (id: string) => void;
  onRefetch: (url: string) => void;
}

export function SavedFiles({ entries, onDownload, onBulkDownload, onRemove, onRefetch }: SavedFilesProps) {
  if (entries.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in-up">
      <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
        <HardDrive className="w-5 h-5 text-primary" />
        Saved Files ({entries.length})
      </h3>
      <p className="text-sm text-muted-foreground">Download previously fetched files without another API call.</p>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {entry.files[0]?.name || entry.source_url}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {new Date(entry.created_at).toLocaleDateString()} · {entry.file_count} file{entry.file_count > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {entry.files.length > 1 && (
                  <Button size="sm" variant="outline" className="text-xs border-primary/30 text-primary" onClick={() => onBulkDownload(entry.files)}>
                    <Download className="w-3 h-3 mr-1" />All
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => onRefetch(entry.source_url)}>
                  Refetch
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => onRemove(entry.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {entry.files.map((file) => (
                <button
                  key={file.fs_id}
                  onClick={() => onDownload(file)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/60 hover:bg-primary/10 transition-colors text-xs text-foreground"
                >
                  {file.type === "video" ? <Film className="w-3 h-3 text-primary" /> : <FileText className="w-3 h-3 text-primary" />}
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <span className="text-muted-foreground">{file.size_formatted}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
