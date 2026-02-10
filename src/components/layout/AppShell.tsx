import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { CommandPalette } from './CommandPalette';
import { NotificationBell } from '@/components/NotificationCenter';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
    Play, Home, Heart, Clock, FolderOpen, Share2,
    Settings, HelpCircle, ChevronLeft, ChevronRight,
    LogOut, User, Crown, Search, Menu, X,
    Wrench, Plus, Sparkles, Library, Film,
    LayoutGrid, Zap, Shield, Command, Bell,
    ChevronDown, ExternalLink, Bolt, Layers,
    Bookmark, History, Link2, PanelLeftClose, PanelLeft,
    Compass, Flame, Cloud, HardDrive
} from 'lucide-react';

interface NavItem {
    label: string;
    icon: React.ReactNode;
    href: string;
    badge?: string | number;
    isNew?: boolean;
}

const mainNavItems: NavItem[] = [
    { label: 'Dashboard', icon: <LayoutGrid className="w-[18px] h-[18px]" />, href: '/dashboard' },
    { label: 'Stream Now', icon: <Zap className="w-[18px] h-[18px]" />, href: '/stream', isNew: true },
    { label: 'Library', icon: <Layers className="w-[18px] h-[18px]" />, href: '/saved' },
    { label: 'Favorites', icon: <Heart className="w-[18px] h-[18px]" />, href: '/favorites' },
    { label: 'History', icon: <History className="w-[18px] h-[18px]" />, href: '/history' },
];

