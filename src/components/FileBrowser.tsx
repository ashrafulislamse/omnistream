import { useState, useMemo } from 'react';
import {
    Grid3X3, List, Search, SortAsc, SortDesc,
    Play, Download, Heart, MoreHorizontal, Clock,
    FileVideo, FileAudio, FileImage, File, Folder,
    Check, Trash2, Share2, FolderPlus, ChevronDown
} from 'lucide-react';
import { cn, formatBytes, formatDuration } from '@/lib/utils';

// ============ Types ============
export interface FileItem {
    id: string;
    name: string;
    size: number;
    type: 'video' | 'audio' | 'image' | 'document' | 'folder';
    thumbnail?: string;
    duration?: number;
    createdAt: string;
    isFavorite?: boolean;
    progress?: number; // Watch progress 0-100
}

export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'size' | 'date' | 'type';
export type SortDirection = 'asc' | 'desc';

interface FileBrowserProps {
    files: FileItem[];
    onPlay?: (file: FileItem) => void;
    onDownload?: (file: FileItem) => void;
    onFavorite?: (file: FileItem) => void;
    onDelete?: (file: FileItem) => void;
    onShare?: (file: FileItem) => void;
    onAddToCollection?: (files: FileItem[]) => void;
    emptyMessage?: string;
    showSearch?: boolean;
    showFilters?: boolean;
}

