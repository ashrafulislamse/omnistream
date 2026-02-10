import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import {
    User, Palette, Bell, Shield, LogOut, ChevronRight,
    Moon, Sun, Monitor, Check, Camera, Mail, Lock,
    Eye, EyeOff, Globe, Trash2, Download, Key,
    Smartphone, Volume2, VolumeX
} from 'lucide-react';

type Tab = 'account' | 'appearance' | 'notifications' | 'privacy';

export default function SettingsPage() {
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<Tab>('account');
    const [showPassword, setShowPassword] = useState(false);

    // Notification settings
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        downloads: true,
        updates: false,
        marketing: false,
        sound: true,
    });

    // Privacy settings
    const [privacy, setPrivacy] = useState({
        shareHistory: false,
        analytics: true,
        showOnline: true,
    });

    const tabs = [
        { id: 'account' as Tab, label: 'Account', icon: <User className="w-5 h-5" /> },
        { id: 'appearance' as Tab, label: 'Appearance', icon: <Palette className="w-5 h-5" /> },
        { id: 'notifications' as Tab, label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
        { id: 'privacy' as Tab, label: 'Privacy', icon: <Shield className="w-5 h-5" /> },
    ];

    const themeOptions = [
        { value: 'light', label: 'Light', icon: <Sun className="w-5 h-5" /> },
        { value: 'dark', label: 'Dark', icon: <Moon className="w-5 h-5" /> },
        { value: 'system', label: 'System', icon: <Monitor className="w-5 h-5" /> },
    ];

    const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
        <button
            onClick={onChange}
            className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                checked ? "bg-teal-500" : "bg-gray-300 dark:bg-white/10"
            )}
        >
            <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                checked ? "left-7" : "left-1"
            )} />
        </button>
    );

    return (
        <div className="min-h-full px-4 lg:px-8 py-6 lg:py-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl lg:text-3xl font-bold">Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage your account settings and preferences
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:w-64 flex-shrink-0">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                                        activeTab === tab.id
                                            ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                            : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
                                    )}
                                >
                                    {tab.icon}
                                    <span className="font-medium">{tab.label}</span>
                                    {activeTab === tab.id && (
                                        <ChevronRight className="w-4 h-4 ml-auto" />
                                    )}
                                </button>
                            ))}
                        </nav>

                        {/* Logout Button */}
                        <button
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-3 px-4 py-3 mt-4 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {/* Account Tab */}
                        {activeTab === 'account' && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                                    <h3 className="text-lg font-semibold mb-6">Profile Information</h3>

                                    {/* Avatar */}
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="relative">
                                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                                                {user?.email?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg hover:bg-teal-600 transition-colors">
                                                <Camera className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{user?.user_metadata?.display_name || user?.email?.split('@')[0]}</h4>
                                            <p className="text-sm text-gray-500">{user?.email}</p>
                                        </div>
                                    </div>

                                    {/* Form */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="email"
                                                    value={user?.email || ''}
                                                    disabled
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2">Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value="••••••••••••"
                                                    disabled
                                                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500"
                                                />
                                                <button
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            <button className="mt-2 text-sm text-teal-500 hover:text-teal-400">
                                                Change password
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
                                    <h3 className="text-lg font-semibold text-red-500 mb-2">Danger Zone</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        Once you delete your account, there is no going back. Please be certain.
                                    </p>
                                    <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors">
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Appearance Tab */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                                    <h3 className="text-lg font-semibold mb-6">Theme</h3>

                                    <div className="grid grid-cols-3 gap-4">
                                        {themeOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                                                className={cn(
                                                    "relative p-6 rounded-2xl border-2 transition-all",
                                                    theme === option.value
                                                        ? "border-teal-500 bg-teal-500/5"
                                                        : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto",
                                                    theme === option.value ? "bg-teal-500/10 text-teal-500" : "bg-gray-100 dark:bg-white/5"
                                                )}>
                                                    {option.icon}
                                                </div>
                                                <span className="font-medium">{option.label}</span>
                                                {theme === option.value && (
                                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center">
                                                        <Check className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                                    <h3 className="text-lg font-semibold mb-6">Language & Region</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Language</label>
                                            <div className="relative">
                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <select className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 appearance-none">
                                                    <option>English (US)</option>
                                                    <option>日本語</option>
                                                    <option>한국어</option>
                                                    <option>中文</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                                    <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>

                                    <div className="space-y-4">
                                        {[
                                            { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email', icon: <Mail className="w-5 h-5" /> },
                                            { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications', icon: <Bell className="w-5 h-5" /> },
                                            { key: 'downloads', label: 'Download Alerts', desc: 'Get notified when downloads complete', icon: <Download className="w-5 h-5" /> },
                                            { key: 'updates', label: 'Product Updates', desc: 'New features and improvements', icon: <Smartphone className="w-5 h-5" /> },
                                            { key: 'sound', label: 'Sound Effects', desc: 'Play sounds for notifications', icon: <Volume2 className="w-5 h-5" /> },
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-center justify-between py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500">
                                                        {item.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{item.label}</p>
                                                        <p className="text-sm text-gray-500">{item.desc}</p>
                                                    </div>
                                                </div>
                                                <Toggle
                                                    checked={notifications[item.key as keyof typeof notifications]}
                                                    onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Privacy Tab */}
                        {activeTab === 'privacy' && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                                    <h3 className="text-lg font-semibold mb-6">Privacy Settings</h3>

                                    <div className="space-y-4">
                                        {[
                                            { key: 'shareHistory', label: 'Share Watch History', desc: 'Allow others to see what you watch' },
                                            { key: 'analytics', label: 'Usage Analytics', desc: 'Help us improve by sharing usage data' },
                                            { key: 'showOnline', label: 'Show Online Status', desc: 'Let others see when you are online' },
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-center justify-between py-3">
                                                <div>
                                                    <p className="font-medium">{item.label}</p>
                                                    <p className="text-sm text-gray-500">{item.desc}</p>
                                                </div>
                                                <Toggle
                                                    checked={privacy[item.key as keyof typeof privacy]}
                                                    onChange={() => setPrivacy(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof privacy] }))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                                    <h3 className="text-lg font-semibold mb-6">Data Management</h3>

                                    <div className="space-y-4">
                                        <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors w-full text-left">
                                            <Download className="w-5 h-5 text-teal-500" />
                                            <div>
                                                <p className="font-medium">Download My Data</p>
                                                <p className="text-sm text-gray-500">Get a copy of your data</p>
                                            </div>
                                        </button>
                                        <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors w-full text-left">
                                            <Trash2 className="w-5 h-5 text-red-500" />
                                            <div>
                                                <p className="font-medium">Clear Watch History</p>
                                                <p className="text-sm text-gray-500">Remove all your watch history</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
