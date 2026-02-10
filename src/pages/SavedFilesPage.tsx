import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFetchedFiles } from "@/hooks/useFetchedFiles";
import { useDownloadQueue } from "@/hooks/useDownloadQueue";
import { useDownloadHistory } from "@/hooks/useDownloadHistory";
import { usePagination } from "@/hooks/usePagination";
import { useFreshLinks } from "@/hooks/useFreshLinks";
import { useSharedLinks } from "@/hooks/useSharedLinks";
import { useThumbnailProxy } from "@/hooks/useThumbnailProxy";
import { useFuzzySearch, applyFileFilters, type FileFilters } from "@/hooks/useFuzzySearch";
import { PaginationBar } from "@/components/PaginationBar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AutoplayCountdown } from "@/components/AutoplayCountdown";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, Search, Trash2, Clock, Film, FileText, Music,
  HardDrive, RefreshCw, Play, X, LayoutGrid, LayoutList,
  FolderOpen, Link2, CalendarDays, ChevronDown, ChevronRight,
  CheckSquare, Square, MinusSquare, Loader2, Share2, Expand, Shrink,
  SkipForward, ToggleLeft, ToggleRight, Filter, Sparkles,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { TeraBoxFile } from "@/types/terabox";

const typeFilters = ["all", "video", "audio", "document", "other"] as const;
const groupModes = ["none", "date", "source"] as const;
type GroupMode = typeof groupModes[number];

type FileWithMeta = TeraBoxFile & { _entryId: string; _sourceUrl: string; _savedAt: string };

interface FileGroup {
  key: string;
  label: string;
  sublabel?: string;
  files: FileWithMeta[];
}

