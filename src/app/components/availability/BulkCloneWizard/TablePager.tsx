import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Paging for the wizard's long tables: rows per page, current page, and the rows to show. */
export function usePaging<T>(items: T[], initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Removing rows can leave the page past the end; stay on the last one
  const currentPage = Math.min(page, pageCount);
  return {
    pageRows: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    pager: {
      page: currentPage,
      pageCount,
      pageSize,
      total: items.length,
      onPageChange: setPage,
      onPageSizeChange: (n: number) => {
        setPageSize(n);
        setPage(1);
      },
    },
  };
}

interface TablePagerProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/** Same footer as the Availability list: Rows per page, "Page 1 of 13 (124 items)", previous and next. */
export function TablePager({ page, pageCount, pageSize, total, onPageChange, onPageSizeChange }: TablePagerProps) {
  const arrow =
    'inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm text-neutral-800">
      <label className="flex items-center gap-2">
        Rows per page
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 rounded-md border border-neutral-300 bg-card px-2 text-sm"
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <span>{`Page ${page} of ${pageCount} (${total} items)`}</span>
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={arrow}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className={arrow}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
