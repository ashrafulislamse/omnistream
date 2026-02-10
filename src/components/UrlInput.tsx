import { useState, useCallback } from "react";
import { Search, Loader2, Layers, Link2, Clipboard, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  onBatchSubmit?: (urls: string[]) => void;
  loading: boolean;
}

const TERABOX_PATTERN = /https?:\/\/[^\s]*(?:terabox|1024terabox|teraboxapp|1024tera)\.[^\s]*/gi;

function extractUrls(text: string): string[] {
  const matches = text.match(TERABOX_PATTERN);
  if (matches) return [...new Set(matches)];
  // Fallback: split by newlines and filter valid-looking URLs
  return [...new Set(
    text.split(/[\n,]+/).map((s) => s.trim()).filter((s) => s.startsWith("http"))
  )];
}

export function UrlInput({ onSubmit, onBatchSubmit, loading }: UrlInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);

  const handleInputChange = useCallback((val: string) => {
    setInput(val);
    if (mode === "bulk") {
      setDetectedUrls(extractUrls(val));
    }
  }, [mode]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    const urls = extractUrls(pasted);
    // Auto-switch to bulk if multiple URLs detected
    if (urls.length > 1 && mode === "single") {
      e.preventDefault();
      setMode("bulk");
      setInput(pasted);
      setDetectedUrls(urls);
    }
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "bulk") {
      const urls = detectedUrls.length > 0 ? detectedUrls : extractUrls(input);
      if (urls.length > 0 && onBatchSubmit) {
        onBatchSubmit(urls);
      } else if (urls.length === 1) {
        onSubmit(urls[0]);
      }
    } else {
      if (input.trim()) onSubmit(input.trim());
    }
  };

  const removeDetectedUrl = (url: string) => {
    setDetectedUrls((prev) => prev.filter((u) => u !== url));
  };

  const switchMode = () => {
    const next = mode === "single" ? "bulk" : "single";
    setMode(next);
    setInput("");
    setDetectedUrls([]);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-3">
      {mode === "single" ? (
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste a TerraBox link..."
              className="h-12 pl-10 pr-4 text-sm glass-card border-border/40 transition-all duration-500 hover:border-primary/40 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)] focus:ring-2 focus:ring-primary/40 focus:border-primary/60 focus:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.35),inset_0_0_15px_-8px_hsl(var(--primary)/0.08)] placeholder:text-muted-foreground/50"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-12 px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1.5" />Fetch</>}
          </Button>
        </div>
      ) : (
        <div className="glass-card p-4 space-y-3 glow-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Layers className="w-4 h-4 text-primary" />
              Bulk Fetch
            </div>
            {detectedUrls.length > 0 && (
              <span className="text-xs text-primary flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {detectedUrls.length} link{detectedUrls.length > 1 ? "s" : ""} detected
              </span>
            )}
          </div>

          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={"Paste multiple TerraBox links here...\nOne per line, or just paste a block of text containing links — they'll be auto-detected."}
            className="w-full h-28 px-3 py-2.5 text-sm bg-background/60 rounded-lg border border-border/40 transition-all duration-500 hover:border-primary/40 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 focus:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.35),inset_0_0_15px_-8px_hsl(var(--primary)/0.08)] placeholder:text-muted-foreground/40 resize-none font-mono"
            disabled={loading}
          />

          {/* Detected URLs preview */}
          {detectedUrls.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {detectedUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background/40 group">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-mono flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs text-foreground/80 truncate flex-1 font-mono">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeDetectedUrl(url)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border/50 text-muted-foreground"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  handleInputChange(input ? input + "\n" + text : text);
                } catch { /* clipboard not available */ }
              }}
            >
              <Clipboard className="w-3 h-3 mr-1.5" />
              Paste from clipboard
            </Button>
            <div className="flex-1" />
            <Button
              type="submit"
              disabled={loading || detectedUrls.length === 0}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Search className="w-4 h-4 mr-1.5" />
              )}
              Fetch {detectedUrls.length > 0 ? `${detectedUrls.length} Links` : ""}
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={switchMode}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
        >
          {mode === "single" ? (
            <><Layers className="w-3 h-3" />Bulk fetch multiple URLs</>
          ) : (
            <><Link2 className="w-3 h-3" />Single URL mode</>
          )}
        </button>
      </div>
    </form>
  );
}
