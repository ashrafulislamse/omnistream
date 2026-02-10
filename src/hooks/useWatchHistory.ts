import { useCallback } from "react";

export interface WatchEntry {
  fileId: number;
  fileName: string;
  thumbnail?: string;
  position: number;
  duration: number;
  updatedAt: number;
  sourceUrl?: string;
  /** Tracks if this was a playlist skip (shorter resume threshold) */
  wasSkipped?: boolean;
}

const STORAGE_KEY = "omnistream_watch_history";
const MAX_ENTRIES = 50;

// Resume thresholds
const NORMAL_RESUME_THRESHOLD = 5; // seconds - normal resume prompt threshold
const SKIP_RESUME_THRESHOLD = 2; // seconds - lower threshold for skipped videos
const COMPLETION_THRESHOLD = 0.95; // 95% - consider video "finished"

function loadAll(): WatchEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAll(entries: WatchEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function useWatchHistory() {
  const getEntry = useCallback((fileId: number): WatchEntry | null => {
    return loadAll().find((e) => e.fileId === fileId) ?? null;
  }, []);

  /**
   * Save playback position with smart threshold handling
   * @param wasSkipped - true if user skipped away from this video (uses lower threshold)
   */
  const savePosition = useCallback(
    (
      fileId: number,
      fileName: string,
      position: number,
      duration: number,
      thumbnail?: string,
      sourceUrl?: string,
      wasSkipped?: boolean
    ) => {
      // Use lower threshold for skipped videos
      const threshold = wasSkipped ? SKIP_RESUME_THRESHOLD : NORMAL_RESUME_THRESHOLD;
      
      // Don't save if position is below threshold
      if (position < threshold) return;
      
      // Don't save if video is nearly complete (will auto-clear on next play)
      if (duration > 0 && position / duration > COMPLETION_THRESHOLD) return;

      const entries = loadAll();
      const existing = entries.find((e) => e.fileId === fileId);
      const filtered = entries.filter((e) => e.fileId !== fileId);
      
      filtered.unshift({
        fileId,
        fileName,
        thumbnail,
        position,
        duration,
        updatedAt: Date.now(),
        sourceUrl: sourceUrl || existing?.sourceUrl,
        wasSkipped: wasSkipped ?? existing?.wasSkipped,
      });
      saveAll(filtered);
    },
    []
  );

  /**
   * Check if a video should auto-resume (was previously skipped)
   * Returns the position to resume from, or null if no auto-resume
   */
  const getAutoResumePosition = useCallback((fileId: number): number | null => {
    const entry = getEntry(fileId);
    if (!entry) return null;
    
    // Auto-resume if video was skipped and position is meaningful
    if (entry.wasSkipped && entry.position >= SKIP_RESUME_THRESHOLD) {
      return entry.position;
    }
    
    return null;
  }, [getEntry]);

  /**
   * Mark a video as skipped (saves current position with skip flag)
   */
  const markAsSkipped = useCallback(
    (fileId: number, fileName: string, position: number, duration: number, thumbnail?: string, sourceUrl?: string) => {
      savePosition(fileId, fileName, position, duration, thumbnail, sourceUrl, true);
    },
    [savePosition]
  );

  /**
   * Clear the skip flag after successful resume
   */
  const clearSkipFlag = useCallback((fileId: number) => {
    const entries = loadAll();
    const entry = entries.find((e) => e.fileId === fileId);
    if (entry && entry.wasSkipped) {
      entry.wasSkipped = false;
      saveAll(entries);
    }
  }, []);

  const clearEntry = useCallback((fileId: number) => {
    saveAll(loadAll().filter((e) => e.fileId !== fileId));
  }, []);

  const getAll = useCallback(() => loadAll(), []);

  /**
   * Clear all watch history entries
   */
  const clearAll = useCallback(() => {
    saveAll([]);
  }, []);

  return {
    getEntry,
    savePosition,
    clearEntry,
    getAll,
    getAutoResumePosition,
    markAsSkipped,
    clearSkipFlag,
    clearAll,
  };
}
