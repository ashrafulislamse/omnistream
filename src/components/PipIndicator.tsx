import { usePip } from "@/contexts/PipContext";
import { X, PictureInPicture2 } from "lucide-react";

export function PipIndicator() {
  const { pipState, exitPip } = usePip();

  if (!pipState.isActive) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 glass-card glow-border px-4 py-2.5 flex items-center gap-3 animate-fade-in-up shadow-xl">
      <PictureInPicture2 className="w-4 h-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground truncate max-w-[180px]">{pipState.fileTitle}</p>
        <p className="text-[10px] text-muted-foreground">Playing in Picture-in-Picture</p>
      </div>
      <button
        onClick={exitPip}
        className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        title="Close PiP"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
