import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { useBookCover } from "../hooks/useBookCover";
import { formatFormat, formatPercent, formatRelativeDate } from "../lib/format";
import type { Book } from "../lib/types";

type BookCardProps = {
  book: Book;
  onOpen: (bookId: string) => void;
  view?: "grid" | "list";
};

export function BookCard({ book, onOpen, view = "grid" }: BookCardProps) {
  const cover = useBookCover(book);
  const isList = view === "list";
  const progressWidth = `${Math.max(4, Math.round((book.progress?.percent ?? 0) * 100))}%`;
  const readingStateLabel =
    book.readingState === "QUEUED" ? "待读" : book.readingState === "READING" ? "阅读中" : "已完成";

  return (
    <motion.button
      className={`catalog-book-card catalog-book-card--${view}`}
      onClick={() => onOpen(book.id)}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 250, damping: 26 }}
      type="button"
    >
      <div
        className="catalog-book-card__cover"
        style={
          cover
            ? { backgroundImage: `linear-gradient(180deg, rgba(8, 16, 29, 0.02), rgba(8, 16, 29, 0.3)), url(${cover})` }
            : { background: `linear-gradient(145deg, ${book.accentColor ?? "#4d8ccf"}, #0f2e47)` }
        }
      >
        <span className="catalog-book-card__format">{formatFormat(book.format)}</span>
        <span className="catalog-book-card__open">
          <ArrowUpRight size={15} />
        </span>
      </div>
        <div className="catalog-book-card__body">
          <div className="catalog-book-card__meta">
            <span className="catalog-book-card__eyebrow">{readingStateLabel}</span>
            <span>{formatRelativeDate(book.openedAt ?? book.uploadedAt)}</span>
          </div>
          <div className="catalog-book-card__title-group">
            <h3>{book.title}</h3>
            <p>{book.author || "作者未知"}</p>
          </div>
          <div className="catalog-book-card__footer">
            <div className="catalog-book-card__progress">
              <span>已读 {formatPercent(book.progress?.percent)}</span>
              <div className="catalog-book-card__progress-track">
                <div className="catalog-book-card__progress-fill" style={{ width: progressWidth }} />
              </div>
            </div>
            <div className={`catalog-book-card__stats ${isList ? "catalog-book-card__stats--spread" : ""}`}>
              <span>{book.bookmarkCount} 个书签</span>
              <span>{book.annotationCount} 条笔记</span>
            </div>
          </div>
        </div>
    </motion.button>
  );
}
