import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
    Play, Download, Zap, Shield, Globe, Clock,
    ArrowRight, ChevronDown, CheckCircle, Sparkles,
    Film, Lock, Gauge, Users, Star, Menu, X,
    Laptop, Smartphone, Tv, Cloud, Rocket, Gift, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Main Landing Page ============
export function LandingPage() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-[#030308] text-gray-900 dark:text-white overflow-x-hidden transition-colors duration-300">
            {/* Navbar */}
            <nav className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                isScrolled
                    ? "bg-white/90 dark:bg-[#030308]/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/5"
                    : "bg-transparent"
            )}>
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
                                <Play className="w-5 h-5 text-white fill-current" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">OmniStream</span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
                            <a href="#how-it-works" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">How it Works</a>
                            <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
                            <a href="#faq" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</a>
                        </div>

                        {/* CTA */}
                        <div className="hidden md:flex items-center gap-3">
                            <ThemeToggle variant="icon" />
                            <Link to="/auth" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                                Sign In
                            </Link>
                            <Link to="/auth" className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-teal-500/25">
                                Get Started Free
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex md:hidden items-center gap-2">
                            <ThemeToggle variant="icon" />
                            <button
                                className="p-2"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white/95 dark:bg-[#030308]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/5">
                        <div className="container mx-auto px-4 py-4 space-y-4">
                            <a href="#features" className="block text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2">Features</a>
                            <a href="#how-it-works" className="block text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2">How it Works</a>
                            <a href="#pricing" className="block text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2">Pricing</a>
                            <a href="#faq" className="block text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2">FAQ</a>
                            <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-3">
                                <Link to="/auth" className="block text-center py-2 text-gray-600 dark:text-gray-300">Sign In</Link>
                                <Link to="/auth" className="block text-center py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full font-semibold">
                                    Get Started Free
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <HeroSection />

            {/* Trusted By Section */}
            <TrustedBySection />

            {/* Features Section */}
            <FeaturesSection />

            {/* How It Works */}
            <HowItWorksSection />

            {/* Stats Section */}
            <StatsSection />

            {/* Devices Section */}
            <DevicesSection />

            {/* Pricing Section */}
            <PricingSection />

            {/* Testimonials */}
            <TestimonialsSection />

            {/* FAQ Section */}
            <FAQSection />

            {/* CTA Section */}
            <CTASection />

            {/* Footer */}
            <Footer />
        </div>
    );
}