const secondaryNavItems: NavItem[] = [
    { label: 'Cloud Sources', icon: <Cloud className="w-[18px] h-[18px]" />, href: '/sources', isNew: true },
    { label: 'Google Drive', icon: <HardDrive className="w-[18px] h-[18px]" />, href: '/drive' },
    { label: 'Explore', icon: <Compass className="w-[18px] h-[18px]" />, href: '/explore' },
    { label: 'Shared Links', icon: <Link2 className="w-[18px] h-[18px]" />, href: '/shared' },
    { label: 'Tools', icon: <Wrench className="w-[18px] h-[18px]" />, href: '/tools' },
    { label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" />, href: '/settings' },
];

const mobileNavItems = [
    { label: 'Home', icon: <Home className="w-5 h-5" />, href: '/dashboard' },
    { label: 'Stream', icon: <Zap className="w-5 h-5" />, href: '/stream' },
    { label: 'Library', icon: <Layers className="w-5 h-5" />, href: '/saved' },
    { label: 'Favorites', icon: <Heart className="w-5 h-5" />, href: '/favorites' },
    { label: 'Profile', icon: <User className="w-5 h-5" />, href: '/profile' },
];

function MobileBottomNav() {
    const location = useLocation();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
            {/* Glassmorphism background */}
            <div className="absolute inset-0 bg-white/80 dark:bg-[#0a0a12]/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/[0.06]" />

            <div className="relative flex items-center justify-around h-16 px-2">
                {mobileNavItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300",
                                isActive
                                    ? "text-teal-600 dark:text-teal-400"
                                    : "text-gray-400 dark:text-gray-500 active:scale-95"
                            )}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-teal-500/10 dark:bg-teal-500/15 rounded-2xl" />
                            )}
                            <span className="relative">{item.icon}</span>
                            <span className="relative text-[10px] font-semibold tracking-wide">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export function AppShell() {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { resolvedTheme } = useTheme();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved === 'true';
    });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Persist sidebar state
    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', sidebarCollapsed.toString());
    }, [sidebarCollapsed]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Command palette keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-[#07070c] text-gray-900 dark:text-white flex transition-colors duration-500">
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col fixed left-0 top-0 h-full z-30 transition-all duration-300 ease-out",
                    sidebarCollapsed ? "w-[76px]" : "w-[280px]"
                )}
            >
                {/* Sidebar Background with subtle gradient */}
                <div className="absolute inset-0 bg-white dark:bg-[#0c0c14] border-r border-gray-200/70 dark:border-white/[0.06]" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50/50 dark:to-black/20 pointer-events-none" />

                {/* Logo Section */}
                <div className={cn(
                    "relative flex items-center gap-3 h-[72px] px-5 border-b border-gray-200/70 dark:border-white/[0.06]",
                    sidebarCollapsed && "justify-center px-0"
                )}>
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                        <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        </div>
                    </div>
                    {!sidebarCollapsed && (
                        <div className="flex flex-col">
                            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                                OmniStream
                            </span>

                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="relative flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin">
                    {/* Quick Action Button */}
                    <div className={cn("px-2", sidebarCollapsed && "px-0")}>
                        {sidebarCollapsed ? (
                            <Link
                                to="/"
                                className="group flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-105 transition-all duration-300"
                                title="New Stream"
                            >
                                <Plus className="w-5 h-5" />
                            </Link>
                        ) : (
                            <Link
                                to="/stream"
                                data-tour="stream-button"
                                className="group flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] transition-all duration-300"
                            >
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <span className="font-semibold">New Stream</span>
                                <Zap className="w-4 h-4 ml-auto opacity-60" />
                            </Link>
                        )}
                    </div>

                    {/* Main Navigation */}
                    <div className="space-y-1">
                        {!sidebarCollapsed && (
                            <p className="px-4 mb-3 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.15em]">
                                Main Menu
                            </p>
                        )}
                        {mainNavItems.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                        isActive
                                            ? "bg-gradient-to-r from-teal-500/10 to-cyan-500/10 dark:from-teal-500/15 dark:to-cyan-500/15"
                                            : "hover:bg-gray-100 dark:hover:bg-white/[0.04]",
                                        sidebarCollapsed && "justify-center px-0 mx-2"
                                    )}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    {/* Active indicator bar */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full" />
                                    )}

                                    <span className={cn(
                                        "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                                        isActive
                                            ? "text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-500/20"
                                            : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:bg-gray-200/50 dark:group-hover:bg-white/[0.06]",
                                        sidebarCollapsed && "w-10 h-10"
                                    )}>
                                        {item.icon}
                                    </span>

                                    {!sidebarCollapsed && (
                                        <>
                                            <span className={cn(
                                                "font-medium text-sm transition-colors",
                                                isActive ? "text-teal-700 dark:text-teal-300" : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                            )}>
                                                {item.label}
                                            </span>

                                            {item.isNew && (
                                                <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-sm">
                                                    NEW
                                                </span>
                                            )}

                                            {item.badge && (
                                                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-full">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Divider with gradient */}
                    <div className="relative mx-4">
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />
                    </div>

                    {/* Secondary Navigation */}
                    <div className="space-y-1">
                        {!sidebarCollapsed && (
                            <p className="px-4 mb-3 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.15em]">
                                More
                            </p>
                        )}
                        {secondaryNavItems.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                        isActive
                                            ? "bg-gradient-to-r from-teal-500/10 to-cyan-500/10 dark:from-teal-500/15 dark:to-cyan-500/15"
                                            : "hover:bg-gray-100 dark:hover:bg-white/[0.04]",
                                        sidebarCollapsed && "justify-center px-0 mx-2"
                                    )}
                                    title={sidebarCollapsed ? item.label : undefined}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full" />
                                    )}

                                    <span className={cn(
                                        "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                                        isActive
                                            ? "text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-500/20"
                                            : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:bg-gray-200/50 dark:group-hover:bg-white/[0.06]",
                                        sidebarCollapsed && "w-10 h-10"
                                    )}>
                                        {item.icon}
                                    </span>

                                    {!sidebarCollapsed && (
                                        <span className={cn(
                                            "font-medium text-sm transition-colors",
                                            isActive ? "text-teal-700 dark:text-teal-300" : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                                        )}>
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Upgrade Button */}

                <div className="px-4 mb-2">
                    <button className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                        "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10",
                        "text-gray-400 hover:text-white"
                    )}>
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Crown className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                        {!sidebarCollapsed && (
                            <span className="font-medium bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:text-white transition-colors">
                                Upgrade to Pro
                            </span>
                        )}
                    </button>
                </div>

                {/* User Section */}
                <div className={cn(
                    "relative border-t border-gray-200/70 dark:border-white/[0.06]",
                    sidebarCollapsed ? "p-3" : "p-4"
                )}>
                    <div
                        className={cn(
                            "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200",
                            "hover:bg-gray-100 dark:hover:bg-white/[0.04]",
                            sidebarCollapsed && "justify-center p-2"
                        )}
                        onClick={() => !sidebarCollapsed && setUserMenuOpen(!userMenuOpen)}
                    >
                        {/* Avatar with status ring */}
                        <div className="relative">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full opacity-75" />
                            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-sm font-bold text-white ring-2 ring-white dark:ring-[#0c0c14]">
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#0c0c14]" />
                        </div>

                        {!sidebarCollapsed && (
                            <>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">
                                        {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                </div>
                                <ChevronDown className={cn(
                                    "w-4 h-4 text-gray-400 transition-transform duration-200",
                                    userMenuOpen && "rotate-180"
                                )} />
                            </>
                        )}
                    </div>

                    {/* User Dropdown Menu */}
                    {!sidebarCollapsed && userMenuOpen && (
                        <div className="mt-2 py-2 bg-white dark:bg-[#12121a] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl">
                            <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors">
                                <User className="w-4 h-4" />
                                <span>Profile</span>
                            </Link>
                            <Link to="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors">
                                <Settings className="w-4 h-4" />
                                <span>Settings</span>
                            </Link>
                            <div className="my-2 h-px bg-gray-200 dark:bg-white/10" />
                            <button
                                onClick={signOut}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={cn(
                        "absolute top-[72px] -right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                        "bg-white dark:bg-[#1a1a24] border border-gray-200 dark:border-white/10",
                        "shadow-lg hover:shadow-xl hover:scale-110",
                        "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    {sidebarCollapsed ? (
                        <PanelLeft className="w-4 h-4" />
                    ) : (
                        <PanelLeftClose className="w-4 h-4" />
                    )}
                </button>
            </aside>

            {/* Main Content */}
            <div className={cn(
                "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[280px]"
            )}>
                {/* Top Header */}
                <header className="sticky top-0 z-20">
                    {/* Glassmorphism background */}
                    <div className="absolute inset-0 bg-white/70 dark:bg-[#07070c]/70 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/[0.06]" />

                    <div className="relative flex items-center justify-between h-[72px] px-4 lg:px-6">
                        {/* Left - Mobile menu + Search */}
                        <div className="flex items-center gap-4 flex-1">
                            {/* Mobile Menu Button */}
                            <button
                                className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                                onClick={() => setMobileMenuOpen(true)}
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            {/* Search Bar */}
                            <button
                                onClick={() => setCommandPaletteOpen(true)}
                                className="group flex items-center gap-3 px-4 py-2.5 w-full max-w-lg bg-gray-100/80 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.06] rounded-xl hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
                            >
                                <Search className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500 flex-1 text-left">Search or paste URL...</span>
                                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white dark:bg-white/[0.08] rounded-md text-[10px] font-semibold text-gray-400 border border-gray-200/50 dark:border-white/10 shadow-sm">
                                    <Command className="w-3 h-3" />
                                    <span>K</span>
                                </kbd>
                            </button>
                        </div>

                        {/* Right - Actions */}
                        <div className="flex items-center gap-2">
                            {/* Theme Toggle */}
                            <ThemeToggle variant="icon" />

                            {/* Upgrade Button */}
                            <button className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300">
                                <Sparkles className="w-4 h-4" />
                                <span>Upgrade</span>
                            </button>

                            {/* Notifications */}
                            <NotificationBell />

                            {/* User Avatar (Mobile) */}
                            {user && (
                                <Link to="/profile" className="lg:hidden">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/50 dark:ring-white/20">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#07070c]" />
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto pb-20 lg:pb-0">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <>
                    <div
                        className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="lg:hidden fixed left-0 top-0 bottom-0 w-[300px] z-50 animate-slide-in-left">
                        {/* Background */}
                        <div className="absolute inset-0 bg-white dark:bg-[#0c0c14] border-r border-gray-200 dark:border-white/[0.06]" />

                        {/* Content */}
                        <div className="relative h-full flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 h-[72px] border-b border-gray-200/70 dark:border-white/[0.06]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
                                        <Play className="w-5 h-5 text-white fill-current" />
                                    </div>
                                    <span className="text-lg font-bold">OmniStream</span>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Nav Items */}
                            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                                <Link
                                    to="/"
                                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow-lg"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>New Stream</span>
                                </Link>

                                <div className="space-y-1">
                                    <p className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Main Menu</p>
                                    {mainNavItems.map((item) => {
                                        const isActive = location.pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                to={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                                                    isActive
                                                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                                                )}
                                            >
                                                {item.icon}
                                                <span className="font-medium">{item.label}</span>
                                                {item.isNew && (
                                                    <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                                                        NEW
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>

                                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />

                                <div className="space-y-1">
                                    <p className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">More</p>
                                    {secondaryNavItems.map((item) => {
                                        const isActive = location.pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                to={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                                                    isActive
                                                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                                                )}
                                            >
                                                {item.icon}
                                                <span className="font-medium">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </nav>

                            {/* Bottom Section */}
                            <div className="p-4 border-t border-gray-200/70 dark:border-white/[0.06] space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Theme</span>
                                    <ThemeToggle variant="dropdown" />
                                </div>
                                <button
                                    onClick={signOut}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="font-medium">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />

            {/* Command Palette */}
            <CommandPalette />
        </div>
    );
}
