import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { VideoPlayer } from '@/components/VideoPlayer';
import { cn } from '@/lib/utils';
import type { GoogleDriveFile } from '@/services/googleDrive';
import {
    HardDrive, Search, Play, Download, Heart, Star,
    Grid3X3, List, RefreshCw, ChevronLeft, ChevronRight,
    Folder, Film, Clock, Calendar, ExternalLink, X,
    Loader2, AlertCircle, Cloud, Filter, SortDesc,
    MoreVertical, Eye, Share2, Info
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type SortBy = 'modified' | 'name' | 'size';

export default function DrivePage() {
    const navigate = useNavigate();
    const {
        isConnected,
        isLoading,
        error,
        userInfo,
        videos,
        hasMore,
        loadAllVideos,
        loadMoreVideos,
        searchVideos,
        getStreamUrl,
        getEmbedUrl,
        refresh,
    } = useGoogleDrive();

    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('modified');
    const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
    const [previewFile, setPreviewFile] = useState<GoogleDriveFile | null>(null);

    // Load videos on mount
    useEffect(() => {
        if (isConnected) {
            loadAllVideos();
        }
    }, [isConnected, loadAllVideos]);

    // Redirect if not connected
    useEffect(() => {
        if (!isConnected) {
            navigate('/sources');
        }
    }, [isConnected, navigate]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        searchVideos(searchQuery);
    };

    const formatFileSize = (size?: string) => {
        if (!size) return 'Unknown';
        const bytes = parseInt(size);
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const sortedVideos = [...videos].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'size':
                return parseInt(b.size || '0') - parseInt(a.size || '0');
            case 'modified':
            default:
                return new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime();
        }
    });

    if (!isConnected) {
        return null;
    }

    return (
        <div className="min-h-full animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-gray-50/80 dark:bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Title & Breadcrumb */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
                                <HardDrive className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Google Drive</h1>
                                {userInfo && (
                                    <p className="text-xs text-gray-500">{userInfo.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search videos..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                />
                            </div>
                        </form>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortBy)}
                                className="px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none"
                            >
                                <option value="modified">Recently Modified</option>
                                <option value="name">Name</option>
                                <option value="size">Size</option>
                            </select>

                            {/* View Toggle */}
                            <div className="flex items-center rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        viewMode === 'grid' ? "bg-blue-500 text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    )}
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        viewMode === 'list' ? "bg-blue-500 text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={refresh}
                                disabled={isLoading}
                                className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                            >
                                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 lg:px-8 py-6">
                {/* Error State */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && videos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-gray-500">Loading your videos...</p>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && videos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6">
                            <Film className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No videos found</h3>
                        <p className="text-gray-500 max-w-md">
                            {searchQuery
                                ? `No videos matching "${searchQuery}"`
                                : "We couldn't find any video files in your Google Drive."
                            }
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); loadAllVideos(); }}
                                className="mt-4 px-4 py-2 text-sm text-blue-500 hover:underline"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}

                {/* Videos Grid */}
                {videos.length > 0 && (
                    <>
                        <div className="text-sm text-gray-500 mb-4">
                            {videos.length} video{videos.length !== 1 ? 's' : ''} found
                        </div>

                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {sortedVideos.map((file) => (
                                    <div
                                        key={file.id}
                                        className="group p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-blue-500/30 transition-all"
                                        onMouseEnter={() => setPreviewFile(file)}
                                        onMouseLeave={() => setPreviewFile(null)}
                                    >
                                        {/* Thumbnail */}
                                        <div
                                            className="relative aspect-video rounded-xl bg-gray-100 dark:bg-white/5 mb-4 overflow-hidden cursor-pointer"
                                            onClick={() => setSelectedFile(file)}
                                        >
                                            {file.thumbnailLink ? (
                                                <img
                                                    src={file.thumbnailLink}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Film className="w-10 h-10 text-gray-400" />
                                                </div>
                                            )}

                                            {/* Play Overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                                <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all">
                                                    <Play className="w-5 h-5 text-blue-600 dark:text-white fill-current ml-1" />
                                                </div>
                                            </div>

                                            {/* Size Badge */}
                                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs text-white font-medium">
                                                {formatFileSize(file.size)}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <h3 className="font-medium text-sm line-clamp-2 mb-2" title={file.name}>
                                            {file.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(file.modifiedTime)}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 mt-4">
                                            <button
                                                onClick={() => setSelectedFile(file)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                                            >
                                                <Play className="w-4 h-4" />
                                                Play
                                            </button>
                                            <a
                                                href={file.webViewLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                                title="Open in Drive"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {sortedVideos.map((file) => (
                                    <div
                                        key={file.id}
                                        className="group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-blue-500/30 transition-all"
                                    >
                                        {/* Thumbnail */}
                                        <div
                                            className="relative w-24 h-16 rounded-lg bg-gray-100 dark:bg-white/5 overflow-hidden cursor-pointer flex-shrink-0"
                                            onClick={() => setSelectedFile(file)}
                                        >
                                            {file.thumbnailLink ? (
                                                <img
                                                    src={file.thumbnailLink}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Film className="w-6 h-6 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                                                <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-sm truncate" title={file.name}>
                                                {file.name}
                                            </h3>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                                <span>{formatFileSize(file.size)}</span>
                                                <span>{formatDate(file.modifiedTime)}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedFile(file)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                                            >
                                                <Play className="w-4 h-4" />
                                                Play
                                            </button>
                                            <a
                                                href={file.webViewLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                                title="Open in Drive"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Load More */}
                        {hasMore && (
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={loadMoreVideos}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                    Load More
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Video Player Modal */}
            {selectedFile && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-6xl">
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedFile(null)}
                            className="absolute -top-12 right-0 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                            Close
                        </button>

                        {/* Video Info */}
                        <div className="absolute -top-12 left-0 text-white/80 text-sm truncate max-w-[70%]">
                            {selectedFile.name}
                        </div>

                        {/* Video Player - Using iframe for Drive embed */}
                        <div className="aspect-video bg-black rounded-xl overflow-hidden">
                            <iframe
                                src={getEmbedUrl(selectedFile.id)}
                                className="w-full h-full"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                            />
                        </div>

                        {/* Video Details */}
                        <div className="mt-4 flex items-center justify-between text-white/60 text-sm">
                            <div className="flex items-center gap-4">
                                <span>{formatFileSize(selectedFile.size)}</span>
                                <span>Modified: {formatDate(selectedFile.modifiedTime)}</span>
                            </div>
                            <a
                                href={selectedFile.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Open in Drive
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
