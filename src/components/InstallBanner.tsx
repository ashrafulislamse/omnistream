import { useState, useEffect } from "react";
import { Download, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    const ts = localStorage.getItem("pwa-banner-dismissed");
    if (!ts) return false;
    return Date.now() - Number(ts) < 7 * 24 * 60 * 60 * 1000;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isInstalled || dismissed) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      navigate("/install");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", String(Date.now()));
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="relative overflow-hidden glass-card flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 hover:border-primary/40 transition-all duration-500 group">
        {/* Animated shimmer background */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer pointer-events-none" />
        
        <div className="relative shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
          <Download className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            Install OmniStream
            <Sparkles className="w-3 h-3 text-primary" />
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {isIOS ? "Add to home screen for an app-like experience" : "Faster access, works offline, feels native"}
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="relative shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all duration-300 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="relative shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