function groupFiles(files: FileWithMeta[], mode: GroupMode): FileGroup[] {
  if (mode === "none") return [{ key: "all", label: "All Files", files }];

  const map = new Map<string, FileWithMeta[]>();

  for (const f of files) {
    let key: string;
    if (mode === "date") {
      key = new Date(f._savedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } else {
      key = f._sourceUrl;
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(f);
  }

  return Array.from(map.entries()).map(([key, files]) => ({
    key,
    label: mode === "date" ? key : files[0]?.name?.split(".")[0] || key,
    sublabel: mode === "source" ? key : undefined,
    files,
  }));
}

const groupModeConfig: Record<GroupMode, { icon: React.ReactNode; label: string }> = {
  none: { icon: <LayoutList className="w-3.5 h-3.5" />, label: "No grouping" },
  date: { icon: <CalendarDays className="w-3.5 h-3.5" />, label: "By Date" },
  source: { icon: <Link2 className="w-3.5 h-3.5" />, label: "By Source" },
};

export default function SavedFilesPage() {
  const { user } = useAuth();
  const { entries, loading, remove, reload } = useFetchedFiles();
  const { bulkDownload, addToQueue } = useDownloadQueue();
  const { recordDownload } = useDownloadHistory();
  const { getFreshFile, getWorkingFile, refetch, forceRefresh, isFetchingUrl, getCacheTime, seedCache } = useFreshLinks();
  const { createShareLink } = useSharedLinks();
  const { getThumbnail, proxyThumbnails } = useThumbnailProxy();
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeVideo, setActiveVideo] = useState<FileWithMeta | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [theaterMode, setTheaterMode] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [autoplayNext, setAutoplayNext] = useState<FileWithMeta | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FileFilters>({ type: "all" });
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const selectionMode = selected.size > 0;
  
  // Seed link cache from DB entries on load — prevents API calls after refresh
  useEffect(() => {
    if (entries.length > 0) {
      seedCache(entries);
    }
  }, [entries, seedCache]);

  const allFiles = useMemo(() => {
    return entries.flatMap((e) =>
      e.files.map((f) => ({ ...f, _entryId: e.id, _sourceUrl: e.source_url, _savedAt: e.created_at }))
    );
  }, [entries]);

  // Proxy thumbnails in background when files load
  useEffect(() => {
    if (allFiles.length > 0) {
      const thumbUrls = allFiles.map((f) => f.thumbnail).filter(Boolean);
      proxyThumbnails(thumbUrls, () => forceUpdate((n) => n + 1));
    }
  }, [allFiles, proxyThumbnails]);

  // Fuzzy search hook
  const { search: fuzzySearch } = useFuzzySearch(allFiles, {
    keys: ["name"],
    threshold: 0.2,
  });

  // Generate search suggestions from file names
  useEffect(() => {
    if (search.length >= 2) {
      const results = fuzzySearch(search).slice(0, 5);
      const suggestions = results.map(r => r.item.name);
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
    }
  }, [search, fuzzySearch]);

  const filtered = useMemo(() => {
    // Apply fuzzy search if there's a query
    let results = search
      ? fuzzySearch(search).map(r => r.item)
      : allFiles;
    
    // Apply type filter from quick tabs
    if (typeFilter !== "all") {
      results = results.filter(f => f.type === typeFilter);
    }
    
    // Apply advanced filters
    results = applyFileFilters(results, filters);
    
    return results;
  }, [allFiles, search, typeFilter, filters, fuzzySearch]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allFiles.length };
    allFiles.forEach((f) => {
      counts[f.type] = (counts[f.type] || 0) + 1;
    });
    return counts;
  }, [allFiles]);

  const groups = useMemo(() => groupFiles(filtered, groupMode), [filtered, groupMode]);

  const pagination = usePagination(filtered, { pageSize: 16 });
  const videoFiles = useMemo(() => filtered.filter((f) => f.type === "video"), [filtered]);

  if (!user) return <Navigate to="/auth" replace />;

  const handleDownload = async (file: FileWithMeta) => {
    const fresh = await getFreshFile(file._sourceUrl, { fs_id: file.fs_id, name: file.name });
    if (fresh) {
      addToQueue(fresh);
      recordDownload(fresh);
    }
  };

  const handleBulkDownload = async () => {
    // Group by source URL to minimize API calls
    const bySource = new Map<string, FileWithMeta[]>();
    filtered.forEach((f) => {
      if (!bySource.has(f._sourceUrl)) bySource.set(f._sourceUrl, []);
      bySource.get(f._sourceUrl)!.push(f);
    });
    for (const [sourceUrl] of bySource) {
      const freshFiles = await refetch(sourceUrl);
      if (freshFiles) {
        bulkDownload(freshFiles);
        freshFiles.forEach((f) => recordDownload(f));
      }
    }
  };

  const handlePlay = async (file: FileWithMeta) => {
    if (file.type !== "video") return;
    setAutoplayNext(null);
    try {
      // getWorkingFile tests the link first (HEAD check), only re-fetches if expired
      const working = await getWorkingFile(file._sourceUrl, file);
      if (working) {
        setActiveVideo({ ...file, ...working, _entryId: file._entryId, _sourceUrl: file._sourceUrl, _savedAt: file._savedAt });
        setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      } else {
        toast({ title: "Link expired", description: "Could not refresh this link. The source may no longer be available.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Playback failed", description: "Failed to load video. Try refreshing the link manually.", variant: "destructive" });
    }
  };

  const handleVideoEnded = () => {
    if (!autoplay || !activeVideo) return;
    const currentIdx = videoFiles.findIndex((f) => f.fs_id === activeVideo.fs_id);
    const nextFile = videoFiles[currentIdx + 1];
    if (nextFile) {
      setAutoplayNext(nextFile); // show countdown instead of instant play
    }
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelect = (fsId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fsId)) next.delete(fsId);
      else next.add(fsId);
      return next;
    });
  };

  const selectAll = () => {
    const currentFiles = groupMode === "none" ? (pagination.paginatedItems as FileWithMeta[]) : filtered;
    if (selected.size === currentFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(currentFiles.map((f) => f.fs_id)));
    }
  };

  const clearSelection = () => setSelected(new Set<number>());

  const handleBulkSelectedDownload = async () => {
    const selectedFiles = filtered.filter((f) => selected.has(f.fs_id));
    if (selectedFiles.length === 0) return;
    // Group by source URL
    const bySource = new Map<string, FileWithMeta[]>();
    selectedFiles.forEach((f) => {
      if (!bySource.has(f._sourceUrl)) bySource.set(f._sourceUrl, []);
      bySource.get(f._sourceUrl)!.push(f);
    });
    for (const [sourceUrl] of bySource) {
      const freshFiles = await refetch(sourceUrl);
      if (freshFiles) {
        bulkDownload(freshFiles);
        freshFiles.forEach((f) => recordDownload(f));
      }
    }
    clearSelection();
  };

  const handleBulkSelectedDelete = () => {
    const entryIds = new Set(filtered.filter((f) => selected.has(f.fs_id)).map((f) => f._entryId));
    entryIds.forEach((id) => remove(id));
    clearSelection();
  };

  const handleShareFile = async (file: FileWithMeta) => {
    const code = await createShareLink(file._sourceUrl, [file], file.name);
    if (code) {
      const shareUrl = `${window.location.origin}/s/${code}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Share link copied!", description: "Send this link to share this file." });
    } else {
      toast({ title: "Failed to create share link", variant: "destructive" });
    }
  };

  const handleShareSelected = async () => {
    const selectedFiles = filtered.filter((f) => selected.has(f.fs_id));
    if (selectedFiles.length === 0) return;
    const sourceUrl = selectedFiles[0]._sourceUrl;
    const code = await createShareLink(sourceUrl, selectedFiles, `${selectedFiles.length} shared files`);
    if (code) {
      const shareUrl = `${window.location.origin}/s/${code}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Share link copied!", description: `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} shared.` });
    } else {
      toast({ title: "Failed to create share link", variant: "destructive" });
    }
    clearSelection();
  };

  const handleRefreshFile = async (file: FileWithMeta) => {
    await forceRefresh(file._sourceUrl);
    forceUpdate((n) => n + 1);
  };

  const formatCacheAge = (sourceUrl: string) => {
    const ts = getCacheTime(sourceUrl);
    if (!ts) return null;
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  };

  const FileIcon = ({ type }: { type: string }) => {
    if (type === "video") return <Film className="w-5 h-5 text-muted-foreground" />;
    if (type === "audio") return <Music className="w-5 h-5 text-muted-foreground" />;
    return <FileText className="w-5 h-5 text-muted-foreground" />;
  };

  const renderFileList = (files: FileWithMeta[]) => (
    <div className="space-y-2">
      {files.map((file, idx) => {
        const isVideo = file.type === "video";
        const isPlaying = activeVideo?.fs_id === file.fs_id;
        const isSelected = selected.has(file.fs_id);
        return (
          <div
            key={`${file.fs_id}-${idx}`}
            className={`glass-card p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-colors group cursor-pointer ${
              isSelected ? "border-primary/50 bg-primary/5" : isPlaying ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"
            }`}
            onClick={() => selectionMode ? toggleSelect(file.fs_id) : isVideo && handlePlay(file)}
          >
            {/* Checkbox */}
            <div className="shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(file.fs_id); }}>
              <Checkbox checked={isSelected} className="h-4 w-4 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
            </div>
            <div className="relative w-12 h-8 sm:w-16 sm:h-10 rounded-lg overflow-hidden shrink-0">
              {file.thumbnail ? (
                <ThumbnailImage src={file.thumbnail} proxiedSrc={getThumbnail(file.thumbnail)} alt="" showStorageIndicator />
              ) : (
                <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                  <FileIcon type={file.type} />
                </div>
              )}
              {isVideo && !selectionMode && (
                <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 sm:w-5 h-4 sm:h-5 text-primary fill-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">{file.name}</p>
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                <span className="capitalize">{file.type}</span>
                <span>{file.size_formatted}</span>
                {file.quality && <span className="text-primary font-mono hidden sm:inline">{file.quality}</span>}
              </div>
            </div>
            {!selectionMode && (
              <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                {/* Cache age indicator */}
                {(() => {
                  const age = formatCacheAge(file._sourceUrl);
                  return age ? (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline mr-1" title="Links last refreshed">
                      ↻ {age}
                    </span>
                  ) : null;
                })()}
                <Button size="sm" variant="ghost" className="h-7 sm:h-8 text-xs text-muted-foreground" title="Refresh links" disabled={isFetchingUrl(file._sourceUrl)} onClick={() => handleRefreshFile(file)}>
                  {isFetchingUrl(file._sourceUrl) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
                {isVideo && (
                  <Button size="sm" variant="ghost" className="h-7 sm:h-8 text-xs text-primary hidden sm:flex" disabled={isFetchingUrl(file._sourceUrl)} onClick={() => handlePlay(file)}>
                    {isFetchingUrl(file._sourceUrl) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Play className="w-3.5 h-3.5 mr-1" />Watch</>}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 sm:h-8 text-xs" disabled={isFetchingUrl(file._sourceUrl)} onClick={() => handleDownload(file)}>
                  {isFetchingUrl(file._sourceUrl) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 sm:h-8 text-xs text-muted-foreground" title="Share" onClick={() => handleShareFile(file)}>
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderFileGrid = (files: FileWithMeta[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {files.map((file, idx) => {
        const isVideo = file.type === "video";
        const isPlaying = activeVideo?.fs_id === file.fs_id;
        const isSelected = selected.has(file.fs_id);
        return (
          <div
            key={`${file.fs_id}-${idx}`}
            className={`glass-card overflow-hidden transition-colors group cursor-pointer relative ${
              isSelected ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : isPlaying ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"
            }`}
            onClick={() => selectionMode ? toggleSelect(file.fs_id) : isVideo && handlePlay(file)}
          >
            {/* Checkbox overlay */}
            <div
              className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected || selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              onClick={(e) => { e.stopPropagation(); toggleSelect(file.fs_id); }}
            >
              <Checkbox checked={isSelected} className="h-4 w-4 border-background/80 bg-background/60 backdrop-blur-sm data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
            </div>
            <div className="relative aspect-video bg-secondary/30">
              {file.thumbnail ? (
                <ThumbnailImage src={file.thumbnail} proxiedSrc={getThumbnail(file.thumbnail)} alt="" showStorageIndicator />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><FileIcon type={file.type} /></div>
              )}
              {isVideo && !selectionMode && (
                <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-primary fill-primary" />
                </div>
              )}
              {file.quality && (
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-background/70 text-[9px] font-mono text-primary">{file.quality}</span>
              )}
            </div>
            <div className="p-2.5 space-y-1">
              <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="capitalize">{file.type}</span>
                <span>{file.size_formatted}</span>
              </div>
              {!selectionMode && (
                <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const age = formatCacheAge(file._sourceUrl);
                    return age ? (
                      <span className="text-[9px] text-muted-foreground self-center mr-auto" title="Links last refreshed">↻ {age}</span>
                    ) : null;
                  })()}
                  <Button size="sm" variant="ghost" className="h-6 px-1" title="Refresh links" disabled={isFetchingUrl(file._sourceUrl)} onClick={() => handleRefreshFile(file)}>
                    {isFetchingUrl(file._sourceUrl) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1 px-1" disabled={isFetchingUrl(file._sourceUrl)} onClick={() => handleDownload(file)}>
                    {isFetchingUrl(file._sourceUrl) ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 mr-0.5" />Download</>}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-1" title="Share" onClick={() => handleShareFile(file)}>
                    <Share2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );


  return (
    <div className="container px-4 py-6 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* Video Player + Playlist — YouTube-style layout */}
      {activeVideo && (
        <div ref={playerRef} className={`flex flex-col ${theaterMode ? "" : "lg:flex-row"} gap-4 scroll-mt-16`}>
          {/* Player */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground truncate flex-1">{activeVideo.name}</h2>
              <div className="flex items-center gap-1 shrink-0">
                {/* Autoplay toggle */}
                <button
                  onClick={() => setAutoplay(!autoplay)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    autoplay ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground"
                  }`}
                  title={autoplay ? "Autoplay ON" : "Autoplay OFF"}
                >
                  {autoplay ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Autoplay</span>
                </button>
                {/* Theater mode */}
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setTheaterMode(!theaterMode)}
                  title={theaterMode ? "Exit theater mode" : "Theater mode"}
                >
                  {theaterMode ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setActiveVideo(null); setTheaterMode(false); setAutoplayNext(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {(() => {
              const currentIdx = videoFiles.findIndex((f) => f.fs_id === activeVideo.fs_id);
              const nextFile = videoFiles[currentIdx + 1];
              return (
                <VideoPlayer 
                  file={activeVideo} 
                  sourceUrl={activeVideo._sourceUrl} 
                  onEnded={handleVideoEnded}
                  nextFile={nextFile || null}
                />
              );
            })()}
            {/* Autoplay countdown overlay */}
            {autoplayNext && (
              <AutoplayCountdown
                nextFileName={autoplayNext.name}
                nextThumbnail={autoplayNext.thumbnail}
                onPlay={() => handlePlay(autoplayNext)}
                onCancel={() => setAutoplayNext(null)}
              />
            )}
            {/* File info + next up */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="capitalize px-2 py-0.5 rounded-md bg-secondary/50">{activeVideo.type}</span>
                <span className="px-2 py-0.5 rounded-md bg-secondary/50">{activeVideo.size_formatted}</span>
                {activeVideo.quality && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono">{activeVideo.quality}</span>}
                {activeVideo.duration && <span className="px-2 py-0.5 rounded-md bg-secondary/50 font-mono">{activeVideo.duration}</span>}
              </div>
              {(() => {
                const currentIdx = videoFiles.findIndex((f) => f.fs_id === activeVideo.fs_id);
                const nextFile = videoFiles[currentIdx + 1];
                return nextFile ? (
                  <button
                    onClick={() => handlePlay(nextFile)}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors shrink-0"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline truncate max-w-[200px]">Next: {nextFile.name}</span>
                    <span className="sm:hidden">Next</span>
                  </button>
                ) : null;
              })()}
            </div>
          </div>

          {/* Playlist sidebar — hidden in theater mode */}
          {videoFiles.length > 1 && !theaterMode && (
            <div className="lg:w-80 xl:w-96 shrink-0">
              <div className="glass-card overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-primary" />
                    Playlist
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {videoFiles.findIndex((f) => f.fs_id === activeVideo.fs_id) + 1} / {videoFiles.length}
                    </span>
                  </div>
                </div>
                <div className="max-h-[400px] lg:max-h-[500px] overflow-y-auto">
                  {videoFiles.map((file, idx) => {
                    const isPlaying = file.fs_id === activeVideo.fs_id;
                    return (
                      <button
                        key={`${file.fs_id}-${idx}`}
                        onClick={() => handlePlay(file)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-secondary/40 ${
                          isPlaying ? "bg-primary/10 border-l-2 border-primary" : "border-l-2 border-transparent"
                        }`}
                      >
                        <div className="relative w-24 h-14 rounded-md overflow-hidden shrink-0 bg-secondary/30">
                          {file.thumbnail ? (
                            <ThumbnailImage src={file.thumbnail} proxiedSrc={getThumbnail(file.thumbnail)} alt="" showStorageIndicator={false} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
                          {isPlaying && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Play className="w-4 h-4 text-primary fill-primary" />
                            </div>
                          )}
                          {file.duration && (
                            <span className="absolute bottom-0.5 right-0.5 px-1 py-px rounded text-[9px] font-mono bg-background/80 text-foreground">
                              {file.duration}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${isPlaying ? "text-primary" : "text-foreground"}`}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                            <span>{file.size_formatted}</span>
                            {file.quality && <span className="text-primary font-mono">{file.quality}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
            Saved Files
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {allFiles.length} file{allFiles.length !== 1 ? "s" : ""} from {entries.length} link{entries.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="border-border/50">
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {filtered.length > 0 && (
            <Button size="sm" onClick={handleBulkDownload} className="bg-primary text-primary-foreground">
              <Download className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Download All</span> ({filtered.length})
            </Button>
          )}
        </div>
      </div>

      {/* Search, Filters, Group & View Toggle */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <span className="absolute left-8 top-1/2 -translate-y-1/2" title="Fuzzy search enabled">
              <Sparkles className="w-3 h-3 text-primary/60" />
            </span>
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Fuzzy search files..."
              className="pl-12 h-10 glass-card border-border/50"
            />
            {/* Search suggestions dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 glass-card border border-border/50 rounded-lg shadow-lg z-50 overflow-hidden">
                {searchSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors truncate"
                    onMouseDown={() => { setSearch(suggestion); setShowSuggestions(false); }}
                  >
                    <Search className="w-3 h-3 inline mr-2 text-muted-foreground" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Advanced filters */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={`border-border/50 ${Object.keys(filters).length > 1 ? "border-primary/50 text-primary" : ""}`}>
                  <Filter className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Filters</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 glass-card" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">File Size</Label>
                    <div className="flex gap-2">
                      <Select
                        value={filters.sizeMin?.toString() || ""}
                        onValueChange={(v) => setFilters(f => ({ ...f, sizeMin: v ? parseInt(v) : undefined }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Min size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any</SelectItem>
                          <SelectItem value="1048576">1 MB+</SelectItem>
                          <SelectItem value="10485760">10 MB+</SelectItem>
                          <SelectItem value="104857600">100 MB+</SelectItem>
                          <SelectItem value="1073741824">1 GB+</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={filters.sizeMax?.toString() || ""}
                        onValueChange={(v) => setFilters(f => ({ ...f, sizeMax: v ? parseInt(v) : undefined }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Max size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any</SelectItem>
                          <SelectItem value="10485760">10 MB</SelectItem>
                          <SelectItem value="104857600">100 MB</SelectItem>
                          <SelectItem value="1073741824">1 GB</SelectItem>
                          <SelectItem value="5368709120">5 GB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => { setFilters({ type: "all" }); setShowFilters(false); }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex gap-1 overflow-x-auto">
              {typeFilters.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors capitalize whitespace-nowrap ${
                    typeFilter === type
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {type} {typeCounts[type] ? `(${typeCounts[type]})` : ""}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 border border-border/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Group by selector */}
        <div className="flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground font-medium">Group:</span>
          <div className="flex gap-1">
            {groupModes.map((mode) => {
              const cfg = groupModeConfig[mode];
              return (
                <button
                  key={mode}
                  onClick={() => { setGroupMode(mode); setCollapsedGroups(new Set()); }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    groupMode === mode
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {cfg.icon}
                  <span className="hidden sm:inline">{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selection Toolbar */}
      {selectionMode && (
        <div className="glass-card p-3 flex flex-wrap items-center gap-2 sm:gap-3 border-primary/30 bg-primary/5 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="p-1 rounded hover:bg-primary/10 transition-colors">
              {selected.size === filtered.length ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <MinusSquare className="w-4 h-4 text-primary" />
              )}
            </button>
            <span className="text-xs font-medium text-foreground">
              {selected.size} selected
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary" onClick={handleBulkSelectedDownload}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Download ({selected.size})
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary" onClick={handleShareSelected}>
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Share ({selected.size})
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleBulkSelectedDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={clearSelection}>
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Select All toggle when not in selection mode */}
      {filtered.length > 0 && !selectionMode && (
        <div className="flex items-center gap-2">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Square className="w-3.5 h-3.5" />
            Select files
          </button>
        </div>
      )}

      {/* File Content */}
      {filtered.length === 0 ? (
        <div className="glass-card p-8 sm:p-12 text-center">
          <HardDrive className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {allFiles.length === 0 ? "No saved files yet. Fetch a TerraBox link to get started." : "No files match your search."}
          </p>
        </div>
      ) : groupMode === "none" ? (
        <>
          {viewMode === "list" ? renderFileList(pagination.paginatedItems as FileWithMeta[]) : renderFileGrid(pagination.paginatedItems as FileWithMeta[])}
          <PaginationBar
            page={pagination.page} totalPages={pagination.totalPages}
            startIndex={pagination.startIndex} endIndex={pagination.endIndex}
            totalItems={pagination.totalItems} onPrev={pagination.prevPage}
            onNext={pagination.nextPage} onGoTo={pagination.goToPage}
            hasPrev={pagination.hasPrev} hasNext={pagination.hasNext}
          />
        </>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.key);
            return (
              <div key={group.key} className="space-y-2">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center gap-2 w-full text-left group/header hover:bg-secondary/30 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-foreground truncate">{group.label}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {group.files.length} file{group.files.length !== 1 ? "s" : ""}
                  </span>
                  {group.sublabel && (
                    <span className="text-[10px] text-muted-foreground font-mono truncate hidden sm:inline ml-auto">
                      {group.sublabel}
                    </span>
                  )}
                </button>
                {!isCollapsed && (
                  viewMode === "list" ? renderFileList(group.files) : renderFileGrid(group.files)
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Saved Links - paginated */}
      {entries.length > 0 && (
        <SavedLinksSection entries={entries} onRemove={remove} />
      )}
    </div>
  );
}

function SavedLinksSection({ entries, onRemove }: { entries: any[]; onRemove: (id: string) => void }) {
  const [linksPage, setLinksPage] = useState(0);
  const perPage = 6;
  const totalPages = Math.ceil(entries.length / perPage);
  const visible = entries.slice(linksPage * perPage, (linksPage + 1) * perPage);

  return (
    <div className="pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          Saved Links
          <span className="text-[11px] font-normal ml-1">({entries.length})</span>
        </h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <button
              disabled={linksPage === 0}
              onClick={() => setLinksPage((p) => p - 1)}
              className="px-2 py-1 rounded-md hover:bg-secondary/50 disabled:opacity-30 transition-colors"
            >
              ←
            </button>
            <span className="font-mono text-[11px]">{linksPage + 1}/{totalPages}</span>
            <button
              disabled={linksPage >= totalPages - 1}
              onClick={() => setLinksPage((p) => p + 1)}
              className="px-2 py-1 rounded-md hover:bg-secondary/50 disabled:opacity-30 transition-colors"
            >
              →
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((entry) => (
          <div key={entry.id} className="glass-card p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{entry.files[0]?.name || entry.source_url}</p>
              <p className="text-xs text-muted-foreground">
                {entry.file_count} file{entry.file_count > 1 ? "s" : ""} · {new Date(entry.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 hover:text-destructive" onClick={() => onRemove(entry.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
