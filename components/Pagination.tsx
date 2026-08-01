"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  const t = useTranslations("Common");

  if (pageCount <= 1) return null;

  return (
    <nav className="pagination" aria-label={`${t("page")} ${page} / ${pageCount}`}>
      <button
        type="button"
        className="pagination__button pagination__button--previous"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={t("previous")}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="pagination__button-label">{t("previous")}</span>
      </button>

      <span className="pagination__status" aria-live="polite">
        {t("page")} <strong>{page}</strong> / {pageCount}
      </span>

      <button
        type="button"
        className="pagination__button pagination__button--next"
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label={t("next")}
      >
        <span className="pagination__button-label">{t("next")}</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
