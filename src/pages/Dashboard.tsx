import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useDownloadHistory } from '@/hooks/useDownloadHistory';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { cn } from '@/lib/utils';
import {
    Play, Zap, Heart, Download, Clock, Film,
    ArrowRight, TrendingUp, Eye, Star, Folder,
    History, Link2, Settings, Crown, Sparkles,
    ChevronRight, ExternalLink, Plus
} from 'lucide-react';

export default function Dashboard() {
    const { user, isDemoMode } = useAuth();
    const { favorites } = useFavorites();
    const { history: downloadHistory } = useDownloadHistory();
    const { getAll: getWatchHistory } = useWatchHistory();
    const { history: searchHistory } = useSearchHistory();

    const [watchHistory, setWatchHistory] = useState<any[]>([]);

    useEffect(() => {
        setWatchHistory(getWatchHistory());
    }, [getWatchHistory]);

    const userName = isDemoMode
        ? 'Demo User'
        : user?.email?.split('@')[0] || 'User';

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // Stats
    const stats = [
        {
            label: 'Total Streams',
            value: watchHistory.length,
            icon: <Play className="w-5 h-5" />,
            iconColor: 'text-teal-500',
            bgColor: 'bg-teal-500/10'
        },
        {
            label: 'Downloads',
            value: downloadHistory.length,
            icon: <Download className="w-5 h-5" />,
            iconColor: 'text-blue-500',
            bgColor: 'bg-blue-500/10'
        },
        {
            label: 'Favorites',
            value: favorites.length,
            icon: <Heart className="w-5 h-5" />,
            iconColor: 'text-pink-500',
            bgColor: 'bg-pink-500/10'
        },
        {
            label: 'Searches',
            value: searchHistory.length,
            icon: <History className="w-5 h-5" />,
            iconColor: 'text-amber-500',
            bgColor: 'bg-amber-500/10'
        },
    ];

    // Quick Actions
    const quickActions = [
        { label: 'Stream Now', icon: <Zap className="w-5 h-5" />, href: '/stream', primary: true },
        { label: 'Favorites', icon: <Heart className="w-5 h-5" />, href: '/favorites' },
        { label: 'History', icon: <History className="w-5 h-5" />, href: '/history' },
        { label: 'Library', icon: <Folder className="w-5 h-5" />, href: '/saved' },
    ];

    return (
        <div className="min-h-full px-4 lg:px-8 py-6 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Welcome Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold">
                            {getGreeting()}, <span className="text-teal-500">{userName}</span>! 👋
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Here's what's happening with your OmniStream account
                        </p>
                    </div>
                    <Link
                        to="/stream"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-105 transition-all"
                    >
                        <Zap className="w-5 h-5" />
                        Start Streaming
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all"
                        >
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.bgColor)}>
                                <div className={stat.iconColor}>
                                    {stat.icon}
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{stat.value}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => (
                            <Link
                                key={index}
                                to={action.href}
                                className={cn(
                                    "group flex items-center gap-3 p-4 rounded-xl transition-all duration-200",
                                    action.primary
                                        ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
                                        : "bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-teal-500/30"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    action.primary ? "bg-white/20" : "bg-gray-100 dark:bg-white/5"
                                )}>
                                    {action.icon}
                                </div>
                                <span className="font-medium">{action.label}</span>
                                <ChevronRight className={cn(
                                    "w-4 h-4 ml-auto transition-transform group-hover:translate-x-1",
                                    action.primary ? "text-white/70" : "text-gray-400"
                                )} />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Continue Watching */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Eye className="w-5 h-5 text-teal-500" />
                                Continue Watching
                            </h3>
                            <Link to="/history" className="text-sm text-teal-500 hover:text-teal-400 flex items-center gap-1">
                                View all <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {watchHistory.length > 0 ? (
                            <div className="space-y-3">
                                {watchHistory.slice(0, 3).map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                                    >
                                        <div className="w-16 h-10 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                                            <Film className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{item.name || 'Untitled'}</p>
                                            <p className="text-xs text-gray-500">{item.progress || 0}% watched</p>
                                        </div>
                                        <Play className="w-4 h-4 text-teal-500" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Film className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No watch history yet</p>
                                <Link to="/stream" className="text-teal-500 text-sm hover:underline">
                                    Start streaming
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Recent Downloads */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Download className="w-5 h-5 text-blue-500" />
                                Recent Downloads
                            </h3>
                            <Link to="/history" className="text-sm text-teal-500 hover:text-teal-400 flex items-center gap-1">
                                View all <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {downloadHistory.length > 0 ? (
                            <div className="space-y-3">
                                {downloadHistory.slice(0, 3).map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                            <Download className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{item.file_name || 'Untitled'}</p>
                                            <p className="text-xs text-gray-500">
                                                {item.file_size || 'Unknown size'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Download className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No downloads yet</p>
                                <Link to="/stream" className="text-teal-500 text-sm hover:underline">
                                    Start downloading
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pro Upgrade Banner */}
                {!isDemoMode && (
                    <div className="relative overflow-hidden p-6 lg:p-8 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 dark:from-purple-500/20 dark:via-pink-500/20 dark:to-purple-500/20 border border-purple-500/20">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-500/20 to-transparent rounded-full blur-2xl" />

                        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Crown className="w-6 h-6 text-purple-500" />
                                    <span className="text-sm font-semibold text-purple-500">PRO</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2">Upgrade to OmniStream Pro</h3>
                                <p className="text-gray-600 dark:text-gray-400 max-w-xl">
                                    Get unlimited streams, 4K quality, faster downloads, and zero ads.
                                    Start your free trial today.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all">
                                    Start Free Trial
                                </button>
                                <button className="px-6 py-3 bg-white/10 border border-purple-500/30 rounded-xl font-semibold hover:bg-white/20 transition-all">
                                    Learn More
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Searches */}
                {searchHistory.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <History className="w-5 h-5 text-gray-400" />
                                Recent Searches
                            </h2>
                            <Link to="/stream" className="text-sm text-teal-500 hover:text-teal-400 flex items-center gap-1">
                                New search <Plus className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {searchHistory.slice(0, 6).map((entry, index) => (
                                <Link
                                    key={index}
                                    to="/stream"
                                    className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-teal-500/30 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                                        <Link2 className="w-5 h-5 text-teal-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{entry.fileName || 'Untitled'}</p>
                                        <p className="text-xs text-gray-500 truncate">{entry.url}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
