import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useDownloadHistory } from '@/hooks/useDownloadHistory';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import {
    Play, Download, Heart, Clock, TrendingUp, Eye,
    Zap, ArrowRight, Sparkles, Plus, Film, Folder,
    ChevronRight, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: string; up: boolean };
    color: 'teal' | 'purple' | 'orange' | 'pink';
    href?: string;
}

function StatCard({ title, value, icon, trend, color, href }: StatCardProps) {
    const colorClasses = {
        teal: 'from-teal-500/20 to-cyan-500/10 border-teal-500/20',
        purple: 'from-purple-500/20 to-pink-500/10 border-purple-500/20',
        orange: 'from-orange-500/20 to-amber-500/10 border-orange-500/20',
        pink: 'from-pink-500/20 to-rose-500/10 border-pink-500/20',
    };

    const iconColorClasses = {
        teal: 'bg-teal-500/20 text-teal-400',
        purple: 'bg-purple-500/20 text-purple-400',
        orange: 'bg-orange-500/20 text-orange-400',
        pink: 'bg-pink-500/20 text-pink-400',
    };

    const Wrapper = href ? Link : 'div';
    const wrapperProps = href ? { to: href } : {};

    return (
        <Wrapper
            {...wrapperProps as any}
            className={cn(
                "group relative p-5 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:scale-[1.02]",
                colorClasses[color],
                href && "cursor-pointer"
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2.5 rounded-xl", iconColorClasses[color])}>
                    {icon}
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                        trend.up ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    )}>
                        <TrendingUp className={cn("w-3 h-3", !trend.up && "rotate-180")} />
                        {trend.value}
                    </div>
                )}
            </div>
            <div className="text-3xl font-bold text-white tabular-nums">{value}</div>
            <div className="text-sm text-gray-400 mt-1 flex items-center justify-between">
                <span>{title}</span>
                {href && (
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </div>
        </Wrapper>
    );
}

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick?: () => void;
    href?: string;
    gradient: string;
}

function QuickAction({ icon, label, description, onClick, href, gradient }: QuickActionProps) {
    const Wrapper = href ? Link : 'button';
    const wrapperProps = href ? { to: href } : { onClick };

    return (
        <Wrapper
            {...wrapperProps as any}
            className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all"
        >
            <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                gradient
            )}>
                {icon}
            </div>
            <div className="flex-1 text-left">
                <div className="font-semibold text-white group-hover:text-teal-400 transition-colors">
                    {label}
                </div>
                <div className="text-xs text-gray-500">{description}</div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
        </Wrapper>
    );
}

interface ActivityItem {
    id: string;
    type: 'stream' | 'download' | 'favorite' | 'share';
    title: string;
    time: string;
    icon: React.ReactNode;
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
    const typeColors = {
        stream: 'bg-teal-500/20 text-teal-400',
        download: 'bg-blue-500/20 text-blue-400',
        favorite: 'bg-pink-500/20 text-pink-400',
        share: 'bg-purple-500/20 text-purple-400',
    };

    return (
        <div className="space-y-2">
            {items.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-xs mt-1">Start streaming to see your activity here</p>
                </div>
            ) : (
                items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                    >
                        <div className={cn("p-2 rounded-lg", typeColors[item.type])}>
                            {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{item.title}</div>
                            <div className="text-xs text-gray-500">{item.time}</div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export function DashboardWidgets() {
    const { user } = useAuth();
    const { favorites } = useFavorites();
    const { history: downloadHistory } = useDownloadHistory();
    const { history: searchHistory } = useSearchHistory();
    const watchHistory = useWatchHistory();

    // Get recent activity
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        // Combine and sort recent activities
        const activities: ActivityItem[] = [];

        // Add watch history
        const watchEntries = watchHistory.getAll?.() || [];
        watchEntries.slice(0, 3).forEach((entry, i) => {
            activities.push({
                id: `watch-${i}`,
                type: 'stream',
                title: entry.fileName || 'Video',
                time: formatRelativeTime(entry.updatedAt),
                icon: <Play className="w-4 h-4" />,
            });
        });

        // Add downloads
        downloadHistory?.slice(0, 3).forEach((entry, i) => {
            activities.push({
                id: `download-${i}`,
                type: 'download',
                title: entry.file_name || 'File',
                time: formatRelativeTime(entry.created_at),
                icon: <Download className="w-4 h-4" />,
            });
        });

        // Sort by time and take top 5
        setRecentActivity(activities.slice(0, 5));
    }, [watchHistory, downloadHistory]);

    const stats = {
        totalStreams: watchHistory.getAll?.()?.length || 0,
        totalDownloads: downloadHistory?.length || 0,
        totalFavorites: favorites?.length || 0,
        totalSearches: searchHistory?.length || 0,
    };

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Here's what's happening with your account
                    </p>
                </div>
                <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" />
                    New Stream
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Streams"
                    value={stats.totalStreams}
                    icon={<Play className="w-5 h-5" />}
                    color="teal"
                    trend={{ value: '+12%', up: true }}
                    href="/history"
                />
                <StatCard
                    title="Downloads"
                    value={stats.totalDownloads}
                    icon={<Download className="w-5 h-5" />}
                    color="purple"
                    href="/history"
                />
                <StatCard
                    title="Favorites"
                    value={stats.totalFavorites}
                    icon={<Heart className="w-5 h-5" />}
                    color="pink"
                    href="/favorites"
                />
                <StatCard
                    title="Saved Files"
                    value={stats.totalSearches}
                    icon={<Folder className="w-5 h-5" />}
                    color="orange"
                    href="/saved"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <QuickAction
                            icon={<Play className="w-5 h-5 text-white" />}
                            label="Stream Video"
                            description="Paste a TeraBox link"
                            href="/"
                            gradient="bg-gradient-to-br from-teal-500 to-cyan-500"
                        />
                        <QuickAction
                            icon={<Folder className="w-5 h-5 text-white" />}
                            label="Browse Library"
                            description="View saved files"
                            href="/saved"
                            gradient="bg-gradient-to-br from-purple-500 to-pink-500"
                        />
                        <QuickAction
                            icon={<Heart className="w-5 h-5 text-white" />}
                            label="Favorites"
                            description="Your favorite files"
                            href="/favorites"
                            gradient="bg-gradient-to-br from-pink-500 to-rose-500"
                        />
                        <QuickAction
                            icon={<Clock className="w-5 h-5 text-white" />}
                            label="Watch History"
                            description="Continue watching"
                            href="/history"
                            gradient="bg-gradient-to-br from-orange-500 to-amber-500"
                        />
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                        <Link to="/history" className="text-sm text-teal-400 hover:underline">
                            View all
                        </Link>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <ActivityFeed items={recentActivity} />
                    </div>
                </div>
            </div>


        </div>
    );
}

// Helper function to format relative time
function formatRelativeTime(dateStr: string | number | Date): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

export default DashboardWidgets;
