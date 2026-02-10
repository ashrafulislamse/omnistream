import { useState, useRef, useEffect, useCallback } from 'react';
import { UrlInput } from "@/components/UrlInput";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useTeraBox, seedCache } from "@/hooks/useTeraBox";
import { isValidCloudUrl } from "@/types/terabox";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useDownloadQueue } from "@/hooks/useDownloadQueue";
import { useFavorites } from "@/hooks/useFavorites";
import { useDownloadHistory } from "@/hooks/useDownloadHistory";
import { useSharedLinks } from "@/hooks/useSharedLinks";
import { useFetchedFiles } from "@/hooks/useFetchedFiles";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { TeraBoxFile } from "@/types/terabox";
import {
    Play, Zap, Shield, Download, Link2, Clock,
    Sparkles, Film, Search, ArrowRight, Loader2,
    CheckCircle, AlertCircle, Copy, ExternalLink,
    History, Star, Folder, Share2, Plus, X,
    Upload, Grid3X3, List, Check, Trash2, Heart,
    ChevronDown, Settings2, Eye, MoreHorizontal
} from 'lucide-react';

export default function StreamPage() {
    const { user, isDemoMode } = useAuth();
    const { toast } = useToast();
    const { data, loading, error, fetchFile, getCached, fromCache } = useTeraBox();
    const { history, addEntry, clearHistory, removeEntry } = useSearchHistory();
    const { addToQueue, bulkDownload } = useDownloadQueue();
    const { addFavorite, isFavorited } = useFavorites();
    const { recordDownload } = useDownloadHistory();
    const { createShareLink } = useSharedLinks();
    const { save: saveFiles, entries: fetchedEntries } = useFetchedFiles();

    const [inputUrl, setInputUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<TeraBoxFile | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [previewFile, setPreviewFile] = useState<TeraBoxFile | null>(null);
    const [selectedQuality, setSelectedQuality] = useState<string>('auto');
    const [showQualityDropdown, setShowQualityDropdown] = useState(false);
    const lastUrlRef = useRef("");
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Seed cache from DB
    useEffect(() => {
        if (fetchedEntries.length > 0) {
            seedCache(fetchedEntries.map((e) => ({
                source_url: e.source_url,
                files: e.files,
                created_at: e.created_at
            })));
        }
    }, [fetchedEntries]);

    // Handle errors
    useEffect(() => {
        if (error) {
            toast({ title: "Error", description: error, variant: "destructive" });
        }
    }, [error, toast]);

    // Update bulk actions visibility
    useEffect(() => {
        setShowBulkActions(selectedFiles.size > 0);
    }, [selectedFiles]);

    const handleFetch = useCallback(async (url: string) => {
        if (!url.trim()) return;

        lastUrlRef.current = url;
        setInputUrl(url);
        setSelectedFiles(new Set());

        // Check cache first
        const cached = getCached(url);
        if (cached) {
            addEntry(url, cached.list?.[0]?.name || "Cached file");
            return;
        }

        await fetchFile(url);
        if (data?.list?.length) {
            addEntry(url, data.list[0].name);
            saveFiles(url, data.list);
        }
    }, [fetchFile, getCached, addEntry, saveFiles, data]);

    // Drag & Drop handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === dropZoneRef.current) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const text = e.dataTransfer.getData('text/plain');
        if (text && isValidCloudUrl(text)) {
            handleFetch(text);
        } else {
            toast({
                title: "Invalid URL",
                description: "Please drop a valid TeraBox or Google Drive link",
                variant: "destructive"
            });
        }
    };

    const handleFileSelect = (file: TeraBoxFile) => {
        setSelectedFile(file);
    };

    const handleDownload = (file: TeraBoxFile) => {
        recordDownload(file);
        addToQueue(file);
        toast({
            title: "Added to queue",
            description: `${file.name} added to download queue`,
        });
    };

    const handleShare = async (file: TeraBoxFile) => {
        try {
            const shareLink = await createShareLink({
                source_url: inputUrl,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type || 'video',
            });

            if (shareLink) {
                await navigator.clipboard.writeText(`${window.location.origin}/s/${shareLink}`);
                toast({
                    title: "Link copied!",
                    description: "Share link has been copied to clipboard",
                });
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to create share link",
                variant: "destructive"
            });
        }
    };

    // Bulk selection handlers
    const toggleFileSelection = (index: number) => {
        setSelectedFiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const selectAllFiles = () => {
        if (selectedFiles.size === files.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(files.map((_, i) => i)));
        }
    };

    const handleBulkDownload = () => {
        const selectedFilesList = files.filter((_, i) => selectedFiles.has(i));
        selectedFilesList.forEach(file => {
            recordDownload(file);
            addToQueue(file);
        });
        toast({
            title: "Added to queue",
            description: `${selectedFilesList.length} files added to download queue`,
        });
        setSelectedFiles(new Set());
    };

    const handleBulkFavorite = () => {
        const selectedFilesList = files.filter((_, i) => selectedFiles.has(i));
        selectedFilesList.forEach(file => addFavorite(file));
        toast({
            title: "Added to favorites",
            description: `${selectedFilesList.length} files added to favorites`,
        });
        setSelectedFiles(new Set());
    };

    // Quality options
    const qualityOptions = [
        { value: 'auto', label: 'Auto', desc: 'Best for your connection' },
        { value: '1080p', label: '1080p', desc: 'Full HD' },
        { value: '720p', label: '720p', desc: 'HD' },
        { value: '480p', label: '480p', desc: 'SD' },
        { value: '360p', label: '360p', desc: 'Low' },
    ];

    const files = data?.list || [];
    const hasResults = files.length > 0;

    return (
        <div
            ref={dropZoneRef}
            className="min-h-full"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Drag & Drop Overlay */}
            {isDragging && (
                <div className="fixed inset-0 z-50 bg-teal-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="p-8 rounded-3xl bg-white dark:bg-[#0c0c14] border-2 border-dashed border-teal-500 shadow-2xl">
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-10 h-10 text-teal-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Drop your cloud link here</h3>
                            <p className="text-gray-500">Release to start fetching</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Background gradients */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-[100px]" />
                    <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[80px]" />
                </div>

                <div className="relative px-4 lg:px-8 py-8 lg:py-12">
                    {/* Header */}
                    <div className="max-w-4xl mx-auto text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-sm font-medium mb-4">
                            <Zap className="w-4 h-4" />
                            <span>Instant Streaming</span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                            Stream & Download <span className="text-teal-500">Cloud Files</span>
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                            Paste any TeraBox or Google Drive link below, or <span className="text-teal-500 font-medium">drag & drop</span> to stream in HD
                        </p>
                    </div>

                    {/* URL Input */}
                    <div className="max-w-3xl mx-auto mb-8">
                        <UrlInput onSubmit={handleFetch} loading={loading} />
                    </div>

                    {/* Quick Stats */}
                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-green-500" />
                            </div>
                            <span>Secure & Private</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-purple-500" />
                            </div>
                            <span>No Speed Limits</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Film className="w-4 h-4 text-blue-500" />
                            </div>
                            <span>All Formats Supported</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="px-4 lg:px-8 py-12">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/10 mb-6">
                            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Fetching file info...</h3>
                        <p className="text-gray-500 dark:text-gray-400">This usually takes just a few seconds</p>
                    </div>
                </div>
            )}

            {/* Results Section */}
            {hasResults && !loading && (
                <div className="px-4 lg:px-8 py-8 border-t border-gray-200 dark:border-white/5">
                    <div className="max-w-6xl mx-auto">
                        {/* Results Header + Toolbar */}
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">Files Found</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {files.length} file{files.length !== 1 ? 's' : ''} available
                                        {fromCache && <span className="ml-2 text-teal-500">(from cache)</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Quality Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowQualityDropdown(!showQualityDropdown)}
                                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
                                        >
                                            <Settings2 className="w-4 h-4" />
                                            {selectedQuality.toUpperCase()}
                                            <ChevronDown className={cn("w-4 h-4 transition-transform", showQualityDropdown && "rotate-180")} />
                                        </button>
                                        {showQualityDropdown && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setShowQualityDropdown(false)} />
                                                <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-white dark:bg-[#12121a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-20">
                                                    {qualityOptions.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => {
                                                                setSelectedQuality(option.value);
                                                                setShowQualityDropdown(false);
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors",
                                                                selectedQuality === option.value && "text-teal-500"
                                                            )}
                                                        >
                                                            <div>
                                                                <span className="font-medium">{option.label}</span>
                                                                <span className="text-gray-500 ml-2">{option.desc}</span>
                                                            </div>
                                                            {selectedQuality === option.value && <Check className="w-4 h-4" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* View Toggle */}
                                    <div className="flex items-center rounded-xl bg-gray-100 dark:bg-white/5 p-1">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                viewMode === 'grid' ? "bg-white dark:bg-white/10 shadow-sm" : "hover:bg-white/50 dark:hover:bg-white/5"
                                            )}
                                        >
                                            <Grid3X3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                viewMode === 'list' ? "bg-white dark:bg-white/10 shadow-sm" : "hover:bg-white/50 dark:hover:bg-white/5"
                                            )}
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Select All */}
                                    <button
                                        onClick={selectAllFiles}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                        {selectedFiles.size === files.length ? 'Deselect' : 'Select All'}
                                    </button>

                                    {/* Download All */}
                                    <button
                                        onClick={() => bulkDownload(files)}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download All
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Actions Toolbar */}
                            {showBulkActions && (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                                    <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                                        {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
                                    </span>
                                    <div className="h-4 w-px bg-teal-500/30" />
                                    <button
                                        onClick={handleBulkDownload}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Selected
                                    </button>
                                    <button
                                        onClick={handleBulkFavorite}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Heart className="w-4 h-4" />
                                        Favorite Selected
                                    </button>
                                    <button
                                        onClick={() => setSelectedFiles(new Set())}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        Clear Selection
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* File Grid/List */}
                        <div className={cn(
                            viewMode === 'grid'
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                : "flex flex-col gap-3"
                        )}>
                            {files.map((file, index) => (
                                viewMode === 'grid' ? (
                                    // Grid View Card
                                    <div
                                        key={index}
                                        className={cn(
                                            "group relative p-4 rounded-2xl bg-white dark:bg-white/[0.02] border transition-all duration-300",
                                            selectedFiles.has(index)
                                                ? "border-teal-500 ring-2 ring-teal-500/20"
                                                : "border-gray-200 dark:border-white/5 hover:border-teal-500/30"
                                        )}
                                    >
                                        {/* Selection Checkbox */}
                                        <button
                                            onClick={() => toggleFileSelection(index)}
                                            className={cn(
                                                "absolute top-6 left-6 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                                selectedFiles.has(index)
                                                    ? "bg-teal-500 text-white"
                                                    : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
                                            )}
                                        >
                                            {selectedFiles.has(index) && <Check className="w-4 h-4" />}
                                        </button>

                                        {/* Thumbnail */}
                                        <div
                                            className="relative aspect-video rounded-xl bg-gray-100 dark:bg-white/5 mb-4 overflow-hidden cursor-pointer"
                                            onClick={() => handleFileSelect(file)}
                                            onMouseEnter={() => setPreviewFile(file)}
                                            onMouseLeave={() => setPreviewFile(null)}
                                        >
                                            {file.thumbnail ? (
                                                <img
                                                    src={file.thumbnail}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Film className="w-12 h-12 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                                <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all">
                                                    <Play className="w-6 h-6 text-teal-600 dark:text-white fill-current ml-1" />
                                                </div>
                                            </div>
                                            {file.duration && (
                                                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-medium">
                                                    {file.duration}
                                                </div>
                                            )}
                                            {/* Preview Eye Icon */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all"
                                                title="Preview"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* File Info */}
                                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{file.name}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                            {file.size && `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                                            {file.quality && ` • ${file.quality}`}
                                        </p>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleFileSelect(file)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium transition-colors"
                                            >
                                                <Play className="w-4 h-4" />
                                                Stream
                                            </button>
                                            <button
                                                onClick={() => handleDownload(file)}
                                                className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => addFavorite(file)}
                                                className={cn(
                                                    "p-2 rounded-xl transition-colors",
                                                    isFavorited(file.name)
                                                        ? "bg-pink-500/10 text-pink-500"
                                                        : "bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10"
                                                )}
                                                title="Favorite"
                                            >
                                                <Star className={cn("w-4 h-4", isFavorited(file.name) && "fill-current")} />
                                            </button>
                                            <button
                                                onClick={() => handleShare(file)}
                                                className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                                title="Share"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // List View Row
                                    <div
                                        key={index}
                                        className={cn(
                                            "group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/[0.02] border transition-all",
                                            selectedFiles.has(index)
                                                ? "border-teal-500 ring-2 ring-teal-500/20"
                                                : "border-gray-200 dark:border-white/5 hover:border-teal-500/30"
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleFileSelection(index)}
                                            className={cn(
                                                "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all",
                                                selectedFiles.has(index)
                                                    ? "bg-teal-500 border-teal-500 text-white"
                                                    : "border-gray-300 dark:border-white/20 hover:border-teal-500"
                                            )}
                                        >
                                            {selectedFiles.has(index) && <Check className="w-4 h-4" />}
                                        </button>

                                        {/* Thumbnail */}
                                        <div
                                            className="w-32 h-20 rounded-lg bg-gray-100 dark:bg-white/5 overflow-hidden cursor-pointer flex-shrink-0"
                                            onClick={() => handleFileSelect(file)}
                                        >
                                            {file.thumbnail ? (
                                                <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Film className="w-8 h-8 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm mb-1 truncate">{file.name}</h3>
                                            <p className="text-xs text-gray-500">
                                                {file.size && `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                                                {file.duration && ` • ${file.duration}`}
                                                {file.quality && ` • ${file.quality}`}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleFileSelect(file)}
                                                className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium transition-colors"
                                            >
                                                <Play className="w-4 h-4" />
                                                Stream
                                            </button>
                                            <button onClick={() => handleDownload(file)} className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => addFavorite(file)} className={cn("p-2 rounded-xl transition-colors", isFavorited(file.name) ? "bg-pink-500/10 text-pink-500" : "bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10")}>
                                                <Star className={cn("w-4 h-4", isFavorited(file.name) && "fill-current")} />
                                            </button>
                                            <button onClick={() => handleShare(file)} className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Thumbnail Modal */}
            {previewFile && !selectedFile && (
                <div
                    className="fixed bottom-24 right-8 w-80 rounded-2xl bg-white dark:bg-[#12121a] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden z-40"
                    onMouseEnter={() => setPreviewFile(previewFile)}
                    onMouseLeave={() => setPreviewFile(null)}
                >
                    <div className="aspect-video bg-gray-100 dark:bg-white/5">
                        {previewFile.thumbnail ? (
                            <img src={previewFile.thumbnail} alt={previewFile.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-12 h-12 text-gray-400" />
                            </div>
                        )}
                    </div>
                    <div className="p-4">
                        <h4 className="font-semibold text-sm line-clamp-2 mb-2">{previewFile.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            {previewFile.size && <span>{(previewFile.size / 1024 / 1024).toFixed(1)} MB</span>}
                            {previewFile.duration && <span>{previewFile.duration}</span>}
                            {previewFile.quality && <span>{previewFile.quality}</span>}
                        </div>
                        <button
                            onClick={() => handleFileSelect(previewFile)}
                            className="mt-3 w-full py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Play Now
                        </button>
                    </div>
                </div>
            )}

            {/* Video Player Modal */}
            {selectedFile && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-5xl">
                        <button
                            onClick={() => setSelectedFile(null)}
                            className="absolute -top-12 right-0 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                            Close
                        </button>
                        <VideoPlayer file={selectedFile} />
                    </div>
                </div>
            )}

            {/* Empty State / Recent History */}
            {!hasResults && !loading && (
                <div className="px-4 lg:px-8 py-12">
                    <div className="max-w-4xl mx-auto">
                        {/* Drag & Drop Zone */}
                        <div className="mb-12 p-12 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.01] text-center hover:border-teal-500/50 hover:bg-teal-500/5 transition-colors cursor-pointer">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Drag & Drop Any Cloud Link</h3>
                            <p className="text-gray-500">Or use the input above to paste your link</p>
                        </div>

                        {/* Recent Searches */}
                        {history.length > 0 && (
                            <div className="mb-12">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <History className="w-5 h-5 text-gray-400" />
                                        Recent Searches
                                    </h3>
                                    <button
                                        onClick={clearHistory}
                                        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                    >
                                        Clear all
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {history.slice(0, 6).map((entry, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleFetch(entry.url)}
                                            className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-teal-500/30 text-left transition-all duration-200"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                                                <Film className="w-5 h-5 text-teal-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{entry.fileName || 'Untitled'}</p>
                                                <p className="text-xs text-gray-500 truncate">{entry.url}</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* How to Use */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">How to Use</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { icon: <Link2 className="w-6 h-6" />, title: "Paste or Drop Link", desc: "TeraBox or Google Drive link" },
                                    { icon: <Zap className="w-6 h-6" />, title: "Instant Fetch", desc: "We process it in seconds" },
                                    { icon: <Play className="w-6 h-6" />, title: "Stream or Download", desc: "Watch in HD or save locally" },
                                ].map((step, i) => (
                                    <div key={i} className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-4 text-teal-500">
                                            {step.icon}
                                        </div>
                                        <h4 className="font-semibold mb-1">{step.title}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Demo Mode Banner */}
            {isDemoMode && (
                <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-500/90 text-amber-950 rounded-full text-sm font-medium shadow-lg z-40">
                    🧪 Demo Mode - Some features may be limited
                </div>
            )}
        </div>
    );
}
