import { useMemo, useState, useCallback } from "react";

interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { pageSize = 12 } = options;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 if items shrink below current page
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(safePage + 1), [safePage, goToPage]);
  const prevPage = useCallback(() => goToPage(safePage - 1), [safePage, goToPage]);

  return {
    page: safePage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    startIndex: (safePage - 1) * pageSize,
    endIndex: Math.min(safePage * pageSize, items.length),
    totalItems: items.length,
  };
}
