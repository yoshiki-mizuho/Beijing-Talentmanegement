import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";

export type PaginationItem = number | "ellipsis";

export function getPaginationItems(pageCount: number, page: number): PaginationItem[] {
  if (pageCount < 8) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const visible = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...visible].filter((item) => item >= 1 && item <= pageCount).sort((a, b) => a - b);
  return pages.flatMap((item, index) =>
    index > 0 && item - pages[index - 1] > 1 ? ["ellipsis" as const, item] : [item]
  );
}

export function Pagination({
  total,
  page,
  pageSize,
  onPage,
  href
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage?: (page: number) => void;
  href?: (page: number) => string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const items = getPaginationItems(pageCount, currentPage);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--muted-foreground)]">
        {total}件中 {start}〜{end}件
      </p>
      <div className="flex items-center gap-1">
        <PageControl
          page={currentPage - 1}
          label="前のページ"
          disabled={currentPage === 1}
          onPage={onPage}
          href={href}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </PageControl>
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-2" aria-hidden="true">
              …
            </span>
          ) : (
            <PageControl
              key={item}
              page={item}
              current={item === currentPage}
              onPage={onPage}
              href={href}
            >
              {item}
            </PageControl>
          )
        )}
        <PageControl
          page={currentPage + 1}
          label="次のページ"
          disabled={currentPage === pageCount}
          onPage={onPage}
          href={href}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PageControl>
      </div>
    </div>
  );
}

function PageControl({
  page,
  current = false,
  label,
  disabled = false,
  onPage,
  href,
  children
}: {
  page: number;
  current?: boolean;
  label?: string;
  disabled?: boolean;
  onPage?: (page: number) => void;
  href?: (page: number) => string;
  children: ReactNode;
}) {
  const className = cn(
    "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-medium",
    current
      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]"
  );

  if (href) {
    if (disabled) {
      return (
        <span aria-label={label} aria-disabled="true" className={cn(className, "opacity-50")}>
          {children}
        </span>
      );
    }
    return (
      <Link
        href={href(page) as Route}
        aria-label={label}
        aria-current={current ? "page" : undefined}
        className={className}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      className={cn(className, "disabled:cursor-not-allowed disabled:opacity-50")}
      onClick={() => onPage?.(page)}
    >
      {children}
    </button>
  );
}
