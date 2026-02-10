import { useMemo, useCallback } from "react";

interface FuzzySearchOptions {
  /** Minimum score threshold (0-1) for matches */
  threshold?: number;
  /** Keys to search on objects */
  keys?: string[];
  /** Whether search is case sensitive */
  caseSensitive?: boolean;
}

interface SearchResult<T> {
  item: T;
  score: number;
  matches: { key: string; indices: [number, number][] }[];
}

/**
 * Fuzzy matching algorithm using Levenshtein-inspired scoring
 * Matches even with typos and partial terms
 */
function fuzzyMatch(text: string, pattern: string, caseSensitive: boolean): { score: number; indices: [number, number][] } {
  const source = caseSensitive ? text : text.toLowerCase();
  const search = caseSensitive ? pattern : pattern.toLowerCase();
  
  if (!search) return { score: 1, indices: [] };
  if (!source) return { score: 0, indices: [] };
  
  // Exact match
  if (source === search) return { score: 1, indices: [[0, source.length - 1]] };
  
  // Contains match
  const containsIndex = source.indexOf(search);
  if (containsIndex !== -1) {
    return { 
      score: 0.9 + (search.length / source.length) * 0.1,
      indices: [[containsIndex, containsIndex + search.length - 1]]
    };
  }
  
  // Fuzzy match using subsequence matching
  let score = 0;
  let searchIdx = 0;
  let consecutiveMatches = 0;
  let totalMatches = 0;
  const indices: [number, number][] = [];
  let currentMatchStart = -1;
  
  for (let i = 0; i < source.length && searchIdx < search.length; i++) {
    if (source[i] === search[searchIdx]) {
      if (currentMatchStart === -1) currentMatchStart = i;
      searchIdx++;
      consecutiveMatches++;
      totalMatches++;
      
      // Bonus for word boundaries
      if (i === 0 || /\s|-|_|\./.test(source[i - 1])) {
        score += 0.1;
      }
    } else {
      if (currentMatchStart !== -1) {
        indices.push([currentMatchStart, i - 1]);
        currentMatchStart = -1;
      }
      consecutiveMatches = 0;
    }
  }
  
  // Close last match
  if (currentMatchStart !== -1) {
    indices.push([currentMatchStart, currentMatchStart + consecutiveMatches - 1]);
  }
  
  // Calculate final score
  if (searchIdx === search.length) {
    // All characters matched
    const matchRatio = search.length / source.length;
    const orderBonus = totalMatches / source.length;
    score = 0.3 + matchRatio * 0.4 + orderBonus * 0.2 + score;
    return { score: Math.min(score, 0.89), indices };
  }
  
  // Partial match
  const partialScore = (searchIdx / search.length) * 0.3;
  return { score: partialScore, indices };
}

/**
 * Hook for fuzzy searching through arrays with typo tolerance
 */
export function useFuzzySearch<T>(
  items: T[],
  options: FuzzySearchOptions = {}
) {
  const { threshold = 0.3, keys = [], caseSensitive = false } = options;
  
  const search = useCallback(
    (query: string): SearchResult<T>[] => {
      if (!query.trim()) {
        return items.map((item) => ({ item, score: 1, matches: [] }));
      }
      
      const results: SearchResult<T>[] = [];
      
      for (const item of items) {
        let bestScore = 0;
        const matches: { key: string; indices: [number, number][] }[] = [];
        
        if (keys.length === 0) {
          // Search on stringified item
          const text = typeof item === "string" ? item : JSON.stringify(item);
          const { score, indices } = fuzzyMatch(text, query, caseSensitive);
          bestScore = score;
          if (indices.length > 0) {
            matches.push({ key: "_value", indices });
          }
        } else {
          // Search on specified keys
          for (const key of keys) {
            const value = getNestedValue(item, key);
            if (typeof value === "string") {
              const { score, indices } = fuzzyMatch(value, query, caseSensitive);
              if (score > bestScore) {
                bestScore = score;
              }
              if (indices.length > 0) {
                matches.push({ key, indices });
              }
            }
          }
        }
        
        if (bestScore >= threshold) {
          results.push({ item, score: bestScore, matches });
        }
      }
      
      // Sort by score descending
      return results.sort((a, b) => b.score - a.score);
    },
    [items, keys, threshold, caseSensitive]
  );
  
  return { search };
}

/**
 * Get nested object value by dot-notation path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

/**
 * Advanced filters for file search
 */
export interface FileFilters {
  type?: "all" | "video" | "audio" | "document" | "other";
  sizeMin?: number; // bytes
  sizeMax?: number; // bytes
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Parse size string to bytes (e.g., "1.5 GB" -> 1610612736)
 */
export function parseSizeToBytes(sizeStr: string): number {
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || "B").toUpperCase();
  
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };
  
  return value * (multipliers[unit] || 1);
}

/**
 * Apply filters to a list of files
 */
export function applyFileFilters<T extends { type?: string; size_formatted?: string; _savedAt?: string }>(
  files: T[],
  filters: FileFilters
): T[] {
  return files.filter((file) => {
    // Type filter
    if (filters.type && filters.type !== "all" && file.type !== filters.type) {
      return false;
    }
    
    // Size filters
    if (filters.sizeMin !== undefined || filters.sizeMax !== undefined) {
      const bytes = file.size_formatted ? parseSizeToBytes(file.size_formatted) : 0;
      if (filters.sizeMin !== undefined && bytes < filters.sizeMin) return false;
      if (filters.sizeMax !== undefined && bytes > filters.sizeMax) return false;
    }
    
    // Date filters
    if (filters.dateFrom || filters.dateTo) {
      const savedAt = file._savedAt ? new Date(file._savedAt) : null;
      if (!savedAt) return false;
      if (filters.dateFrom && savedAt < filters.dateFrom) return false;
      if (filters.dateTo && savedAt > filters.dateTo) return false;
    }
    
    return true;
  });
}
