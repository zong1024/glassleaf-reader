import { motion } from "framer-motion";

import { absoluteAssetUrl } from "../lib/api";
import { formatFormat, formatPercent, formatRelativeDate } from "../lib/format";
import type { Book } from "../lib/types";

type BookCardProps = {
  book: Book;
  onOpen: (bookId: string) => void;
  view?: "grid" | "list";
};

export function BookCard({ book, onOpen, view = "grid" }: BookCardProps) {
  const cover = absoluteAssetUrl(book.coverUrl);
  const isList = view === "list";

  return (
    <motion.button
      className={`book-card book-card--${view}`}
      onClick={() => onOpen(book.id)}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      type="button"
    >
      <div
        className="book-card__cover"
        style={
          cover
            ? { backgroundImage: `linear-gradient(180deg, rgba(10, 12, 18, 0.08), rgba(10, 12, 18, 0.38)), url(${cover})` }
            : { background: `linear-gradient(135deg, ${book.accentColor ?? "#8ca4ff"}, #f4ece1)` }
        }
      >
        {!cover ? <span className="book-card__format">{formatFormat(book.format)}</span> : null}
      </div>
      <div className="book-card__body">
        <div className="book-card__meta">
          <span className="book-card__eyebrow">{book.readingState.toLowerCase()}</span>
          <span>{formatRelativeDate(book.openedAt ?? book.uploadedAt)}</span>
        </div>
        <div className="book-card__title-group">
          <h3>{book.title}</h3>
          <p>{book.author || "Unknown author"}</p>
        </div>
        <div className="book-card__footer">
          <div className="progress-pill">
            <span>{formatPercent(book.progress?.percent)}</span>
            <div className="progress-pill__track">
              <div className="progress-pill__fill" style={{ width: formatPercent(book.progress?.percent) }} />
            </div>
          </div>
          <div className={`book-card__stats ${isList ? "book-card__stats--spread" : ""}`}>
            <span>{book.bookmarkCount} bookmarks</span>
            <span>{book.annotationCount} notes</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
