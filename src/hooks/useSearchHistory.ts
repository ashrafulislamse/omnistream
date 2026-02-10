import { useState, useCallback } from "react";

export interface SearchHistoryEntry {
  url: string;
  timestamp: number;
  fileName?: string;
}

const STORAGE_KEY = "omnistream_search_history";
const MAX_ENTRIES = 20;

function loadHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadHistory);

  const addEntry = useCallback((url: string, fileName?: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.url !== url);
      const updated = [{ url, timestamp: Date.now(), fileName }, ...filtered].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  const removeEntry = useCallback((url: string) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.url !== url);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { history, addEntry, clearHistory, removeEntry };
}
