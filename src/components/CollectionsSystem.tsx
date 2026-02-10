import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import {
    Folder, FolderPlus, MoreHorizontal, Edit2, Trash2,
    Plus, X, Check, Share2, Lock, Globe, ChevronRight,
    Play, Download, Image, Music, FileVideo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============ Types ============
export interface Collection {
    id: string;
    name: string;
    description?: string;
    color: string;
    icon: string;
    isPublic: boolean;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CollectionItem {
    id: string;
    collectionId: string;
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    thumbnail?: string;
    addedAt: string;
}

interface CollectionsContextType {
    collections: Collection[];
    loading: boolean;
    createCollection: (name: string, description?: string, color?: string) => Promise<Collection | null>;
    updateCollection: (id: string, data: Partial<Collection>) => Promise<boolean>;
    deleteCollection: (id: string) => Promise<boolean>;
    addToCollection: (collectionId: string, files: any[]) => Promise<boolean>;
    removeFromCollection: (collectionId: string, itemId: string) => Promise<boolean>;
    getCollectionItems: (collectionId: string) => Promise<CollectionItem[]>;
    refresh: () => Promise<void>;
}

// ============ Context ============
const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

const COLORS = [
    '#14b8a6', // teal
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ec4899', // pink
    '#3b82f6', // blue
    '#22c55e', // green
    '#ef4444', // red
    '#6366f1', // indigo
];

const STORAGE_KEY = 'omnistream-collections';
const ITEMS_KEY = 'omnistream-collection-items';

function generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [items, setItems] = useState<CollectionItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Load from localStorage
    const refresh = useCallback(async () => {
        try {
            const savedCollections = localStorage.getItem(STORAGE_KEY);
            const savedItems = localStorage.getItem(ITEMS_KEY);

            if (savedCollections) {
                setCollections(JSON.parse(savedCollections));
            }
            if (savedItems) {
                setItems(JSON.parse(savedItems));
            }
        } catch (error) {
            console.error('Error loading collections:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Persist to localStorage
    useEffect(() => {
        if (!loading) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
        }
    }, [collections, loading]);

    useEffect(() => {
        if (!loading) {
            localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
        }
    }, [items, loading]);

    const createCollection = async (name: string, description?: string, color?: string): Promise<Collection | null> => {
        const newCollection: Collection = {
            id: generateId(),
            name,
            description,
            color: color || COLORS[Math.floor(Math.random() * COLORS.length)],
            icon: 'folder',
            isPublic: false,
            itemCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setCollections(prev => [newCollection, ...prev]);
        toast.success('Collection created');
        return newCollection;
    };

    const updateCollection = async (id: string, data: Partial<Collection>): Promise<boolean> => {
        setCollections(prev => prev.map(c =>
            c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
        ));
        toast.success('Collection updated');
        return true;
    };

    const deleteCollection = async (id: string): Promise<boolean> => {
        setCollections(prev => prev.filter(c => c.id !== id));
        setItems(prev => prev.filter(i => i.collectionId !== id));
        toast.success('Collection deleted');
        return true;
    };

    const addToCollection = async (collectionId: string, files: any[]): Promise<boolean> => {
        const newItems: CollectionItem[] = files.map(file => ({
            id: generateId(),
            collectionId,
            fileId: file.id || file.fs_id || generateId(),
            fileName: file.name || file.server_filename || 'Unknown',
            fileSize: file.size || 0,
            fileType: file.type || 'video',
            thumbnail: file.thumbnail || file.thumbs?.url3,
            addedAt: new Date().toISOString(),
        }));

        setItems(prev => [...newItems, ...prev]);
        setCollections(prev => prev.map(c =>
            c.id === collectionId ? { ...c, itemCount: c.itemCount + files.length } : c
        ));

        toast.success(`Added ${files.length} file(s) to collection`);
        return true;
    };

    const removeFromCollection = async (collectionId: string, itemId: string): Promise<boolean> => {
        setItems(prev => prev.filter(i => i.id !== itemId));
        setCollections(prev => prev.map(c =>
            c.id === collectionId ? { ...c, itemCount: Math.max(0, c.itemCount - 1) } : c
        ));
        toast.success('Removed from collection');
        return true;
    };

    const getCollectionItems = async (collectionId: string): Promise<CollectionItem[]> => {
        return items.filter(i => i.collectionId === collectionId);
    };

    return (
        <CollectionsContext.Provider value={{
            collections,
            loading,
            createCollection,
            updateCollection,
            deleteCollection,
            addToCollection,
            removeFromCollection,
            getCollectionItems,
            refresh,
        }}>
            {children}
        </CollectionsContext.Provider>
    );
}

export function useCollections() {
    const context = useContext(CollectionsContext);
    if (!context) {
        throw new Error('useCollections must be used within CollectionsProvider');
    }
    return context;
}

// ============ Collection Card ============
export function CollectionCard({
    collection,
    onClick,
    onEdit,
    onDelete
}: {
    collection: Collection;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div
            className="group relative p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer"
            onClick={onClick}
        >
            {/* Color Bar */}
            <div
                className="absolute top-0 left-4 right-4 h-1 rounded-b-full opacity-80"
                style={{ backgroundColor: collection.color }}
            />

            {/* Icon */}
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${collection.color}20` }}
            >
                <Folder className="w-6 h-6" style={{ color: collection.color }} />
            </div>

            {/* Info */}
            <h3 className="font-semibold text-white truncate">{collection.name}</h3>
            {collection.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{collection.description}</p>
            )}

            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                <span>{collection.itemCount} items</span>
                {collection.isPublic ? (
                    <Globe className="w-3 h-3" />
                ) : (
                    <Lock className="w-3 h-3" />
                )}
            </div>

            {/* Menu Button */}
            <div className="absolute top-3 right-3">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                >
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>

                {showMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                        />
                        <div className="absolute right-0 top-full mt-1 py-1 w-36 bg-[#1a1a24] border border-white/10 rounded-lg shadow-xl z-20">
                            {onEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-white/5"
                                >
                                    <Edit2 className="w-4 h-4" /> Edit
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
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
    );
}

// ============ Create Collection Modal ============
export function CreateCollectionModal({
    isOpen,
    onClose,
    onCreate
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description?: string, color?: string) => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate(name.trim(), description.trim() || undefined, selectedColor);
        setName('');
        setDescription('');
        setSelectedColor(COLORS[0]);
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed z-50 inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md animate-scale-in">
                <div className="bg-[#0f0f18] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    <form onSubmit={handleSubmit}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <h2 className="text-lg font-semibold">Create Collection</h2>
                            <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My Collection"
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500/50"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Description (optional)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="A brief description..."
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setSelectedColor(color)}
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-transform",
                                                selectedColor === color && "ring-2 ring-white ring-offset-2 ring-offset-[#0f0f18] scale-110"
                                            )}
                                            style={{ backgroundColor: color }}
                                        >
                                            {selectedColor === color && <Check className="w-4 h-4 text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-5 py-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!name.trim()}
                                className="px-4 py-2 text-sm font-semibold bg-teal-500 text-black rounded-lg hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Create Collection
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

// ============ Add to Collection Modal ============
export function AddToCollectionModal({
    isOpen,
    onClose,
    files,
}: {
    isOpen: boolean;
    onClose: () => void;
    files: any[];
}) {
    const { collections, addToCollection, createCollection } = useCollections();
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    if (!isOpen) return null;

    const handleAddToExisting = async (collectionId: string) => {
        await addToCollection(collectionId, files);
        onClose();
    };

    const handleCreateAndAdd = async () => {
        if (!newName.trim()) return;
        const collection = await createCollection(newName.trim());
        if (collection) {
            await addToCollection(collection.id, files);
        }
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed z-50 inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm animate-scale-in">
                <div className="bg-[#0f0f18] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <h2 className="text-lg font-semibold">
                            Add {files.length} file{files.length > 1 ? 's' : ''} to collection
                        </h2>
                        <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Collections List */}
                    <div className="max-h-64 overflow-y-auto p-2">
                        {collections.length === 0 && !creating ? (
                            <div className="py-8 text-center text-gray-500 text-sm">
                                No collections yet
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {collections.map((collection) => (
                                    <button
                                        key={collection.id}
                                        onClick={() => handleAddToExisting(collection.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${collection.color}20` }}
                                        >
                                            <Folder className="w-4 h-4" style={{ color: collection.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{collection.name}</p>
                                            <p className="text-xs text-gray-500">{collection.itemCount} items</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Create New */}
                        {creating ? (
                            <div className="mt-2 p-3 bg-white/5 rounded-lg">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Collection name"
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-teal-500/50"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button
                                        onClick={() => { setCreating(false); setNewName(''); }}
                                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateAndAdd}
                                        disabled={!newName.trim()}
                                        className="px-3 py-1.5 text-xs font-semibold bg-teal-500 text-black rounded-lg disabled:opacity-50"
                                    >
                                        Create & Add
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setCreating(true)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-400">Create new collection</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default CollectionsProvider;
