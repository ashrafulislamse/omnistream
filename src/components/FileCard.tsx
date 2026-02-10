import { Download, Zap, Film, FileText, Music, HardDrive, Heart, Share2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { useThumbnailProxy } from "@/hooks/useThumbnailProxy";
import type { TeraBoxFile } from "@/types/terabox";

interface FileCardProps {
  file: TeraBoxFile;
  onDownload?: () => void;
  onFavorite?: () => void;
  onShare?: () => void;
  isFavorited?: boolean;
  /** Compact mode for sidebar playlist items */
  compact?: boolean;
  /** Highlight as currently playing */
  isActive?: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  video: <Film className="w-4 h-4" />,
  audio: <Music className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
};

export function FileCard({ file, onDownload, onFavorite, onShare, isFavorited, compact, isActive }: FileCardProps) {
  const { getThumbnail } = useThumbnailProxy();

  // Compact mode — used in sidebar playlists
  if (compact) {
    return (
      <div className={`flex gap-3 p-2.5 rounded-xl transition-all group cursor-pointer ${
        isActive
          ? "bg-primary/10 border border-primary/30 shadow-sm shadow-primary/5"
          : "hover:bg-secondary/60 border border-transparent"
      }`}>
        {/* Thumbnail */}
        <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-secondary/30">
          {file.thumbnail ? (
            <ThumbnailImage src={file.thumbnail} proxiedSrc={getThumbnail(file.thumbnail)} alt={file.name} showStorageIndicator />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {typeIcons[file.type] || <HardDrive className="w-5 h-5" />}
            </div>
          )}
          {isActive && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-primary fill-primary" />
            </div>
          )}
          {file.quality && (
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-background/80 text-[9px] font-mono text-primary font-semibold">{file.quality}</span>
          )}
          {file.duration && (
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-background/80 text-[9px] font-mono text-foreground">{file.duration}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
          <div>
            <p className={`text-xs font-medium leading-snug line-clamp-2 ${isActive ? "text-primary" : "text-foreground"}`}>{file.name}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{file.size_formatted}</p>
          </div>
          <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDownload && (
              <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Download">
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            {onFavorite && (
              <button onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                className={`p-1 rounded-md transition-colors ${isFavorited ? "text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`} title="Favorite">
                <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-primary" : ""}`} />
              </button>
            )}
            {onShare && (
              <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Share">
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full card mode
  return (
    <div className="glass-card glow-border p-4 sm:p-5 animate-fade-in-up space-y-3 hover:border-primary/30 transition-all duration-300 group">
      {file.thumbnail && (
        <div className="relative aspect-video rounded-lg overflow-hidden">
          <ThumbnailImage src={file.thumbnail} proxiedSrc={getThumbnail(file.thumbnail)} alt={file.name} showStorageIndicator />
          {onFavorite && (
            <button
              onClick={onFavorite}
              className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all ${
                isFavorited ? "bg-primary/20 text-primary" : "bg-background/60 text-muted-foreground hover:text-primary"
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? "fill-primary" : ""}`} />
            </button>
          )}
          {file.quality && (
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-xs font-mono text-primary font-semibold">{file.quality}</span>
          )}
          {file.duration && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-xs font-mono text-foreground">{file.duration}</span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold text-foreground text-sm sm:text-base leading-tight line-clamp-2">{file.name}</h3>
        <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {typeIcons[file.type] || <HardDrive className="w-4 h-4" />}
            {file.type}
          </span>
          <span>{file.size_formatted}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={onDownload} size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-8 sm:h-9">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="flex-1 border-primary/30 text-primary hover:bg-primary/10 text-xs sm:text-sm h-8 sm:h-9"
        >
          <a href={file.fast_download_link} target="_blank" rel="noopener noreferrer">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Fast
          </a>
        </Button>
        {onShare && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 border-primary/30 text-primary hover:bg-primary/10 h-8 w-8 sm:h-9 sm:w-9"
            onClick={onShare}
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}