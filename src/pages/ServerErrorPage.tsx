import { Link } from 'react-router-dom';
import { Home, RefreshCw, AlertTriangle, Server, Mail } from 'lucide-react';

export default function ServerErrorPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a0a0f] dark:to-[#0c0c14] flex items-center justify-center p-6">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 dark:bg-red-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-[80px]" />
            </div>

            <div className="relative text-center max-w-lg">
                {/* 500 Number */}
                <div className="relative mb-8">
                    <h1 className="text-[150px] lg:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5 leading-none select-none">
                        500
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-red-500/30">
                            <Server className="w-12 h-12 text-white" />
                        </div>
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Server Error
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Something went wrong on our end. Our team has been notified and is working to fix the issue.
                </p>

                {/* Status */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium mb-8">
                    <AlertTriangle className="w-4 h-4" />
                    We're working on it
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105 transition-all"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                    >
                        <Home className="w-5 h-5" />
                        Go to Dashboard
                    </Link>
                </div>

                {/* Support */}
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Still having issues?</p>
                    <a
                        href="mailto:support@omnistream.app"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-medium transition-colors"
                    >
                        <Mail className="w-4 h-4" />
                        Contact Support
                    </a>
                </div>

                {/* Error ID */}
                <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">
                    Error ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                </p>
            </div>
        </div>
    );
}