// ============ Hero Section ============
function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-[150px]" />
                <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/3 rounded-full blur-[100px]" />
            </div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNncmlkKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-40 dark:opacity-100" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="max-w-5xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-8">
                        <Rocket className="w-4 h-4 text-teal-500" />
                        <span className="text-sm font-medium text-teal-600 dark:text-teal-400">Now supporting Google Drive, TeraBox & more</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
                        <span className="block">Stream From</span>
                        <span className="block bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                            Anywhere
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10">
                        One platform for <span className="text-gray-900 dark:text-white font-semibold">Google Drive</span>, <span className="text-gray-900 dark:text-white font-semibold">TeraBox</span> & more — stream in HD, download at full speed.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Link
                            to="/auth"
                            className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl font-semibold text-lg text-white hover:shadow-2xl hover:shadow-teal-500/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Start Streaming Free
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    {/* Demo Info */}
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-12">
                        No credit card required • Instant access • Cancel anytime
                    </p>

                    {/* Trust Indicators */}
                    <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                            <span>No registration required</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-blue-500" />
                            </div>
                            <span>100% secure & private</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-purple-500" />
                            </div>
                            <span>Instant streaming</span>
                        </div>
                    </div>
                </div>

                {/* Browser Mockup */}
                <div className="mt-16 md:mt-24 max-w-5xl mx-auto">
                    <div className="relative">
                        {/* Glow Effect */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-purple-500/20 rounded-3xl blur-3xl opacity-60" />

                        {/* Browser Frame */}
                        <div className="relative bg-white dark:bg-[#0f0f18] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-2xl">
                            {/* Browser Header */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-[#0a0a12] border-b border-gray-200 dark:border-white/5">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <div className="flex-1 flex justify-center">
                                    <div className="px-6 py-1.5 bg-white dark:bg-white/5 rounded-lg text-xs text-gray-500 border border-gray-200 dark:border-white/10">
                                        🔒 omnistream.app
                                    </div>
                                </div>
                            </div>

                            {/* App Content Preview */}
                            <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 dark:from-[#0a0a0f] to-gray-100 dark:to-[#0f0f18] relative overflow-hidden">
                                {/* Animated Elements */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative">
                                        <div className="absolute -inset-8 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-full blur-2xl animate-pulse" />
                                        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-teal-500/30">
                                            <Play className="w-12 h-12 text-white fill-current" />
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
                                    <p className="text-white text-lg font-medium">Paste any TeraBox link to start streaming...</p>
                                    <div className="mt-3 h-1 w-1/3 bg-teal-500 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <ChevronDown className="w-6 h-6 text-gray-400" />
            </div>
        </section>
    );
}

// ============ Trusted By Section ============
function TrustedBySection() {
    return (
        <section className="py-12 border-y border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
            <div className="container mx-auto px-4 sm:px-6">
                <p className="text-center text-sm text-gray-500 mb-8">Trusted by 500,000+ users worldwide</p>
                <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
                    {/* Placeholder logos */}
                    {['Content Creators', 'Developers', 'Educators', 'Teams', 'Enterprises'].map((name) => (
                        <div key={name} className="flex items-center gap-2 text-gray-400">
                            <Film className="w-5 h-5" />
                            <span className="font-semibold">{name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============ Features Section ============
function FeaturesSection() {
    const features = [
        {
            icon: <Play className="w-6 h-6" />,
            title: "4K HD Streaming",
            description: "Stream videos in crystal-clear quality with adaptive bitrate. No buffering, no lag.",
            gradient: "from-teal-500 to-cyan-500",
            bgGradient: "from-teal-500/10 to-cyan-500/10"
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: "Lightning Downloads",
            description: "Parallel download links for maximum speed. Get your files in seconds, not minutes.",
            gradient: "from-amber-500 to-orange-500",
            bgGradient: "from-amber-500/10 to-orange-500/10"
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "100% Private",
            description: "Zero-log policy with encrypted connections. Your data stays your data.",
            gradient: "from-purple-500 to-pink-500",
            bgGradient: "from-purple-500/10 to-pink-500/10"
        },
        {
            icon: <Globe className="w-6 h-6" />,
            title: "No Sign-up Needed",
            description: "Start streaming immediately. No email, no account required for basic features.",
            gradient: "from-blue-500 to-indigo-500",
            bgGradient: "from-blue-500/10 to-indigo-500/10"
        },
        {
            icon: <Film className="w-6 h-6" />,
            title: "All Formats",
            description: "Play MKV, MP4, AVI, WEBM and more. Built-in codec support for everything.",
            gradient: "from-green-500 to-emerald-500",
            bgGradient: "from-green-500/10 to-emerald-500/10"
        },
        {
            icon: <Clock className="w-6 h-6" />,
            title: "Resume Anywhere",
            description: "Continue from where you stopped. Cross-device sync keeps your progress.",
            gradient: "from-rose-500 to-red-500",
            bgGradient: "from-rose-500/10 to-red-500/10"
        }
    ];

    return (
        <section id="features" className="py-24 md:py-32">
            <div className="container mx-auto px-4 sm:px-6">
                {/* Section Header */}
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-sm font-medium mb-6">
                        <Sparkles className="w-4 h-4" />
                        Powerful Features
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Everything you need to <span className="text-teal-500">stream smarter</span>
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                        Built for speed, designed for simplicity. The best streaming experience, period.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group relative p-8 rounded-3xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                            {/* Icon */}
                            <div className={cn(
                                "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 text-white",
                                feature.gradient
                            )}>
                                {feature.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============ How It Works ============
function HowItWorksSection() {
    const steps = [
        {
            number: "1",
            title: "Paste Your Link",
            description: "Copy any TeraBox share link and paste it into the input box",
            icon: <Download className="w-6 h-6" />
        },
        {
            number: "2",
            title: "Instant Processing",
            description: "We fetch file info and generate streaming links in under 2 seconds",
            icon: <Zap className="w-6 h-6" />
        },
        {
            number: "3",
            title: "Stream or Download",
            description: "Watch in HD quality or download at maximum speed — your choice",
            icon: <Play className="w-6 h-6" />
        }
    ];

    return (
        <section id="how-it-works" className="py-24 md:py-32 bg-gray-50 dark:bg-white/[0.01]">
            <div className="container mx-auto px-4 sm:px-6">
                {/* Section Header */}
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-6">
                        <Gauge className="w-4 h-4" />
                        Simple Process
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Three steps to <span className="text-cyan-500">start streaming</span>
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                        No complicated setup. Just paste your link and go.
                    </p>
                </div>

                {/* Steps */}
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {steps.map((step, index) => (
                            <div key={index} className="relative text-center">
                                {/* Connector */}
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500" />
                                )}

                                {/* Step Number */}
                                <div className="relative inline-flex items-center justify-center w-32 h-32 mb-8">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20" />
                                    <div className="absolute inset-3 rounded-full bg-white dark:bg-[#0a0a0f] border-2 border-teal-500/30" />
                                    <div className="relative z-10 text-center">
                                        <span className="block text-4xl font-bold text-teal-500">{step.number}</span>
                                    </div>
                                </div>

                                {/* Content */}
                                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 max-w-xs mx-auto">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ============ Stats Section ============
function StatsSection() {
    const stats = [
        { value: "10M+", label: "Files Streamed", icon: <Film className="w-5 h-5" /> },
        { value: "500K+", label: "Happy Users", icon: <Users className="w-5 h-5" /> },
        { value: "99.9%", label: "Uptime", icon: <Zap className="w-5 h-5" /> },
        { value: "4.9★", label: "User Rating", icon: <Star className="w-5 h-5" /> }
    ];

    return (
        <section className="py-20 bg-gradient-to-r from-teal-500 to-cyan-500">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <div key={index} className="text-center text-white">
                            <div className="flex justify-center mb-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="text-4xl md:text-5xl font-bold mb-2">
                                {stat.value}
                            </div>
                            <div className="text-white/80">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============ Devices Section ============
function DevicesSection() {
    return (
        <section className="py-24 md:py-32">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Stream on <span className="text-teal-500">any device</span>
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                        Works seamlessly across all your devices. PWA support for native app experience.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-8">
                    {[
                        { icon: <Laptop className="w-8 h-8" />, label: "Desktop" },
                        { icon: <Smartphone className="w-8 h-8" />, label: "Mobile" },
                        { icon: <Tv className="w-8 h-8" />, label: "Smart TV" },
                        { icon: <Cloud className="w-8 h-8" />, label: "Web Browser" }
                    ].map((device, index) => (
                        <div key={index} className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                            <div className="w-16 h-16 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                                {device.icon}
                            </div>
                            <span className="font-medium">{device.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============ Pricing Section ============
function PricingSection() {
    const plans = [
        {
            name: "Free",
            price: "$0",
            period: "forever",
            description: "Perfect for casual users",
            features: [
                "20 streams per day",
                "5 downloads per day",
                "720p max quality",
                "Basic support",
                "Ad-supported"
            ],
            cta: "Get Started",
            popular: false
        },
        {
            name: "Pro",
            price: "$4.99",
            period: "/month",
            description: "For power users who want more",
            features: [
                "Unlimited streams",
                "Unlimited downloads",
                "4K quality",
                "Priority support",
                "No ads",
                "Collections & folders",
                "API access"
            ],
            cta: "Start Free Trial",
            popular: true
        },
        {
            name: "Team",
            price: "$9.99",
            period: "/month",
            description: "Share with family & friends",
            features: [
                "Everything in Pro",
                "5 user accounts",
                "Shared collections",
                "Admin controls",
                "Priority queue",
                "Custom branding"
            ],
            cta: "Contact Sales",
            popular: false
        }
    ];

    return (
        <section id="pricing" className="py-24 md:py-32 bg-gray-50 dark:bg-white/[0.01]">
            <div className="container mx-auto px-4 sm:px-6">
                {/* Section Header */}
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-medium mb-6">
                        <Gift className="w-4 h-4" />
                        Simple Pricing
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Plans for <span className="text-purple-500">everyone</span>
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                        Start free, upgrade when you need more power
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={cn(
                                "relative p-8 rounded-3xl border",
                                plan.popular
                                    ? "bg-gradient-to-b from-teal-500/10 to-transparent dark:from-teal-500/5 border-teal-500/30 scale-105"
                                    : "bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/5"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full text-sm font-semibold text-white shadow-lg">
                                    Most Popular
                                </div>
                            )}

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-2">
                                    <span className="text-5xl font-bold">{plan.price}</span>
                                    <span className="text-gray-500">{plan.period}</span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">{plan.description}</p>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <CheckCircle className={cn(
                                            "w-5 h-5",
                                            plan.popular ? "text-teal-500" : "text-gray-400"
                                        )} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button className={cn(
                                "w-full py-4 rounded-2xl font-semibold transition-all",
                                plan.popular
                                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-teal-500/30"
                                    : "bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10"
                            )}>
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============ Testimonials Section ============
function TestimonialsSection() {
    const testimonials = [
        {
            name: "Alex Johnson",
            role: "Content Creator",
            avatar: "AJ",
            content: "OmniStream has completely changed how I access my TeraBox files. The streaming quality is incredible and there's no buffering at all!",
            rating: 5
        },
        {
            name: "Sarah Chen",
            role: "Photographer",
            avatar: "SC",
            content: "Finally, a tool that just works. No more tedious downloads, I can preview everything instantly. The UI is beautiful too.",
            rating: 5
        },
        {
            name: "Mike Rodriguez",
            role: "Developer",
            avatar: "MR",
            content: "The API is well-documented and reliable. Integrated it into my workflow in under an hour. Great developer experience!",
            rating: 5
        }
    ];

    return (
        <section className="py-24 md:py-32">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-medium mb-6">
                        <Heart className="w-4 h-4" />
                        Testimonials
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Loved by <span className="text-rose-500">thousands</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {testimonials.map((t, index) => (
                        <div key={index} className="p-8 rounded-3xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-lg font-bold text-white">
                                    {t.avatar}
                                </div>
                                <div>
                                    <div className="font-bold text-lg">{t.name}</div>
                                    <div className="text-gray-500">{t.role}</div>
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">"{t.content}"</p>
                            <div className="flex gap-1">
                                {[...Array(t.rating)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============ FAQ Section ============
function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs = [
        {
            question: "Is OmniStream completely free to use?",
            answer: "Yes! OmniStream offers a generous free tier with 20 streams and 5 downloads per day. For unlimited access, we offer affordable premium plans starting at just $4.99/month."
        },
        {
            question: "Do I need a TeraBox account?",
            answer: "No, you don't need a TeraBox account. Simply paste any public TeraBox share link and start streaming immediately. It's that simple."
        },
        {
            question: "Is my data secure and private?",
            answer: "Absolutely. We use military-grade encryption and maintain a strict zero-log policy. We don't store any of your personal data or viewing history."
        },
        {
            question: "What video formats are supported?",
            answer: "OmniStream supports all major video formats including MP4, MKV, AVI, MOV, WEBM, and more. Our player automatically handles format conversion."
        },
        {
            question: "Can I use OmniStream on my phone?",
            answer: "Yes! OmniStream is fully responsive and works beautifully on any device. You can also install it as a Progressive Web App (PWA) for a native app experience."
        }
    ];

    return (
        <section id="faq" className="py-24 md:py-32 bg-gray-50 dark:bg-white/[0.01]">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium mb-6">
                        <HelpCircle className="w-4 h-4" />
                        FAQ
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Got <span className="text-green-500">questions?</span>
                    </h2>
                </div>

                <div className="max-w-3xl mx-auto space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                            >
                                <span className="font-semibold text-lg">{faq.question}</span>
                                <ChevronDown className={cn(
                                    "w-5 h-5 text-gray-500 transition-transform",
                                    openIndex === index && "rotate-180"
                                )} />
                            </button>
                            {openIndex === index && (
                                <div className="px-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============ CTA Section ============
function CTASection() {
    return (
        <section className="py-24 md:py-32">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="relative max-w-5xl mx-auto text-center p-12 md:p-16 rounded-3xl overflow-hidden">
                    {/* Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2dyaWQpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-30" />

                    <div className="relative z-10 text-white">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Ready to stream without limits?
                        </h2>
                        <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                            Join 500,000+ users who trust OmniStream for multi-cloud streaming.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/auth"
                                className="w-full sm:w-auto px-8 py-4 bg-white text-teal-600 rounded-2xl font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                                Get Started Free
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ============ Footer ============
function Footer() {
    return (
        <footer className="border-t border-gray-200 dark:border-white/5 py-16 bg-gray-50 dark:bg-[#030308]">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-2 md:col-span-1">
                        <Link to="/" className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white fill-current" />
                            </div>
                            <span className="text-xl font-bold">OmniStream</span>
                        </Link>
                        <p className="text-gray-500 max-w-xs">
                            The fastest way to stream and download TeraBox content. No limits, no hassle.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Product</h4>
                        <ul className="space-y-3 text-gray-500">
                            <li><a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a></li>
                            <li><a href="#pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a></li>
                            <li><Link to="/install" className="hover:text-gray-900 dark:hover:text-white transition-colors">Download App</Link></li>
                            <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Changelog</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Resources</h4>
                        <ul className="space-y-3 text-gray-500">
                            <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Documentation</a></li>
                            <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">API Reference</a></li>
                            <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Browser Extension</a></li>
                            <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Help Center</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-4">Legal</h4>
                        <ul className="space-y-3 text-gray-500">
                            <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Cookie Policy</a></li>
                            <li><a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">DMCA</a></li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-200 dark:border-white/5">
                    <p className="text-gray-500">
                        © 2025 OmniStream. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4 mt-4 md:mt-0">
                        <a href="#" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                        </a>
                        <a href="#" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// Import HelpCircle for FAQ
function HelpCircle(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
        </svg>
    );
}

export default LandingPage;
