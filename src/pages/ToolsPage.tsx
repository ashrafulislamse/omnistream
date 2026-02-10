import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Bookmark,
  Chrome,
  Smartphone,
  Download,
  Copy,
  CheckCircle,
  ExternalLink,
  Zap,
  MousePointer,
  Share2,
  Puzzle,
  Info,
} from "lucide-react";

export default function ToolsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  // Get the current origin for bookmarklet
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Bookmarklet code
  const bookmarkletCode = `javascript:(function(){
    var url = window.location.href;
    var domains = ['terabox.com','1024terabox.com','teraboxapp.com','1024tera.com'];
    var isTeraBox = domains.some(function(d){return url.includes(d);});
    if(isTeraBox){
      window.open('${appUrl}/?url='+encodeURIComponent(url),'_blank');
    }else{
      var links = document.querySelectorAll('a[href]');
      var found = [];
      links.forEach(function(a){
        domains.forEach(function(d){
          if(a.href.includes(d) && found.indexOf(a.href)===-1) found.push(a.href);
        });
      });
      if(found.length===1){
        window.open('${appUrl}/?url='+encodeURIComponent(found[0]),'_blank');
      }else if(found.length>1){
        var list = found.slice(0,5).join('\\n');
        alert('Found '+found.length+' TeraBox links. Opening first one.\\n'+list);
        window.open('${appUrl}/?url='+encodeURIComponent(found[0]),'_blank');
      }else{
        alert('No TeraBox links found on this page.');
      }
    }
  })();`;

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast({ title: "Copied!", description: "Code copied to clipboard" });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="container px-4 py-6 sm:py-8 max-w-4xl space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Puzzle className="w-6 h-6 text-primary" />
          Tools & Extensions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Save TeraBox links from anywhere with these quick-access tools
        </p>
      </div>

      {/* Bookmarklet Section */}
      <section className="glass-card p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bookmark className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Bookmarklet</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Drag to your bookmarks bar for one-click saving. Works on any browser!
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Draggable Bookmarklet */}
          <a
            href={bookmarkletCode}
            onClick={(e) => e.preventDefault()}
            draggable
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all cursor-grab active:cursor-grabbing"
          >
            <Zap className="w-5 h-5" />
            Save to OmniStream
          </a>

          <div className="flex-1 space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5" />
              Drag the button above to your bookmarks bar
            </p>
            <p className="text-xs text-muted-foreground">
              Or right-click → "Bookmark this link" → Add to toolbar
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">How it works</h3>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
              Click the bookmarklet while on any webpage
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">2</span>
              If you're on TeraBox, it opens the link in OmniStream
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
              On other sites, it scans for TeraBox links and opens them
            </li>
          </ol>
        </div>

        {/* Manual code copy for mobile */}
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Can't drag? Copy code manually ▸
          </summary>
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Input
                value={bookmarkletCode}
                readOnly
                className="pr-20 font-mono text-xs bg-secondary/30"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                onClick={() => copyToClipboard(bookmarkletCode, "bookmarklet")}
              >
                {copied === "bookmarklet" ? <CheckCircle className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Create a new bookmark, paste this as the URL
            </p>
          </div>
        </details>
      </section>

      {/* PWA Share Target */}
      <section className="glass-card p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Share2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Mobile Share</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Share TeraBox links directly to OmniStream from any app
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">Requires PWA installation</span>
            </div>
            <ol className="text-sm text-muted-foreground space-y-1.5">
              <li>1. Install OmniStream as an app (see below)</li>
              <li>2. Find a TeraBox link in any app</li>
              <li>3. Tap Share → OmniStream</li>
              <li>4. Link opens directly in the app!</li>
            </ol>
          </div>
          <Button onClick={() => navigate("/install")} className="gap-2 shrink-0">
            <Download className="w-4 h-4" />
            Install App
          </Button>
        </div>
      </section>

      {/* Browser Extension - Download Available */}
      <section className="glass-card p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
            <Chrome className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Browser Extension</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Full-featured extension for Chrome, Edge, and Brave
            </p>
          </div>
        </div>

        {/* Download Section */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  v1.0.0
                </span>
                <span className="text-sm font-medium text-foreground">OmniStream Extension</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Manual installation • Developer Mode required
              </p>
            </div>
            <a
              href="/extension-starter/omnistream-extension.zip"
              download="omnistream-extension.zip"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              Download Extension
            </a>
          </div>
        </div>

        {/* Installation Steps */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">?</span>
            Installation Guide
          </h3>
          <ol className="text-sm text-muted-foreground space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <p className="font-medium text-foreground">Download & Extract</p>
                <p className="text-xs">Click the button above, then extract the ZIP to a folder on your computer</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <p className="font-medium text-foreground">Open Extensions Page</p>
                <p className="text-xs">
                  Go to <code className="px-1.5 py-0.5 bg-secondary/50 rounded text-[10px]">chrome://extensions</code> in your browser
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <p className="font-medium text-foreground">Enable Developer Mode</p>
                <p className="text-xs">Toggle the "Developer mode" switch in the top-right corner</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <p className="font-medium text-foreground">Load Unpacked</p>
                <p className="text-xs">Click "Load unpacked" and select the extracted folder</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-medium text-foreground">Done!</p>
                <p className="text-xs">Pin the extension from the puzzle icon in your toolbar</p>
              </div>
            </li>
          </ol>
        </div>

        <Separator />

        {/* Features Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Extension Features</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MousePointer className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Right-Click Save</p>
                <p className="text-[10px] text-muted-foreground">Save any TeraBox link from context menu</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Auto-Detect Links</p>
                <p className="text-[10px] text-muted-foreground">Adds save button next to detected links</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Puzzle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Queue Popup</p>
                <p className="text-[10px] text-muted-foreground">View and manage queue from popup</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-mono font-bold text-primary">⌥S</span>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Keyboard Shortcut</p>
                <p className="text-[10px] text-muted-foreground">Alt+S to save highlighted link</p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">First-time setup:</span> After installing, click "Open OmniStream" in the extension popup and log in. Your session syncs automatically!
          </p>
        </div>
      </section>

      {/* API for Developers */}
      {user && (
        <section className="glass-card p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <ExternalLink className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">API Access</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Build your own integrations with our extension API
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-secondary/30 font-mono text-xs space-y-2 overflow-x-auto">
            <p className="text-muted-foreground"># Add link to queue</p>
            <p className="text-foreground">
              POST /functions/v1/extension-api/add-link
            </p>
            <p className="text-muted-foreground mt-2"># Get user's queue</p>
            <p className="text-foreground">
              GET /functions/v1/extension-api/queue
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Requires Bearer token authentication. See API docs for details.
          </p>
        </section>
      )}
    </div>
  );
}
