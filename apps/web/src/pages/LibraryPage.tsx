import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid2x2, List, Search, SlidersHorizontal } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState(() => searchParams.get("query") ?? "");
  const [filter, setFilter] = useState<ReadingState | "ALL">("ALL");
  const [sort, setSort] = useState<SortMode>("recent");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(searchParams.get("query") ?? "");
  }, [searchParams]);

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

  const formatCounts = useMemo(() => {
    const source = booksQuery.data?.books ?? [];
    return [
      { label: "EPUB", value: source.filter((book) => book.format === "EPUB").length },
      { label: "PDF", value: source.filter((book) => book.format === "PDF").length },
      { label: "TXT", value: source.filter((book) => book.format === "TXT").length },
      { label: "MD", value: source.filter((book) => book.format === "MD").length },
    ];
  }, [booksQuery.data?.books]);

  return (
    <div className="catalog-page">
      <section className="catalog-library-hero">
        <SectionTitle
          eyebrow="可检索目录"
          title="书库总览"
          description="结果页改成更像大型电子书目录站的检索版式，但数据来源仍然是你自己的上传书架。"
        />

        <div className="catalog-library-toolbar">
          <form
            className="catalog-search-panel"
            onSubmit={(event) => {
              event.preventDefault();
              const next = new URLSearchParams(searchParams);
              if (query.trim()) {
                next.set("query", query.trim());
              } else {
                next.delete("query");
              }
              setSearchParams(next);
            }}
          >
            <label className="catalog-search-field">
              <Search size={18} />
              <input
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => setQuery(nextValue));
                }}
                placeholder="搜索书名、作者或关键词"
                value={query}
              />
            </label>
            <div className="catalog-search-panel__actions">
              <button className="catalog-action catalog-action--primary" type="submit">
                搜索
              </button>
              <button className="catalog-action" onClick={() => navigate("/upload")} type="button">
                上传
              </button>
            </div>
          </form>

          <div className="catalog-filter-row" role="tablist" aria-label="Reading filter">
            {(["ALL", "QUEUED", "READING", "FINISHED"] as const).map((value) => (
              <button
                key={value}
                className={`catalog-filter-chip ${filter === value ? "is-active" : ""}`}
                onClick={() => setFilter(value)}
                type="button"
              >
                {value === "ALL"
                  ? "全部"
                  : value === "QUEUED"
                    ? "待读"
                    : value === "READING"
                      ? "阅读中"
                      : "已完成"}
              </button>
            ))}
          </div>

          <div className="catalog-library-toolbar__bottom">
            <div className="catalog-format-strip">
              {formatCounts.map((item) => (
                <div className="catalog-format-strip__item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="catalog-library-toolbar__controls">
              <label className="select-field">
                <SlidersHorizontal size={15} />
                <select onChange={(event) => setSort(event.target.value as SortMode)} value={sort}>
                  <option value="recent">最近打开</option>
                  <option value="title">书名</option>
                  <option value="author">作者</option>
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
        </div>
      </section>

      <section className="catalog-results-header">
        <strong>{books.length} 条结果</strong>
        <span>
          {deferredQuery ? `匹配 “${deferredQuery}”` : "当前显示你的完整上传书架"}
        </span>
      </section>

      <section className={`catalog-book-grid ${view === "list" ? "catalog-book-grid--list" : ""}`}>
        {books.length ? (
          books.map((book) => <BookCard key={book.id} book={book} onOpen={(id) => navigate(`/reader/${id}`)} view={view} />)
        ) : (
          <div className="empty-panel empty-panel--wide">
            <p>没有符合当前条件的图书。可以换个关键词、切换状态筛选，或重新上传新文件。</p>
          </div>
        )}
      </section>
    </div>
  );
}
