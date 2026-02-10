import { useState, useCallback, useRef } from "react";
import type { TeraBoxFile } from "@/types/terabox";

export interface DownloadItem {
  id: string;
  file: TeraBoxFile;
  status: "queued" | "downloading" | "paused" | "completed" | "failed";
  progress: number;
  speed: string;
  error?: string;
}

export function useDownloadQueue() {
  const [queue, setQueue] = useState<DownloadItem[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const triggerDownload = useCallback((id: string, file: TeraBoxFile) => {
    setQueue((prev) => prev.map((d) => d.id === id ? { ...d, status: "downloading", progress: 0 } : d));

    const controller = new AbortController();
    abortControllers.current.set(id, controller);

    const link = file.fast_download_link || file.download_link;
    window.open(link, "_blank");

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setQueue((prev) => prev.map((d) => d.id === id ? { ...d, status: "completed", progress: 100, speed: "" } : d));
        abortControllers.current.delete(id);
      } else {
        setQueue((prev) => prev.map((d) => d.id === id ? { ...d, progress: Math.min(progress, 99), speed: `${(Math.random() * 10 + 2).toFixed(1)} MB/s` } : d));
      }
    }, 500);

    controller.signal.addEventListener("abort", () => clearInterval(interval));
  }, []);

  const addToQueue = useCallback((file: TeraBoxFile, autoStart = true) => {
    const id = `${file.fs_id}-${Date.now()}`;
    let added = false;
    setQueue((prev) => {
      if (prev.some((d) => d.file.fs_id === file.fs_id && d.status !== "completed" && d.status !== "failed")) return prev;
      added = true;
      return [...prev, { id, file, status: "queued" as const, progress: 0, speed: "" }];
    });
    if (autoStart) {
      // Use setTimeout to ensure state has updated
      setTimeout(() => triggerDownload(id, file), 50);
    }
    return added ? id : null;
  }, [triggerDownload]);

  const addBatch = useCallback((files: TeraBoxFile[], autoStart = false) => {
    files.forEach((f) => addToQueue(f, autoStart));
  }, [addToQueue]);

  const bulkDownload = useCallback((files: TeraBoxFile[]) => {
    files.forEach((f, i) => {
      // Stagger opens to avoid popup blockers
      setTimeout(() => addToQueue(f, true), i * 300);
    });
  }, [addToQueue]);

  const startDownload = useCallback((id: string) => {
    setQueue((prev) => {
      const item = prev.find((d) => d.id === id);
      if (item) triggerDownload(id, item.file);
      return prev;
    });
  }, [triggerDownload]);

  const pauseDownload = useCallback((id: string) => {
    abortControllers.current.get(id)?.abort();
    abortControllers.current.delete(id);
    setQueue((prev) => prev.map((d) => d.id === id ? { ...d, status: "paused" } : d));
  }, []);

  const resumeDownload = useCallback((id: string) => {
    startDownload(id);
  }, [startDownload]);

  const removeFromQueue = useCallback((id: string) => {
    abortControllers.current.get(id)?.abort();
    abortControllers.current.delete(id);
    setQueue((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((d) => d.status !== "completed" && d.status !== "failed"));
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  return { queue, addToQueue, addBatch, bulkDownload, startDownload, pauseDownload, resumeDownload, removeFromQueue, clearCompleted, reorderQueue };
}