// ============ File Browser Component ============
export function FileBrowser({
    files,
    onPlay,
    onDownload,
    onFavorite,
    onDelete,
    onShare,
    onAddToCollection,
    emptyMessage = 'No files found',
    showSearch = true,
    showFilters = true,
}: FileBrowserProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Filter and sort files
    const filteredFiles = useMemo(() => {
        let result = [...files];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f => f.name.toLowerCase().includes(query));
        }

        // Type filter
        if (selectedType !== 'all') {
            result = result.filter(f => f.type === selectedType);
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'date':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    break;
                case 'type':
                    comparison = a.type.localeCompare(b.type);
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [files, searchQuery, sortField, sortDirection, selectedType]);

    // Selection helpers
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredFiles.map(f => f.id)));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    };

    const selectedFiles = filteredFiles.filter(f => selectedIds.has(f.id));

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                {showSearch && (
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm placeholder:text-gray-500 focus:outline-none focus:border-teal-500/50"
                        />
                    </div>
                )}

                {/* Filters */}
                {showFilters && (
                    <>
                        {/* Type Filter */}
                        <div className="relative">
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-teal-500/50 cursor-pointer"
                            >
                                <option value="all">All Types</option>
                                <option value="video">Videos</option>
                                <option value="audio">Audio</option>
                                <option value="image">Images</option>
                                <option value="document">Documents</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Sort */}
                        <div className="relative">
                            <select
                                value={sortField}
                                onChange={(e) => setSortField(e.target.value as SortField)}
                                className="appearance-none pl-3 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-teal-500/50 cursor-pointer"
                            >
                                <option value="date">Date</option>
                                <option value="name">Name</option>
                                <option value="size">Size</option>
                                <option value="type">Type</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Sort Direction */}
                        <button
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                        >
                            {sortDirection === 'asc' ? (
                                <SortAsc className="w-4 h-4" />
                            ) : (
                                <SortDesc className="w-4 h-4" />
                            )}
                        </button>
                    </>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            viewMode === 'grid' ? "bg-teal-500 text-black" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            viewMode === 'list' ? "bg-teal-500 text-black" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>

                {/* Selection Mode Toggle */}
                <button
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                    className={cn(
                        "p-2 rounded-lg border transition-colors",
                        isSelectionMode
                            ? "bg-teal-500/20 border-teal-500/30 text-teal-400"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    )}
                >
                    <Check className="w-4 h-4" />
                </button>
            </div>

            {/* Bulk Actions Bar */}
            {isSelectionMode && selectedIds.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                    <span className="text-sm text-teal-400 font-medium">
                        {selectedIds.size} selected
                    </span>
                    <div className="flex-1" />
                    <button
                        onClick={selectAll}
                        className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Select All
                    </button>
                    <button
                        onClick={clearSelection}
                        className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    {onAddToCollection && (
                        <button
                            onClick={() => onAddToCollection(selectedFiles)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <FolderPlus className="w-4 h-4" />
                            Add to Collection
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={() => { selectedFiles.forEach(f => onDelete(f)); clearSelection(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    )}
                </div>
            )}

            {/* Files Display */}
            {filteredFiles.length === 0 ? (
                <div className="py-16 text-center">
                    <File className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">{emptyMessage}</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredFiles.map((file) => (
                        <FileCardGrid
                            key={file.id}
                            file={file}
                            isSelected={selectedIds.has(file.id)}
                            isSelectionMode={isSelectionMode}
                            onSelect={() => toggleSelection(file.id)}
                            onPlay={onPlay}
                            onDownload={onDownload}
                            onFavorite={onFavorite}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredFiles.map((file) => (
                        <FileCardList
                            key={file.id}
                            file={file}
                            isSelected={selectedIds.has(file.id)}
                            isSelectionMode={isSelectionMode}
                            onSelect={() => toggleSelection(file.id)}
                            onPlay={onPlay}
                            onDownload={onDownload}
                            onFavorite={onFavorite}
                            onDelete={onDelete}
                            onShare={onShare}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============ Grid Card ============
function FileCardGrid({
    file,
    isSelected,
    isSelectionMode,
    onSelect,
    onPlay,
    onDownload,
    onFavorite,
}: {
    file: FileItem;
    isSelected: boolean;
    isSelectionMode: boolean;
    onSelect: () => void;
    onPlay?: (file: FileItem) => void;
    onDownload?: (file: FileItem) => void;
    onFavorite?: (file: FileItem) => void;
}) {
    const FileIcon = getFileTypeIcon(file.type);

    return (
        <div
            className={cn(
                "group relative rounded-xl overflow-hidden bg-white/[0.02] border transition-all hover:border-white/20 hover:bg-white/[0.04]",
                isSelected ? "border-teal-500 ring-2 ring-teal-500/20" : "border-white/5"
            )}
            onClick={isSelectionMode ? onSelect : undefined}
        >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                {file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                    <FileIcon className="w-12 h-12 text-gray-600" />
                )}

                {/* Progress Bar */}
                {file.progress !== undefined && file.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                        <div
                            className="h-full bg-teal-500"
                            style={{ width: `${file.progress}%` }}
                        />
                    </div>
                )}

                {/* Hover Actions */}
                {!isSelectionMode && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                        {onPlay && file.type === 'video' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onPlay(file); }}
                                className="p-3 bg-teal-500 rounded-full hover:bg-teal-400 transition-colors"
                            >
                                <Play className="w-5 h-5 text-black fill-current" />
                            </button>
                        )}
                        {onDownload && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDownload(file); }}
                                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Selection Checkbox */}
                {isSelectionMode && (
                    <div className="absolute top-2 left-2">
                        <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected ? "bg-teal-500 border-teal-500" : "border-white/50 bg-black/50"
                        )}>
                            {isSelected && <Check className="w-3 h-3 text-black" />}
                        </div>
                    </div>
                )}

                {/* Favorite Button */}
                {!isSelectionMode && onFavorite && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onFavorite(file); }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Heart className={cn("w-4 h-4", file.isFavorite && "fill-pink-500 text-pink-500")} />
                    </button>
                )}

                {/* Duration Badge */}
                {file.duration && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white">
                        {formatDuration(file.duration)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3">
                <p className="text-sm font-medium text-white truncate" title={file.name}>
                    {file.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {formatBytes(file.size)}
                </p>
            </div>
        </div>
    );
}

// ============ List Card ============
function FileCardList({
    file,
    isSelected,
    isSelectionMode,
    onSelect,
    onPlay,
    onDownload,
    onFavorite,
    onDelete,
    onShare,
}: {
    file: FileItem;
    isSelected: boolean;
    isSelectionMode: boolean;
    onSelect: () => void;
    onPlay?: (file: FileItem) => void;
    onDownload?: (file: FileItem) => void;
    onFavorite?: (file: FileItem) => void;
    onDelete?: (file: FileItem) => void;
    onShare?: (file: FileItem) => void;
}) {
    const [showMenu, setShowMenu] = useState(false);
    const FileIcon = getFileTypeIcon(file.type);

    return (
        <div
            className={cn(
                "group flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer",
                isSelected
                    ? "bg-teal-500/10 border border-teal-500/30"
                    : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10"
            )}
            onClick={isSelectionMode ? onSelect : undefined}
        >
            {/* Selection Checkbox */}
            {isSelectionMode && (
                <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    isSelected ? "bg-teal-500 border-teal-500" : "border-white/30"
                )}>
                    {isSelected && <Check className="w-3 h-3 text-black" />}
                </div>
            )}

            {/* Thumbnail */}
            <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                    <FileIcon className="w-6 h-6 text-gray-600" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span>{formatBytes(file.size)}</span>
                    {file.duration && <span>{formatDuration(file.duration)}</span>}
                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Progress */}
            {file.progress !== undefined && file.progress > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{file.progress}%</span>
                </div>
            )}

            {/* Actions */}
            {!isSelectionMode && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onPlay && file.type === 'video' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPlay(file); }}
                            className="p-2 rounded-lg bg-teal-500 text-black hover:bg-teal-400 transition-colors"
                        >
                            <Play className="w-4 h-4 fill-current" />
                        </button>
                    )}
                    {onDownload && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDownload(file); }}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    )}
                    {onFavorite && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onFavorite(file); }}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <Heart className={cn("w-4 h-4", file.isFavorite && "fill-pink-500 text-pink-500")} />
                        </button>
                    )}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                                />
                                <div className="absolute right-0 top-full mt-1 py-1 w-36 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl z-20">
                                    {onShare && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onShare(file); setShowMenu(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/5"
                                        >
                                            <Share2 className="w-4 h-4" /> Share
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(file); setShowMenu(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper
function getFileTypeIcon(type: string) {
    switch (type) {
        case 'video': return FileVideo;
        case 'audio': return FileAudio;
        case 'image': return FileImage;
        case 'folder': return Folder;
        default: return File;
    }
}

export default FileBrowser;
