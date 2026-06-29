import { useEffect, useMemo, useState } from 'react';
import { TABLE_PAGE_SIZE } from '../constants';

export function usePagination(items, pageSize = TABLE_PAGE_SIZE, resetKey) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey, items?.length]);

  const totalCount = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pageItems = useMemo(() => {
    if (!items?.length) return [];
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const showPagination = totalCount > pageSize;

  return {
    page: safePage,
    setPage,
    pageItems,
    totalPages,
    totalCount,
    showPagination,
    pageSize,
  };
}
