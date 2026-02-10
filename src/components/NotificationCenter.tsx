import { useState, useEffect, createContext, useContext } from 'react';
import {
    Bell, X, Check, AlertTriangle, Info, Sparkles,
    Download, Heart, Share2, Trash2, CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Types ============
export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info' | 'update';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

// ============ Context ============
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const saved = localStorage.getItem('omnistream-notifications');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
            } catch {
                return [];
            }
        }
        return [];
    });

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('omnistream-notifications', JSON.stringify(notifications));
    }, [notifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            read: false,
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            removeNotification,
            clearAll,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}

// ============ Notification Panel ============
export function NotificationPanel({
    isOpen,
    onClose
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed z-50 inset-x-4 top-20 lg:inset-auto lg:right-4 lg:top-16 lg:w-96 animate-scale-in">
                <div className="bg-[#0f0f18] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-teal-400" />
                            <span className="font-semibold">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 text-xs rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                    title="Mark all as read"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                    title="Clear all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                <p className="text-gray-400">No notifications yet</p>
                                <p className="text-xs text-gray-600 mt-1">
                                    We'll notify you about important updates
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onRead={() => markAsRead(notification.id)}
                                        onRemove={() => removeNotification(notification.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ============ Notification Item ============
function NotificationItem({
    notification,
    onRead,
    onRemove
}: {
    notification: Notification;
    onRead: () => void;
    onRemove: () => void;
}) {
    const typeConfig = {
        success: { icon: <Check className="w-4 h-4" />, color: 'bg-emerald-500/20 text-emerald-400' },
        error: { icon: <X className="w-4 h-4" />, color: 'bg-red-500/20 text-red-400' },
        warning: { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400' },
        info: { icon: <Info className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-400' },
        update: { icon: <Sparkles className="w-4 h-4" />, color: 'bg-purple-500/20 text-purple-400' },
    };

    const config = typeConfig[notification.type];

    return (
        <div
            className={cn(
                "relative p-4 hover:bg-white/[0.02] transition-colors cursor-pointer group",
                !notification.read && "bg-teal-500/5"
            )}
            onClick={onRead}
        >
            {/* Unread indicator */}
            {!notification.read && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-teal-500 rounded-full" />
            )}

            <div className="flex gap-3">
                <div className={cn("p-2 rounded-lg flex-shrink-0", config.color)}>
                    {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{notification.title}</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                        >
                            <X className="w-3 h-3 text-gray-500" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] text-gray-600 mt-1.5">
                        {formatTimeAgo(notification.timestamp)}
                    </p>
                    {notification.action && (
                        <button
                            onClick={(e) => { e.stopPropagation(); notification.action?.onClick(); }}
                            className="mt-2 text-xs text-teal-400 hover:underline"
                        >
                            {notification.action.label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============ Notification Bell Button ============
export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { unreadCount } = useNotifications();

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 px-1.5 min-w-[18px] h-[18px] bg-teal-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}

// Helper
function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

export default NotificationPanel;
