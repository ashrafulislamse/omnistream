import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-lg bg-gray-200 dark:bg-white/10",
                className
            )}
        />
    );
}

// Card Skeleton
export function CardSkeleton({ className }: SkeletonProps) {
    return (
        <div className={cn("p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5", className)}>
            <Skeleton className="aspect-video rounded-xl mb-4" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-4" />
            <div className="flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
        </div>
    );
}

// Stats Card Skeleton
export function StatsCardSkeleton() {
    return (
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
            <Skeleton className="w-12 h-12 rounded-xl mb-4" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-24" />
        </div>
    );
}

// List Item Skeleton
export function ListItemSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
            <Skeleton className="w-16 h-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
    );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
    return (
        <div className="min-h-full px-4 lg:px-8 py-6 lg:py-8 animate-fade-in">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                    <Skeleton className="h-12 w-40 rounded-xl" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <StatsCardSkeleton key={i} />
                    ))}
                </div>

                {/* Quick Actions */}
                <div>
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-16 rounded-xl" />
                        ))}
                    </div>
                </div>

                {/* Two Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                        <Skeleton className="h-6 w-40 mb-4" />
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <ListItemSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                        <Skeleton className="h-6 w-40 mb-4" />
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <ListItemSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Stream Page Skeleton
export function StreamSkeleton() {
    return (
        <div className="min-h-full animate-fade-in">
            {/* Hero */}
            <div className="relative px-4 lg:px-8 py-8 lg:py-12">
                <div className="max-w-4xl mx-auto text-center mb-8">
                    <Skeleton className="h-8 w-40 mx-auto mb-4 rounded-full" />
                    <Skeleton className="h-10 w-96 mx-auto mb-3" />
                    <Skeleton className="h-4 w-80 mx-auto" />
                </div>
                <Skeleton className="h-14 max-w-3xl mx-auto rounded-xl mb-8" />
                <div className="flex justify-center gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Skeleton className="w-8 h-8 rounded-lg" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Results */}
            <div className="px-4 lg:px-8 py-8 border-t border-gray-200 dark:border-white/5">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <Skeleton className="h-6 w-32 mb-2" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-28 rounded-xl" />
                            <Skeleton className="h-10 w-20 rounded-xl" />
                            <Skeleton className="h-10 w-32 rounded-xl" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Explore Page Skeleton
export function ExploreSkeleton() {
    return (
        <div className="min-h-full px-4 lg:px-8 py-6 lg:py-8 animate-fade-in">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <Skeleton className="h-8 w-40 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-12 w-80 rounded-xl" />
                </div>

                {/* Categories */}
                <div>
                    <Skeleton className="h-6 w-28 mb-4" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                                <Skeleton className="w-14 h-14 rounded-2xl mb-4" />
                                <Skeleton className="h-5 w-20 mb-2" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trending */}
                <div>
                    <Skeleton className="h-6 w-36 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Settings Skeleton
export function SettingsSkeleton() {
    return (
        <div className="min-h-full px-4 lg:px-8 py-6 lg:py-8 animate-fade-in">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="lg:w-64 flex-shrink-0 space-y-1">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-12 rounded-xl" />
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-6">
                        <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                            <Skeleton className="h-6 w-40 mb-6" />
                            <div className="flex items-center gap-6 mb-6">
                                <Skeleton className="w-20 h-20 rounded-2xl" />
                                <div>
                                    <Skeleton className="h-5 w-32 mb-2" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <Skeleton className="h-4 w-24 mb-2" />
                                    <Skeleton className="h-12 rounded-xl" />
                                </div>
                                <div>
                                    <Skeleton className="h-4 w-24 mb-2" />
                                    <Skeleton className="h-12 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
