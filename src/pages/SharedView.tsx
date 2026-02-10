import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSharedLink, type SharedLink } from "@/hooks/useSharedLinks";
import { useFetchedFiles } from "@/hooks/useFetchedFiles";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Download, Zap, Film, FileText, Music, HardDrive, Loader2, Share2, ArrowLeft, Play, Import } from "lucide-react";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { useThumbnailProxy } from "@/hooks/useThumbnailProxy";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { TeraBoxFile } from "@/types/terabox";

const typeIcons: Record<string, React.ReactNode> = {
  video: <Film className="w-5 h-5" />,
  audio: <Music className="w-5 h-5" />,
  document: <FileText className="w-5 h-5" />,
};

export default function SharedView() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const [shared, setShared] = useState<SharedLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<TeraBoxFile | null>(null);
  const [importing, setImporting] = useState(false);
  const { save } = useFetchedFiles();
  const { toast } = useToast();
  const { getThumbnail, proxyThumbnails } = useThumbnailProxy();

  // Proxy thumbnails when shared data loads
  useEffect(() => {
    if (shared?.file_data?.length) {
      const thumbUrls = shared.file_data.map((f: TeraBoxFile) => f.thumbnail).filter(Boolean);
      proxyThumbnails(thumbUrls);
    }
  }, [shared, proxyThumbnails]);
  useEffect(() => {
    if (!code || !user) return;
    setLoading(true);
    fetchSharedLink(code)
      .then((result) => {
        if (!result) setError("This shared link doesn't exist or has expired.");
        else setShared(result);
      })
      .catch(() => setError("Failed to load shared files."))
      .finally(() => setLoading(false));
  }, [code, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to={`/auth?redirect=/s/${code}`} replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !shared) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md mx-auto space-y-4">
          <Share2 className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <h1 className="text-xl font-bold text-foreground">Link Not Found</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Go to OmniStream
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Share2 className="w-3.5 h-3.5 text-primary" />
            Shared via OmniStream
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {shared.title || "Shared Files"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {shared.file_count} file{shared.file_count !== 1 ? "s" : ""} · {shared.view_count} view{shared.view_count !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Video Player */}
        {activeVideo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground truncate flex-1">{activeVideo.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setActiveVideo(null)} className="text-xs text-muted-foreground">
                Close Player
              </Button>
            </div>
            <VideoPlayer file={activeVideo} sourceUrl={shared.source_url} />
          </div>
        )}

        {/* Files */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {shared.file_data.map((file: TeraBoxFile) => {
            const isVideo = file.type === "video";
            const isPlaying = activeVideo?.fs_id === file.fs_id;
            return (
              <div key={file.fs_id} className={`glass-card p-3 sm:p-5 space-y-3 sm:space-y-4 transition-colors ${isPlaying ? "border-primary/50 bg-primary/5" : ""}`}>
                {file.thumbnail && (
                  <div
                    className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => isVideo && setActiveVideo(file)}
                  >
                    <ThumbnailImage src={file.thumbnail} proxiedSrc={getThumbnail(file.thumbnail)} alt={file.name} showStorageIndicator />
                    {isVideo && (
                      <div className="absolute inset-0 bg-background/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-14 h-14 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center">
                          <Play className="w-6 h-6 text-primary fill-primary ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">{file.name}</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {typeIcons[file.type] || <HardDrive className="w-3.5 h-3.5" />}
                      {file.type}
                    </span>
                    <span>{file.size_formatted}</span>
                    {file.quality && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono text-[10px] font-medium">{file.quality}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  {isVideo && (
                    <Button size="sm" variant="outline" className="border-primary/30 text-primary h-8 text-xs touch-manipulation" onClick={() => setActiveVideo(file)}>
                      <Play className="w-3 h-3 mr-1 fill-primary" /> Play
                    </Button>
                  )}
                  <Button size="sm" className="flex-1 bg-primary text-primary-foreground h-8 text-xs touch-manipulation" asChild>
                    <a href={file.download_link} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3 h-3 mr-1" /> Download
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-primary/30 text-primary h-8 text-xs touch-manipulation" asChild>
                    <a href={file.fast_download_link} target="_blank" rel="noopener noreferrer">
                      <Zap className="w-3 h-3 mr-1" /> Fast
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Import to Library */}
        <div className="glass-card p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Import these files to your own library for easy access later</p>
          <Button
            className="bg-primary text-primary-foreground"
            disabled={importing}
            onClick={async () => {
              if (!shared) return;
              setImporting(true);
              try {
                await save(shared.source_url, shared.file_data);
                toast({ title: "Imported!", description: `${shared.file_count} file(s) added to your saved files.` });
              } catch {
                toast({ title: "Import failed", variant: "destructive" });
              }
              setImporting(false);
            }}
          >
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Import className="w-4 h-4 mr-2" />}
            Import to My Library
          </Button>
        </div>
      </div>
    </div>
  );
}
