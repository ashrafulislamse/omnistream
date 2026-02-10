import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { useFreshLinks } from "@/hooks/useFreshLinks";
import { useLinkHealth } from "@/hooks/useLinkHealth";
import { usePagination } from "@/hooks/usePagination";
import { useThumbnailProxy } from "@/hooks/useThumbnailProxy";
import { PaginationBar } from "@/components/PaginationBar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { EmptyState } from "@/components/EmptyState";
import { FileCardSkeletonGrid } from "@/components/skeletons/FileCardSkeleton";
import { Heart, Trash2, Download, Loader2, Search, LayoutGrid, LayoutList, Play, RefreshCw, AlertTriangle, CheckCircle, HelpCircle, ShieldCheck, X, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { TeraBoxFile } from "@/types/terabox";

export default function Favorites() {
  const navigate = useNavigate();
  const { favorites, loading, removeFavorite } = useFavorites();
  const { getFreshFile, forceRefresh, isFetchingUrl, getCacheTime } = useFreshLinks();
  const { getHealth, brokenCount, loading: healthLoading, runHealthCheck } = useLinkHealth();
  const { getThumbnail, proxyThumbnails } = useThumbnailProxy();
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeVideo, setActiveVideo] = useState<TeraBoxFile | null>(null);
  const [activeSourceUrl, setActiveSourceUrl] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  // Proxy thumbnails when favorites load
  useEffect(() => {
    if (favorites.length > 0) {
      const thumbUrls = favorites.map((f) => f.thumbnail).filter(Boolean) as string[];
      proxyThumbnails(thumbUrls, () => forceUpdate((n) => n + 1));
    }
  }, [favorites, proxyThumbnails]);

  const filtered = favorites.filter(
    (f) => !search || f.file_name.toLowerCase().includes(search.toLowerCase())
  );

  const videoFavorites = filtered.filter((f) => f.file_type === "video");

  const { paginatedItems, page, totalPages, startIndex, endIndex, totalItems, nextPage, prevPage, goToPage, hasNext, hasPrev } =
    usePagination(filtered, { pageSize: 12 });

  const handleDownload = async (fav: typeof favorites[0]) => {
    if (!fav.source_url) {
      toast({ title: "No source URL", description: "Cannot re-fetch without the original link.", variant: "destructive" });
      return;
    }
    const fresh = await getFreshFile(fav.source_url, { name: fav.file_name });
    if (fresh) {
      const link = fresh.fast_download_link || fresh.download_link;
      window.open(link, "_blank");
    }
  };

  const handlePlay = async (fav: typeof favorites[0]) => {
    if (!fav.source_url) {
      toast({ title: "No source URL", description: "Cannot stream without the original link.", variant: "destructive" });
      return;
    }
    try {
      const fresh = await getFreshFile(fav.source_url, { name: fav.file_name });
      if (fresh?.stream_url) {
        setActiveVideo(fresh);
        setActiveSourceUrl(fav.source_url);
        setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      } else {
        toast({ title: "Link expired", description: "Could not refresh this link.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Playback failed", description: "Failed to load video.", variant: "destructive" });
    }
  };

  const handleRefreshFav = async (fav: typeof favorites[0]) => {
    if (!fav.source_url) return;
    await forceRefresh(fav.source_url);
    forceUpdate((n) => n + 1);
  };

  const formatCacheAge = (sourceUrl: string | null) => {
    if (!sourceUrl) return null;
    const ts = getCacheTime(sourceUrl);
    if (!ts) return null;
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  };

  return (
    <div className="container px-4 py-6 sm:py-8 space-y-5 animate-fade-in-up">
      {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
            Favorites
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {favorites.length} saved favorite{favorites.length !== 1 ? "s" : ""}
            {brokenCount > 0 && (
              <span className="ml-2 text-destructive font-medium">
                · {brokenCount} broken link{brokenCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={healthLoading || favorites.length === 0}
          onClick={runHealthCheck}
        >
          {healthLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          Check Link Health
        </Button>
      </div>

      {/* Inline Video Player */}
      {activeVideo && activeSourceUrl && (
        <div ref={playerRef} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground truncate flex-1">{activeVideo.name}</h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground shrink-0" onClick={() => { setActiveVideo(null); setActiveSourceUrl(null); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Close
            </Button>
          </div>
          <VideoPlayer file={activeVideo} sourceUrl={activeSourceUrl} onEnded={() => {}} />
        </div>
      )}

      {/* Search & View Toggle */}
      {favorites.length > 0 && (
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search favorites..."
              className="pl-9 h-9 glass-card border-border/50 text-sm"
            />
          </div>
          <div className="flex gap-0.5 border border-border/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FileCardSkeletonGrid count={6} />
        </div>
      ) : filtered.length === 0 ? (
        favorites.length === 0 ? (
          <EmptyState
            icon={<Heart className="w-10 h-10" />}
            title="No favorites yet"
            description="Save your favorite files for quick access. They'll be available across all your devices."
            action={{
              label: "Browse Files",
              onClick: () => navigate("/"),
            }}
          />
        ) : (
          <EmptyState
            icon={<Search className="w-10 h-10" />}
            title="No matches found"
            description="Try adjusting your search terms or clear the filter to see all favorites."
          />
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map((fav) => {
            const fetching = fav.source_url ? isFetchingUrl(fav.source_url) : false;
            const health = getHealth(fav.id);
            const isPlaying = activeVideo && fav.file_name === activeVideo.name;
            const healthBadge = health && health.status !== "healthy" ? (
              <div className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md ${
                health.status === "expired" ? "bg-amber-500/20 text-amber-400" :
                health.status === "broken" ? "bg-destructive/20 text-destructive" :
                "bg-muted/50 text-muted-foreground"
              }`}>
                {health.status === "expired" ? <AlertTriangle className="w-3 h-3" /> :
                 health.status === "broken" ? <AlertTriangle className="w-3 h-3" /> :
                 <HelpCircle className="w-3 h-3" />}
                {health.status === "expired" ? "Expired" : health.status === "broken" ? "Broken" : "Unknown"}
              </div>
            ) : health?.status === "healthy" ? (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md bg-primary/20 text-primary">
                <CheckCircle className="w-3 h-3" />Healthy
              </div>
            ) : null;
            return (
              <div key={fav.id} className={`glass-card overflow-hidden group transition-all duration-300 ${isPlaying ? "border-primary/50 bg-primary/5" : health?.status === "broken" || health?.status === "expired" ? "border-destructive/30" : "hover:border-primary/30"}`}>
                <div className="relative aspect-video bg-secondary/30">
                  {healthBadge}
                  {fav.thumbnail ? (
                    <ThumbnailImage 
                      src={fav.thumbnail} 
                      proxiedSrc={getThumbnail(fav.thumbnail)} 
                      alt={fav.file_name} 
                      showStorageIndicator 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                  )}
                  {fav.file_type === "video" && fav.source_url && (
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/30 cursor-pointer"
                      onClick={() => handlePlay(fav)}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center">
                        {fetching ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Play className="w-5 h-5 text-primary fill-primary ml-0.5" />}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-2">{fav.file_name}</h3>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {fav.file_type && <span className="px-2 py-0.5 rounded-md bg-secondary/50 capitalize">{fav.file_type}</span>}
                    {fav.file_size && <span className="px-2 py-0.5 rounded-md bg-secondary/50">{fav.file_size}</span>}
                    {!fav.source_url && <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px]">No source</span>}
                  </div>
                  <div className="flex gap-2 items-center">
                    {(() => {
                      const age = formatCacheAge(fav.source_url);
                      return age ? <span className="text-[10px] text-muted-foreground" title="Links last refreshed">↻ {age}</span> : null;
                    })()}
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Refresh links" disabled={!fav.source_url || fetching} onClick={() => handleRefreshFav(fav)}>
                      {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="sm" className="flex-1 bg-primary text-primary-foreground text-xs" disabled={!fav.source_url || fetching} onClick={() => handleDownload(fav)}>
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => removeFavorite(fav.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedItems.map((fav) => {
            const fetching = fav.source_url ? isFetchingUrl(fav.source_url) : false;
            const isPlaying = activeVideo && fav.file_name === activeVideo.name;
            return (
              <div key={fav.id} className={`glass-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4 group transition-colors ${isPlaying ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"}`}>
                <div className="w-14 h-10 sm:w-20 sm:h-12 rounded-lg overflow-hidden shrink-0 bg-secondary/30 relative">
                  {fav.thumbnail ? (
                    <ThumbnailImage 
                      src={fav.thumbnail} 
                      proxiedSrc={getThumbnail(fav.thumbnail)} 
                      alt="" 
                      showStorageIndicator 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Heart className="w-4 h-4 text-muted-foreground/30" /></div>
                  )}
                  {fav.file_type === "video" && fav.source_url && (
                    <div 
                      className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => handlePlay(fav)}
                    >
                      <Play className="w-4 h-4 text-primary fill-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">{fav.file_name}</p>
                  <div className="flex gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {fav.file_type && <span className="capitalize">{fav.file_type}</span>}
                    {fav.file_size && <span>{fav.file_size}</span>}
                    {!fav.source_url && <span className="text-destructive">No source</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(() => {
                    const age = formatCacheAge(fav.source_url);
                    return age ? <span className="text-[10px] text-muted-foreground hidden sm:inline mr-1">↻ {age}</span> : null;
                  })()}
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Refresh links" disabled={!fav.source_url || fetching} onClick={() => handleRefreshFav(fav)}>
                    {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </Button>
                  {fav.file_type === "video" && fav.source_url && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hidden sm:flex" disabled={fetching} onClick={() => handlePlay(fav)}>
                      {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Play className="w-3.5 h-3.5 mr-1 fill-primary" />Watch</>}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" disabled={!fav.source_url || fetching} onClick={() => handleDownload(fav)}>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => removeFavorite(fav.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
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