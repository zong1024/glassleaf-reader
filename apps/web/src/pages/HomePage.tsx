import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BookCard } from "../components/BookCard";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

const subjectLinks = ["文学小说", "计算机", "历史传记", "心理学", "商业经济", "设计艺术"];

export function HomePage() {
  const { token } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"general" | "fulltext">("general");
  const deferredQuery = useDeferredValue(query);
  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: () => api.books.list(token),
  });

  const books = booksQuery.data?.books ?? [];
  const featuredBooks = useMemo(() => {
    const source = deferredQuery
      ? books.filter((book) =>
          `${book.title} ${book.author ?? ""}`.toLowerCase().includes(deferredQuery.toLowerCase()),
        )
      : books;

    return source.slice(0, 15);
  }, [books, deferredQuery]);

  return (
    <div className="portal-home">
      <section className="portal-home__hero">
        <div className="portal-logo" aria-label="Glassleaf">
          <span className="portal-logo__accent">Glass</span>
          <span className="portal-logo__main">leaf</span>
        </div>
        <p className="portal-home__tagline">您通往知识与文化的入口，个人私有书库专用。</p>
        <div className="portal-home__notice">只搜索你自己的账号书库，不连接外部公开站点。</div>

        <form
          className="portal-searchbox"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(`/library?query=${encodeURIComponent(query.trim())}`);
          }}
        >
          <div className="portal-searchbox__tabs" role="tablist" aria-label="Search mode">
            <button
              className={searchMode === "general" ? "is-active" : ""}
              onClick={() => setSearchMode("general")}
              type="button"
            >
              通用搜索
            </button>
            <button
              className={searchMode === "fulltext" ? "is-active" : ""}
              onClick={() => setSearchMode("fulltext")}
              type="button"
            >
              全文搜索
            </button>
          </div>

          <div className="portal-searchbox__row">
            <label className="portal-searchbox__field">
              <Search size={16} />
              <input
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => setQuery(nextValue));
                }}
                placeholder={
                  searchMode === "general"
                    ? "书名、作者、ISBN、出版社、关键词"
                    : "搜索书籍正文中的内容"
                }
                value={query}
              />
            </label>
            <button className="portal-searchbox__submit" type="submit">
              搜索
            </button>
          </div>

          <button className="portal-searchbox__meta" onClick={() => navigate("/library")} type="button">
            搜索设置
          </button>
        </form>

        <div className="portal-quick-tags">
          {subjectLinks.map((subject) => (
            <button
              className="portal-quick-tags__item"
              key={subject}
              onClick={() => navigate(`/library?query=${encodeURIComponent(subject)}`)}
              type="button"
            >
              {subject}
            </button>
          ))}
        </div>
      </section>

      <section className="portal-shelf">
        <div className="portal-shelf__head">
          <h2>{deferredQuery ? "搜索结果" : "最受欢迎"}</h2>
          <span>{deferredQuery ? `匹配“${deferredQuery}”` : "在你的私有书架中"}</span>
        </div>

        {featuredBooks.length ? (
          <div className="portal-book-grid">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} onOpen={(id) => navigate(`/reader/${id}`)} variant="portal" />
            ))}
          </div>
        ) : (
          <div className="portal-empty">
            <BookOpenText size={20} />
            <p>还没有可展示的图书。先上传一本 EPUB、PDF、TXT 或 Markdown。</p>
          </div>
        )}
      </section>
    </div>
  );
}
