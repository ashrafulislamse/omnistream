import { Link } from 'react-router-dom';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { cn } from '@/lib/utils';
import {
    Cloud, HardDrive, Check, Plus, ExternalLink, Loader2,
    Trash2, RefreshCw, AlertCircle, ChevronRight, Zap,
    Database, Lock, Sparkles
} from 'lucide-react';

// Cloud source definitions
const cloudSources = [
    {
        id: 'terabox',
        name: 'TeraBox',
        description: 'Stream videos from TeraBox links',
        icon: <Zap className="w-8 h-8" />,
        color: 'from-teal-500 to-cyan-500',
        bgColor: 'bg-teal-500/10',
        borderColor: 'border-teal-500/30',
        isBuiltIn: true,
        connected: true,
    },
    {
        id: 'google-drive',
        name: 'Google Drive',
        description: 'Connect your Google Drive to stream videos',
        icon: (
            <svg className="w-8 h-8" viewBox="0 0 87.3 78" fill="none">
                <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA" />
                <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 43.65c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00AC47" />
                <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l5.4-9.35c.8-1.4 1.2-2.95 1.2-4.5H55.95L43.65 78h16.35c2.45 0 4.8-.65 6.85-1.85l6.7-3.85z" fill="#EA4335" />
                <path d="M43.65 25L29.9 0C28.2.8 26.6 2.05 25.4 3.7L1.2 43.65c-.8 1.4-1.2 2.95-1.2 4.5h27.5l16.15-23.15z" fill="#00832D" />
                <path d="M87.3 48.15H59.8L73.55 72a9.58 9.58 0 003.95-3.3l8.4-14.55c.8-1.4 1.2-2.95 1.4-6z" fill="#2684FC" />
                <path d="M59.8 48.15H87.3c0-1.55-.4-3.1-1.2-4.5L60.7 3.3C59.5 1.9 58 .8 56.35 0L43.65 25l16.15 23.15z" fill="#FFBA00" />
            </svg>
        ),
        color: 'from-blue-500 to-green-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        isBuiltIn: false,
        connected: false, // Will be dynamic
    },
    {
        id: 'onedrive',
        name: 'OneDrive',
        description: 'Microsoft OneDrive integration',
        icon: (
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.5 18.5c-3.04 0-5.5-2.46-5.5-5.5 0-2.49 1.67-4.59 3.95-5.26C9.27 5.59 11.04 4 13.23 4c2.07 0 3.83 1.43 4.39 3.36C19.49 7.73 21 9.47 21 11.5c0 2.49-2.01 4.5-4.5 4.5h-6z" />
            </svg>
        ),
        color: 'from-blue-600 to-blue-400',
        bgColor: 'bg-blue-600/10',
        borderColor: 'border-blue-600/30',
        isBuiltIn: false,
        connected: false,
        comingSoon: true,
    },
    {
        id: 'dropbox',
        name: 'Dropbox',
        description: 'Dropbox cloud storage',
        icon: (
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 6.19L6 10.19L12 14.19L6 18.19L0 14.19L6 10.19L0 6.19L6 2.19L12 6.19ZM11.94 15.72L6 19.72L0.06 15.72L0 15.77V17.72L6 21.77L12 17.72V15.72L11.94 15.72ZM12 6.19L18 10.19L12 14.19L18 18.19L24 14.19L18 10.19L24 6.19L18 2.19L12 6.19ZM12 15.72L18 19.72L23.94 15.72L24 15.77V17.72L18 21.77L12 17.72V15.72Z" />
            </svg>
        ),
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        isBuiltIn: false,
        connected: false,
        comingSoon: true,
    },
];

