import { motion } from "framer-motion";

import { useBookCover } from "../hooks/useBookCover";
import { formatFormat } from "../lib/format";
import type { Book } from "../lib/types";

type BookCardProps = {
  book: Book;
  onOpen: (bookId: string) => void;
  variant?: "portal" | "detail";
};

export function BookCard({ book, onOpen, variant = "detail" }: BookCardProps) {
  const cover = useBookCover(book);

  if (variant === "portal") {
    return (
      <motion.button
        className="portal-book-card"
        onClick={() => onOpen(book.id)}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        whileHover={{ y: -3 }}
        type="button"
      >
        <div
          className="portal-book-card__cover"
          style={
            cover
              ? { backgroundImage: `url(${cover})` }
              : { background: `linear-gradient(145deg, ${book.accentColor ?? "#3f80b0"}, #1d3040)` }
          }
        >
          <span className="portal-book-card__format">{formatFormat(book.format)}</span>
        </div>
        <div className="portal-book-card__meta">
          <strong>{book.title}</strong>
          <span>{book.author || "作者未知"}</span>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      className="library-book-card"
      onClick={() => onOpen(book.id)}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      whileHover={{ y: -3 }}
      type="button"
    >
      <div
        className="library-book-card__cover"
        style={
          cover
            ? { backgroundImage: `url(${cover})` }
            : { background: `linear-gradient(145deg, ${book.accentColor ?? "#3f80b0"}, #1d3040)` }
        }
      />
      <div className="library-book-card__body">
        <strong>{book.title}</strong>
        <span>{book.author || "作者未知"}</span>
        <p>{formatFormat(book.format)}</p>
      </div>
    </motion.button>
  );
}
