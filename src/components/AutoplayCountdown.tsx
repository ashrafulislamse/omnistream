import { useState, useEffect, useRef } from "react";
import { Play, X, SkipForward } from "lucide-react";

interface AutoplayCountdownProps {
  nextFileName: string;
  nextThumbnail?: string;
  onPlay: () => void;
  onCancel: () => void;
  seconds?: number;
}

export function AutoplayCountdown({ nextFileName, nextThumbnail, onPlay, onCancel, seconds = 5 }: AutoplayCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onPlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [onPlay]);

  const progress = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="glass-card glow-border p-4 sm:p-5 animate-fade-in-up">
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="relative w-28 h-16 sm:w-36 sm:h-20 rounded-lg overflow-hidden shrink-0 bg-secondary/30">
          {nextThumbnail ? (
            <img src={nextThumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-5 h-5 text-muted-foreground/30" />
            </div>
          )}
          {/* Circular countdown */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/40">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted/30" strokeWidth="2" />
                <circle
                  cx="18" cy="18" r="16" fill="none"
                  className="stroke-primary"
                  strokeWidth="2.5"
                  strokeDasharray="100"
                  strokeDashoffset={100 - progress}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                {remaining}
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Up next</p>
          <p className="text-sm font-semibold text-foreground truncate mt-0.5">{nextFileName}</p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={() => { clearInterval(timerRef.current); onPlay(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Play Now
            </button>
            <button
              onClick={() => { clearInterval(timerRef.current); onCancel(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
