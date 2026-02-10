import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedLinks } from "@/hooks/useSharedLinks";
import { Share2, Trash2, Copy, ExternalLink, Loader2, Eye, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SharedLinksPage() {
  const { user } = useAuth();
  const { links, loading, deleteShareLink } = useSharedLinks();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  if (!user) return <Navigate to="/auth" replace />;

  const handleCopy = async (code: string) => {
    const url = `${window.location.origin}/s/${code}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: url });
  };

  const handleDelete = async (id: string) => {
    setDeleting((prev) => new Set(prev).add(id));
    await deleteShareLink(id);
    setDeleting((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast({ title: "Shared link deleted" });
  };

  const handleOpen = (code: string) => {
    window.open(`/s/${code}`, "_blank");
  };

  return (
    <div className="container px-4 py-6 sm:py-8 space-y-5 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Share2 className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
          My Shared Links
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {links.length} shared link{links.length !== 1 ? "s" : ""} · Anyone with the link can view & download
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : links.length === 0 ? (
        <div className="glass-card p-10 sm:p-14 text-center">
          <Share2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">
            No shared links yet. Share files from the home page or saved files to create links.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="glass-card p-4 sm:p-5 space-y-3 hover:border-primary/30 transition-colors"
            >
              {/* Title & meta */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground text-sm truncate">
                    {link.title || "Shared Files"}
                  </h3>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {link.file_count} file{link.file_count !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {link.view_count} view{link.view_count !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(link.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* File previews */}
              <div className="flex flex-wrap gap-1.5">
                {link.file_data.slice(0, 4).map((file, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/40 text-[10px] text-muted-foreground max-w-[180px]">
                    <FileText className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
                {link.file_data.length > 4 && (
                  <span className="px-2 py-1 rounded-md bg-secondary/40 text-[10px] text-muted-foreground">
                    +{link.file_data.length - 4} more
                  </span>
                )}
              </div>

              {/* Share URL & Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/40 min-w-0">
                  <span className="text-xs text-muted-foreground font-mono truncate">
                    {window.location.origin}/s/{link.share_code}
                  </span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs border-primary/30 text-primary gap-1.5"
                    onClick={() => handleCopy(link.share_code)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs gap-1.5"
                    onClick={() => handleOpen(link.share_code)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
                    disabled={deleting.has(link.id)}
                    onClick={() => handleDelete(link.id)}
                  >
                    {deleting.has(link.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
