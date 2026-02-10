import { useEffect, useCallback } from "react";

interface VideoKeyboardShortcutsOptions {
  /** Video element ref */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Container element ref (for fullscreen) */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Callback for toggling fullscreen */
  onToggleFullscreen?: () => void;
  /** Callback for toggling mute */
  onToggleMute?: () => void;
  /** Seek amount in seconds for arrow keys */
  seekAmount?: number;
}

/**
 * YouTube-style keyboard shortcuts for video player
 * 
 * Space/K: Play/Pause
 * F: Toggle fullscreen
 * M: Toggle mute
 * ←/→: Seek ±10s (or custom amount)
 * ↑/↓: Volume ±10%
 * 0-9: Seek to 0%-90% of video
 * J: Seek back 10s
 * L: Seek forward 10s
 * Home: Go to start
 * End: Go to end
 * ,: Frame back (when paused)
 * .: Frame forward (when paused)
 */
export function useVideoKeyboardShortcuts({
  videoRef,
  containerRef,
  enabled = true,
  onToggleFullscreen,
  onToggleMute,
  seekAmount = 10,
}: VideoKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video || !enabled) return;

      // Don't handle if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Check if the video player or its container is focused/active
      const container = containerRef.current;
      if (!container?.contains(document.activeElement) && 
          document.activeElement !== document.body &&
          !container?.matches(":hover")) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        // Play/Pause
        case " ":
        case "k":
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;

        // Fullscreen
        case "f":
          e.preventDefault();
          onToggleFullscreen?.();
          break;

        // Mute
        case "m":
          e.preventDefault();
          onToggleMute?.();
          break;

        // Seek backward
        case "arrowleft":
        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - seekAmount);
          break;

        // Seek forward
        case "arrowright":
        case "l":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + seekAmount);
          break;

        // Volume up
        case "arrowup":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;

        // Volume down
        case "arrowdown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;

        // Go to start
        case "home":
          e.preventDefault();
          video.currentTime = 0;
          break;

        // Go to end
        case "end":
          e.preventDefault();
          video.currentTime = video.duration;
          break;

        // Frame back (when paused)
        case ",":
          if (video.paused) {
            e.preventDefault();
            video.currentTime = Math.max(0, video.currentTime - 1 / 30); // Assume 30fps
          }
          break;

        // Frame forward (when paused)
        case ".":
          if (video.paused) {
            e.preventDefault();
            video.currentTime = Math.min(video.duration, video.currentTime + 1 / 30);
          }
          break;

        // Number keys 0-9: seek to percentage
        default:
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            const percent = parseInt(e.key, 10) / 10;
            video.currentTime = video.duration * percent;
          }
          break;
      }
    },
    [videoRef, containerRef, enabled, onToggleFullscreen, onToggleMute, seekAmount]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Get a formatted list of keyboard shortcuts for help/tooltip
 */
export const KEYBOARD_SHORTCUTS = [
  { key: "Space / K", action: "Play / Pause" },
  { key: "F", action: "Toggle fullscreen" },
  { key: "M", action: "Mute / Unmute" },
  { key: "← / J", action: "Seek back 10s" },
  { key: "→ / L", action: "Seek forward 10s" },
  { key: "↑ / ↓", action: "Volume up / down" },
  { key: "0-9", action: "Seek to 0%-90%" },
  { key: "Home / End", action: "Go to start / end" },
  { key: ", / .", action: "Frame back / forward" },
] as const;
