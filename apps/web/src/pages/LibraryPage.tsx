import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { BookCard } from "../components/BookCard";
import { api } from "../lib/api";
import type { ReadingState } from "../lib/types";
import { useSession } from "../lib/session";

type SortMode = "recent" | "title" | "author";

export function LibraryPage() {
  const { token } = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  return (
    <div className="portal-library">
      <section className="portal-library__hero">
        <h1>搜索书库</h1>
        <p>这一页保留参考站点那种深色检索气质，但搜索结果只来自你自己的账号书架。</p>

        <form
          className="portal-searchbox portal-searchbox--library"
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
          <div className="portal-searchbox__row">
            <label className="portal-searchbox__field">
              <Search size={16} />
              <input
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => setQuery(nextValue));
                }}
                placeholder="书名、作者、ISBN、出版社、关键词"
                value={query}
              />
            </label>
            <button className="portal-searchbox__submit" type="submit">
              搜索
            </button>
          </div>
        </form>

        <div className="portal-library__toolbar">
          <div className="portal-filter-row" role="tablist" aria-label="Reading filter">
            {(["ALL", "QUEUED", "READING", "FINISHED"] as const).map((value) => (
              <button
                key={value}
                className={`portal-filter-chip ${filter === value ? "is-active" : ""}`}
                onClick={() => setFilter(value)}
                type="button"
              >
                {value === "ALL" ? "全部" : value === "QUEUED" ? "待读" : value === "READING" ? "阅读中" : "已完成"}
              </button>
            ))}
          </div>

          <label className="portal-sort">
            <span>排序</span>
            <select onChange={(event) => setSort(event.target.value as SortMode)} value={sort}>
              <option value="recent">最近打开</option>
              <option value="title">书名</option>
              <option value="author">作者</option>
            </select>
          </label>
        </div>
      </section>

      <section className="portal-shelf">
        <div className="portal-shelf__head">
          <h2>{books.length} 条结果</h2>
          <span>{deferredQuery ? `匹配“${deferredQuery}”` : "显示你的全部书架"}</span>
        </div>

        {books.length ? (
          <div className="portal-book-grid portal-book-grid--library">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onOpen={(id) => navigate(`/reader/${id}`)} variant="portal" />
            ))}
          </div>
        ) : (
          <div className="portal-empty">
            <p>没有符合当前条件的图书，可以换个关键词或重新上传文件。</p>
          </div>
        )}
      </section>
    </div>
  );
}
