import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export function ThemeToggle({ variant = 'icon' }: { variant?: 'icon' | 'dropdown' | 'switch' }) {
    const { resolvedTheme, toggleTheme, theme, setTheme } = useTheme();

    if (variant === 'icon') {
        return (
            <button
                onClick={toggleTheme}
                data-tour="theme-toggle"
                className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
                {resolvedTheme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                ) : (
                    <Moon className="w-5 h-5" />
                )}
            </button>
        );
    }

    if (variant === 'switch') {
        return (
            <button
                onClick={toggleTheme}
                className={cn(
                    "relative w-14 h-7 rounded-full transition-colors duration-300",
                    resolvedTheme === 'dark'
                        ? "bg-teal-500"
                        : "bg-gray-300"
                )}
            >
                <div
                    className={cn(
                        "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-300",
                        resolvedTheme === 'dark' ? "translate-x-7" : "translate-x-0.5"
                    )}
                >
                    {resolvedTheme === 'dark' ? (
                        <Moon className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                    )}
                </div>
            </button>
        );
    }

    // Dropdown variant
    return (
        <div className="flex items-center gap-1 p-1 rounded-lg bg-black/5 dark:bg-white/5">
            <button
                onClick={() => setTheme('light')}
                className={cn(
                    "p-2 rounded-md transition-all",
                    theme === 'light'
                        ? "bg-white dark:bg-white/10 text-amber-500 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
                title="Light mode"
            >
                <Sun className="w-4 h-4" />
            </button>
            <button
                onClick={() => setTheme('dark')}
                className={cn(
                    "p-2 rounded-md transition-all",
                    theme === 'dark'
                        ? "bg-white dark:bg-white/10 text-blue-500 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
                title="Dark mode"
            >
                <Moon className="w-4 h-4" />
            </button>
            <button
                onClick={() => setTheme('system')}
                className={cn(
                    "p-2 rounded-md transition-all",
                    theme === 'system'
                        ? "bg-white dark:bg-white/10 text-teal-500 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
                title="System preference"
            >
                <Monitor className="w-4 h-4" />
            </button>
        </div>
    );
}

export default ThemeToggle;