export default function SourcesPage() {
    const {
        isConnected: isGoogleConnected,
        userInfo: googleUser,
        storageQuota,
        connect: connectGoogle,
        disconnect: disconnectGoogle,
        isLoading
    } = useGoogleDrive();

    const formatBytes = (bytes: string) => {
        const b = parseInt(bytes);
        if (b === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStoragePercentage = () => {
        if (!storageQuota) return 0;
        return (parseInt(storageQuota.usage) / parseInt(storageQuota.limit)) * 100;
    };

    return (
        <div className="min-h-full px-4 lg:px-8 py-6 lg:py-8 animate-fade-in">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                        <Cloud className="w-8 h-8 text-teal-500" />
                        Cloud Sources
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Connect your cloud storage accounts to stream videos directly
                    </p>
                </div>

                {/* Info Banner */}
                <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                            Your data stays private
                        </p>
                        <p className="text-sm text-teal-600/80 dark:text-teal-400/80 mt-0.5">
                            We only request read-only access. Your files are streamed directly from your cloud storage.
                        </p>
                    </div>
                </div>

                {/* Sources Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cloudSources.map((source) => {
                        const isConnected = source.id === 'google-drive' ? isGoogleConnected : source.connected;
                        const user = source.id === 'google-drive' ? googleUser : null;

                        return (
                            <div
                                key={source.id}
                                className={cn(
                                    "relative p-6 rounded-2xl border transition-all",
                                    isConnected
                                        ? `${source.bgColor} ${source.borderColor}`
                                        : "bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/10",
                                    source.comingSoon && "opacity-60"
                                )}
                            >
                                {/* Coming Soon Badge */}
                                {source.comingSoon && (
                                    <div className="absolute top-4 right-4 px-2 py-1 bg-gray-500/20 rounded-full text-xs font-medium text-gray-500">
                                        Coming Soon
                                    </div>
                                )}

                                {/* Connected Badge */}
                                {isConnected && !source.comingSoon && (
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full text-xs font-medium text-green-600 dark:text-green-400">
                                        <Check className="w-3 h-3" />
                                        Connected
                                    </div>
                                )}

                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl flex items-center justify-center",
                                        isConnected
                                            ? `bg-gradient-to-br ${source.color} text-white`
                                            : "bg-gray-100 dark:bg-white/5 text-gray-500"
                                    )}>
                                        {source.icon}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold">{source.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {source.description}
                                        </p>

                                        {/* Connected User Info */}
                                        {isConnected && user && (
                                            <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-white/50 dark:bg-white/5">
                                                {user.picture && (
                                                    <img
                                                        src={user.picture}
                                                        alt={user.name}
                                                        className="w-6 h-6 rounded-full"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">{user.name}</p>
                                                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Storage Quota */}
                                        {isConnected && source.id === 'google-drive' && storageQuota && (
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                                    <span>{formatBytes(storageQuota.usage)} used</span>
                                                    <span>{formatBytes(storageQuota.limit)} total</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all"
                                                        style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-6 flex items-center gap-3">
                                    {source.isBuiltIn ? (
                                        <Link
                                            to="/stream"
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                                        >
                                            <Zap className="w-4 h-4" />
                                            Go to Stream
                                        </Link>
                                    ) : source.comingSoon ? (
                                        <button
                                            disabled
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-white/10 text-gray-500 rounded-xl font-medium cursor-not-allowed"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Coming Soon
                                        </button>
                                    ) : isConnected ? (
                                        <>
                                            <Link
                                                to="/drive"
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                                            >
                                                <HardDrive className="w-4 h-4" />
                                                Browse Files
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={source.id === 'google-drive' ? disconnectGoogle : undefined}
                                                className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                                title="Disconnect"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={source.id === 'google-drive' ? connectGoogle : undefined}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                            Connect {source.name}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Benefits Section */}
                <div className="mt-12">
                    <h2 className="text-lg font-semibold mb-4">Why connect your cloud storage?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            {
                                icon: <Zap className="w-5 h-5" />,
                                title: 'Instant Streaming',
                                description: 'Stream videos directly without downloading'
                            },
                            {
                                icon: <Database className="w-5 h-5" />,
                                title: 'Unified Library',
                                description: 'All your videos in one place'
                            },
                            {
                                icon: <Lock className="w-5 h-5" />,
                                title: 'Private & Secure',
                                description: 'Read-only access, your data stays yours'
                            },
                        ].map((benefit, i) => (
                            <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center mb-3">
                                    {benefit.icon}
                                </div>
                                <h3 className="font-medium">{benefit.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{benefit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
