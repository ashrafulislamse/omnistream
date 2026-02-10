import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import { useDownloadHistory } from '@/hooks/useDownloadHistory';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { cn } from '@/lib/utils';
import type { TeraBoxFile } from '@/types/terabox';
import {
    TrendingUp, Flame, Clock, Star, Film, Play,
    Download, Heart, Eye, ArrowRight, Zap, Sparkles,
    ChevronRight, Search, Grid3X3, LayoutGrid, Filter
} from 'lucide-react';

// Mock trending data - in real app, this would come from an API
const trendingContent = [
    { id: 1, name: 'Amazing Nature Documentary 4K', views: '12.5K', category: 'Documentary', duration: '45:00', thumbnail: null },
    { id: 2, name: 'Epic Movie Collection 2024', views: '8.2K', category: 'Movies', duration: '2:15:00', thumbnail: null },
    { id: 3, name: 'Best Music Playlist HD', views: '25.1K', category: 'Music', duration: '1:30:00', thumbnail: null },
    { id: 4, name: 'Gaming Highlights Compilation', views: '15.8K', category: 'Gaming', duration: '32:00', thumbnail: null },
    { id: 5, name: 'Cooking Masterclass Series', views: '6.4K', category: 'Education', duration: '58:00', thumbnail: null },
    { id: 6, name: 'Travel Vlog: Japan Edition', views: '9.7K', category: 'Travel', duration: '42:00', thumbnail: null },
];

const categories = [
    { name: 'Movies', icon: <Film className="w-6 h-6" />, count: 1250, color: 'from-teal-500 to-cyan-500' },
    { name: 'Music', icon: <Sparkles className="w-6 h-6" />, count: 890, color: 'from-purple-500 to-pink-500' },
    { name: 'Gaming', icon: <Zap className="w-6 h-6" />, count: 654, color: 'from-orange-500 to-red-500' },
    { name: 'Education', icon: <Star className="w-6 h-6" />, count: 432, color: 'from-blue-500 to-indigo-500' },
];

export default function ExplorePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const { history: searchHistory } = useSearchHistory();

    const filteredContent = selectedCategory
        ? trendingContent.filter(item => item.category === selectedCategory)
        : trendingContent;

    return (
        <div className="min-h-full px-4 lg:px-8 py-6 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                            <Flame className="w-8 h-8 text-orange-500" />
                            Explore
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Discover trending content and popular categories
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative w-full lg:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search content..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">Categories</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {categories.map((category) => (
                            <button
                                key={category.name}
                                onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
                                className={cn(
                                    "group relative p-6 rounded-2xl overflow-hidden transition-all",
                                    selectedCategory === category.name
                                        ? "ring-2 ring-teal-500"
                                        : "hover:scale-105"
                                )}
                            >
                                {/* Gradient Background */}
                                <div className={cn(
                                    "absolute inset-0 bg-gradient-to-br opacity-10 dark:opacity-20",
                                    category.color
                                )} />

                                {/* Content */}
                                <div className="relative">
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mb-4",
                                        category.color
                                    )}>
                                        {category.icon}
                                    </div>
                                    <h3 className="font-semibold text-lg">{category.name}</h3>
                                    <p className="text-sm text-gray-500">{category.count} items</p>
                                </div>

                                {/* Border */}
                                <div className="absolute inset-0 rounded-2xl border border-gray-200 dark:border-white/10" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Trending Now */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                            {selectedCategory ? `${selectedCategory} Content` : 'Trending Now'}
                        </h2>
                        {selectedCategory && (
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="text-sm text-teal-500 hover:text-teal-400"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContent.map((item) => (
                            <div
                                key={item.id}
                                className="group p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-teal-500/30 transition-all"
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10 mb-4 overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Film className="w-12 h-12 text-gray-400" />
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                        <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all">
                                            <Play className="w-6 h-6 text-teal-600 dark:text-white fill-current ml-1" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-medium">
                                        {item.duration}
                                    </div>
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-orange-500 rounded text-xs text-white font-medium flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        {item.views}
                                    </div>
                                </div>

                                {/* Info */}
                                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{item.name}</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.category}</span>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Eye className="w-4 h-4" />
                                        <span className="text-xs">{item.views}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recently Shared by Others */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Recently Shared
                        </h2>
                        <Link to="/shared" className="text-sm text-teal-500 hover:text-teal-400 flex items-center gap-1">
                            View all <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-teal-500/30 transition-all"
                            >
                                <div className="w-16 h-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <Film className="w-6 h-6 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">Shared Video {i}</p>
                                    <p className="text-xs text-gray-500">Shared 2 hours ago</p>
                                </div>
                                <button className="p-2 rounded-lg bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 transition-colors">
                                    <Play className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Your Recent Searches */}
                {searchHistory.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-purple-500" />
                                Your Recent Searches
                            </h2>
                            <Link to="/stream" className="text-sm text-teal-500 hover:text-teal-400 flex items-center gap-1">
                                New search <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {searchHistory.slice(0, 8).map((entry, index) => (
                                <Link
                                    key={index}
                                    to="/stream"
                                    className="px-4 py-2 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-teal-500/30 text-sm transition-all"
                                >
                                    {entry.fileName || 'Untitled search'}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA Banner */}
                <div className="relative overflow-hidden p-8 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-teal-500/10 dark:from-teal-500/20 dark:via-cyan-500/20 dark:to-teal-500/20 border border-teal-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/20 to-transparent rounded-full blur-3xl" />

                    <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">Have a TeraBox link?</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Paste it in our Stream page to start watching instantly
                            </p>
                        </div>
                        <Link
                            to="/stream"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all"
                        >
                            <Zap className="w-5 h-5" />
                            Go to Stream
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
