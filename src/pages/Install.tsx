import { useState, useEffect } from "react";
import { Download, Share, Smartphone, CheckCircle2, ArrowLeft, Zap, WifiOff, Layout, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const features = [
  { icon: Zap, label: "Lightning Fast", desc: "Instant loading with cached assets" },
  { icon: WifiOff, label: "Works Offline", desc: "Browse saved files without internet" },
  { icon: Layout, label: "Native Feel", desc: "Full-screen app experience" },
  { icon: Shield, label: "Auto Updates", desc: "Always the latest version" },
];

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[300px] h-[300px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to app
          </button>

          {/* App icon + title */}
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-24 h-24">
              <img
                src="/pwa-512x512.png"
                alt="OmniStream"
                className="w-24 h-24 rounded-2xl shadow-xl ring-1 ring-border/50"
              />
              <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-xl -z-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Install OmniStream</h1>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Get the full app experience — fast, offline-ready, and always up to date.
              </p>
            </div>
          </div>

          {/* Install action */}
          <div className="glass-card rounded-2xl p-5 border border-border/50 space-y-4">
            {isInstalled ? (
              <div className="flex items-center justify-center gap-2 py-3 text-primary font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Already installed!
              </div>
            ) : deferredPrompt ? (
              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full gap-2 h-12 text-sm font-bold shadow-lg hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]"
              >
                <Download className="w-5 h-5" />
                Install OmniStream
              </Button>
            ) : isIOS ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Install on iOS:</p>
                <ol className="space-y-3">
                  {[
                    { step: 1, content: <span>Tap the <Share className="inline w-4 h-4 -mt-0.5 text-primary" /> <strong>Share</strong> button in Safari</span> },
                    { step: 2, content: <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span> },
                    { step: 3, content: <span>Tap <strong>"Add"</strong> to confirm</span> },
                  ].map(({ step, content }) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center ring-1 ring-primary/20">
                        {step}
                      </span>
                      {content}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="text-center space-y-3 py-2">
                <Smartphone className="w-10 h-10 mx-auto text-primary/60" />
                <p className="text-sm text-muted-foreground">
                  Open this page in your mobile browser and tap <strong>"Add to Home Screen"</strong> from the menu.
                </p>
              </div>
            )}
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="glass-card rounded-xl p-3.5 border border-border/30 hover:border-primary/30 transition-colors group"
              >
                <Icon className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
