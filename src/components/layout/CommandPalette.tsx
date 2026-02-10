import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Home, Heart, Clock, FolderOpen, Share2,
    Settings, Wrench, X, ArrowRight, Command, LogOut,
    Play, Download, User, Shield, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface CommandItem {
    id: string;
    title: string;
    description?: string;
    icon: React.ReactNode;
    action: () => void;
    shortcut?: string;
    category: 'navigation' | 'action' | 'account';
}

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    // Command items
    const commands: CommandItem[] = [
        // Navigation
        { id: 'home', title: 'Go to Home', description: 'Main streaming page', icon: <Home className="w-4 h-4" />, action: () => navigate('/'), shortcut: 'G H', category: 'navigation' },
        { id: 'favorites', title: 'Go to Favorites', description: 'Your saved favorites', icon: <Heart className="w-4 h-4" />, action: () => navigate('/favorites'), shortcut: 'G F', category: 'navigation' },
        { id: 'saved', title: 'Go to Saved Files', description: 'Previously fetched files', icon: <FolderOpen className="w-4 h-4" />, action: () => navigate('/saved'), shortcut: 'G S', category: 'navigation' },
        { id: 'history', title: 'Go to History', description: 'Download history', icon: <Clock className="w-4 h-4" />, action: () => navigate('/history'), shortcut: 'G D', category: 'navigation' },
        { id: 'shared', title: 'Go to Shared Links', description: 'Your shared links', icon: <Share2 className="w-4 h-4" />, action: () => navigate('/shared'), category: 'navigation' },
        { id: 'tools', title: 'Go to Tools', description: 'Utility tools', icon: <Wrench className="w-4 h-4" />, action: () => navigate('/tools'), shortcut: 'G T', category: 'navigation' },
        { id: 'settings', title: 'Go to Settings', description: 'Account settings', icon: <Settings className="w-4 h-4" />, action: () => navigate('/profile'), shortcut: 'G ,', category: 'navigation' },

        // Actions
        { id: 'new-stream', title: 'New Stream', description: 'Paste a TeraBox link', icon: <Play className="w-4 h-4" />, action: () => { navigate('/'); setTimeout(() => document.querySelector('input')?.focus(), 100); }, shortcut: 'N', category: 'action' },
        { id: 'help', title: 'Help & Support', description: 'Get help', icon: <HelpCircle className="w-4 h-4" />, action: () => window.open('https://github.com/yourusername/terastream', '_blank'), category: 'action' },

        // Account
        ...(user ? [
            { id: 'profile', title: 'View Profile', description: user.email, icon: <User className="w-4 h-4" />, action: () => navigate('/profile'), category: 'account' as const },
            { id: 'logout', title: 'Sign Out', description: 'Log out of your account', icon: <LogOut className="w-4 h-4" />, action: () => signOut(), category: 'account' as const },
        ] : []),
    ];

    // Filter commands based on query
    const filteredCommands = commands.filter(cmd =>
        cmd.title.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(query.toLowerCase())
    );

    // Group commands by category
    const groupedCommands = {
        navigation: filteredCommands.filter(c => c.category === 'navigation'),
        action: filteredCommands.filter(c => c.category === 'action'),
        account: filteredCommands.filter(c => c.category === 'account'),
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Open with Cmd+K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }

            // Close with Escape
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Handle navigation within list
    const handleKeyNav = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[selectedIndex]) {
                filteredCommands[selectedIndex].action();
                setIsOpen(false);
            }
        }
    }, [filteredCommands, selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

            {/* Command Palette */}
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl animate-scale-in">
                <div className="bg-[#0f0f18] border border-white/10 rounded-2xl shadow-2xl overflow-hidden mx-4">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                        <Search className="w-5 h-5 text-gray-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Type a command or search..."
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                            onKeyDown={handleKeyNav}
                            className="flex-1 bg-transparent text-white placeholder:text-gray-500 outline-none"
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded hover:bg-white/5"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    {/* Commands List */}
                    <div className="max-h-80 overflow-y-auto py-2">
                        {filteredCommands.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                                No commands found
                            </div>
                        ) : (
                            <>
                                {/* Navigation Group */}
                                {groupedCommands.navigation.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                            Navigation
                                        </div>
                                        {groupedCommands.navigation.map((cmd, index) => (
                                            <CommandItemRow
                                                key={cmd.id}
                                                item={cmd}
                                                isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                                                onClick={() => { cmd.action(); setIsOpen(false); }}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Action Group */}
                                {groupedCommands.action.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </div>
                                        {groupedCommands.action.map((cmd) => (
                                            <CommandItemRow
                                                key={cmd.id}
                                                item={cmd}
                                                isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                                                onClick={() => { cmd.action(); setIsOpen(false); }}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Account Group */}
                                {groupedCommands.account.length > 0 && (
                                    <div>
                                        <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                            Account
                                        </div>
                                        {groupedCommands.account.map((cmd) => (
                                            <CommandItemRow
                                                key={cmd.id}
                                                item={cmd}
                                                isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                                                onClick={() => { cmd.action(); setIsOpen(false); }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 text-[10px] text-gray-500">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↑↓</kbd>
                                navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↵</kbd>
                                select
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white/5 rounded">esc</kbd>
                                close
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Command className="w-3 h-3" />
                            <span>K to open</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CommandItemRow({
    item,
    isSelected,
    onClick
}: {
    item: CommandItem;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                isSelected ? "bg-white/5" : "hover:bg-white/5"
            )}
        >
            <span className={cn(
                "p-1.5 rounded-lg",
                isSelected ? "bg-teal-500/20 text-teal-400" : "bg-white/5 text-gray-400"
            )}>
                {item.icon}
            </span>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{item.title}</div>
                {item.description && (
                    <div className="text-xs text-gray-500 truncate">{item.description}</div>
                )}
            </div>
            {item.shortcut && (
                <div className="flex items-center gap-1">
                    {item.shortcut.split(' ').map((key, i) => (
                        <kbd key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-gray-400">
                            {key}
                        </kbd>
                    ))}
                </div>
            )}
            <ArrowRight className="w-4 h-4 text-gray-600" />
        </button>
    );
}

export default CommandPalette;
