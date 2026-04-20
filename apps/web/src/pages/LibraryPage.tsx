import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid2x2, List, Search, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BookCard } from "../components/BookCard";
import { SectionTitle } from "../components/SectionTitle";
import { api } from "../lib/api";
import type { ReadingState } from "../lib/types";
import { useSession } from "../lib/session";

type ViewMode = "grid" | "list";
type SortMode = "recent" | "title" | "author";

export function LibraryPage() {
  const { token } = useSession();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReadingState | "ALL">("ALL");
  const [sort, setSort] = useState<SortMode>("recent");
  const deferredQuery = useDeferredValue(query);

  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: () => api.books.list(token),
  });

  const books = useMemo(() => {
    const source = booksQuery.data?.books ?? [];
    const filtered = source.filter((book) => {
      const matchesText =
        !deferredQuery ||
        `${book.title} ${book.author ?? ""}`.toLowerCase().includes(deferredQuery.toLowerCase());
      const matchesState = filter === "ALL" || book.readingState === filter;
      return matchesText && matchesState;
    });

    return filtered.toSorted((left, right) => {
      if (sort === "title") {
        return left.title.localeCompare(right.title);
      }

      if (sort === "author") {
        return (left.author ?? "").localeCompare(right.author ?? "");
      }

      return new Date(right.openedAt ?? right.uploadedAt).getTime() - new Date(left.openedAt ?? left.uploadedAt).getTime();
    });
  }, [booksQuery.data?.books, deferredQuery, filter, sort]);

  return (
    <div className="page-stack">
      <section className="page-section page-section--dense">
        <SectionTitle
          eyebrow="Full shelf control"
          title="Library"
          description="Search, sort, and reopen titles without breaking the calm flow of the reading surface."
        />

        <div className="library-toolbar glass-panel">
          <label className="search-field">
            <Search size={16} />
            <input
              onChange={(event) => {
                const nextValue = event.target.value;
                startTransition(() => setQuery(nextValue));
              }}
              placeholder="Search by title or author"
              value={query}
            />
          </label>

          <div className="segment-group" role="tablist" aria-label="Reading filter">
            {(["ALL", "QUEUED", "READING", "FINISHED"] as const).map((value) => (
              <button
                key={value}
                className={filter === value ? "is-active" : ""}
                onClick={() => setFilter(value)}
                type="button"
              >
                {value.toLowerCase()}
              </button>
            ))}
          </div>

          <div className="toolbar-actions">
            <label className="select-field">
              <SlidersHorizontal size={15} />
              <select onChange={(event) => setSort(event.target.value as SortMode)} value={sort}>
                <option value="recent">Most recent</option>
                <option value="title">Title</option>
                <option value="author">Author</option>
              </select>
            </label>
            <div className="toggle-group">
              <button className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} type="button">
                <Grid2x2 size={16} />
              </button>
              <button className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} type="button">
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={`book-grid ${view === "list" ? "book-grid--list" : ""}`}>
        {books.length ? (
          books.map((book) => <BookCard key={book.id} book={book} onOpen={(id) => navigate(`/reader/${id}`)} view={view} />)
        ) : (
          <div className="empty-panel empty-panel--wide">
            <p>No titles match the current search. Try changing the state filter or upload a new file.</p>
          </div>
        )}
      </section>
    </div>
  );
}
