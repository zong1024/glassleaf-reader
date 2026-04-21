import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookText, Clock3, Layers3, NotebookPen, Search, ShieldCheck, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BookCard } from "../components/BookCard";
import { SectionTitle } from "../components/SectionTitle";
import { useBookCover } from "../hooks/useBookCover";
import { api } from "../lib/api";
import { formatPercent } from "../lib/format";
import { useSession } from "../lib/session";

export function HomePage() {
  const { token } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.books.dashboard(token),
  });
  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: () => api.books.list(token),
  });

  const recentBooks = dashboardQuery.data?.recentBooks ?? [];
  const books = booksQuery.data?.books ?? [];
  const continueReading = recentBooks.find((book) => book.progress) ?? recentBooks[0];
  const shelfPreview = useMemo(() => {
    if (deferredQuery) {
      return books.filter((book) =>
        `${book.title} ${book.author ?? ""}`.toLowerCase().includes(deferredQuery.toLowerCase()),
      );
    }

    return recentBooks.length ? recentBooks : books;
  }, [books, deferredQuery, recentBooks]);
  const featuredBooks = shelfPreview.slice(0, 10);
  const subjectLinks = ["文学小说", "计算机", "历史传记", "心理学", "商业经济", "设计艺术"];
  const formatStats = [
    { label: "EPUB", value: books.filter((book) => book.format === "EPUB").length },
    { label: "PDF", value: books.filter((book) => book.format === "PDF").length },
    { label: "TXT", value: books.filter((book) => book.format === "TXT").length },
    { label: "MD", value: books.filter((book) => book.format === "MD").length },
  ];
  const continueCover = useBookCover(
    continueReading ?? {
      id: "",
      title: "",
      format: "EPUB",
      readingState: "QUEUED",
      uploadedAt: "",
      fileSize: 0,
      toc: [],
      bookmarkCount: 0,
      annotationCount: 0,
      progress: null,
    },
  );

  return (
    <div className="catalog-page">
      <section className="catalog-hero">
        <div className="catalog-hero__copy">
          <span className="section-title__eyebrow">个人电子书入口</span>
          <h1>像图书索引一样搜索你的整座书库。</h1>
          <p>
            首页不再是单纯的阅读器面板，而是更像大型电子书站点的检索首页。上传、检索、继续阅读，都集中在这一块高密度入口里。
          </p>
          <form
            className="catalog-search-panel"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/library?query=${encodeURIComponent(query.trim())}`);
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
                搜索图书
              </button>
              <button className="catalog-action" onClick={() => navigate("/upload")} type="button">
                上传文件
              </button>
            </div>
          </form>
          <div className="catalog-subject-links">
            {subjectLinks.map((subject) => (
              <button
                className="catalog-subject-links__item"
                key={subject}
                onClick={() => navigate(`/library?query=${encodeURIComponent(subject)}`)}
                type="button"
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        <aside className="catalog-hero__aside">
          <div className="catalog-highlight-card">
            <div className="catalog-highlight-card__head">
              <span>继续阅读</span>
              <ShieldCheck size={16} />
            </div>
            {continueReading ? (
              <>
                <div
                  className="catalog-highlight-card__cover"
                  style={
                    continueReading.coverUrl && continueCover
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(6, 10, 18, 0.06), rgba(6, 10, 18, 0.42)), url(${continueCover})`,
                        }
                      : { background: `linear-gradient(135deg, ${continueReading.accentColor ?? "#3c7fc5"}, #0b2740)` }
                  }
                />
                <div className="catalog-highlight-card__body">
                  <strong>{continueReading.title}</strong>
                  <p>{continueReading.author || "作者未知"}</p>
                  <div className="catalog-highlight-card__progress">
                    <strong>{formatPercent(continueReading.progress?.percent)}</strong>
                    <span>{continueReading.progress?.chapter || "从上次离开的地方继续"}</span>
                  </div>
                  <button
                    className="catalog-action catalog-action--primary"
                    onClick={() => navigate(`/reader/${continueReading.id}`)}
                    type="button"
                  >
                    打开阅读器
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-panel">
                <p>上传第一本书之后，这里会显示你下一本要读的内容。</p>
              </div>
            )}
          </div>
          <div className="catalog-format-strip">
            {formatStats.map((item) => (
              <div className="catalog-format-strip__item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="catalog-stat-row">
        <article className="catalog-stat">
          <Clock3 size={18} />
          <div>
            <strong>{dashboardQuery.data?.stats.readingCount ?? 0}</strong>
            <p>正在阅读</p>
          </div>
        </article>
        <article className="catalog-stat">
          <Layers3 size={18} />
          <div>
            <strong>{dashboardQuery.data?.stats.queuedCount ?? 0}</strong>
            <p>书架待读</p>
          </div>
        </article>
        <article className="catalog-stat">
          <NotebookPen size={18} />
          <div>
            <strong>{books.reduce((sum, book) => sum + book.bookmarkCount, 0)}</strong>
            <p>累计书签</p>
          </div>
        </article>
        <article className="catalog-stat">
          <Zap size={18} />
          <div>
            <strong>{dashboardQuery.data?.stats.finishedCount ?? 0}</strong>
            <p>已读完成</p>
          </div>
        </article>
      </section>

      <section className="page-section">
        <SectionTitle
          eyebrow="推荐书架"
          title={deferredQuery ? "搜索预览" : "最近加入"}
          description={
            deferredQuery
              ? "你输入时结果会立即收窄，让首页本身就具备真实可用的检索反馈。"
              : "更接近大型电子书目录站的高密度书格布局，但数据完全属于你自己的账号。"
          }
        />
        {featuredBooks.length ? (
          <div className="catalog-book-grid">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} onOpen={(id) => navigate(`/reader/${id}`)} />
            ))}
          </div>
        ) : (
          <div className="empty-panel empty-panel--wide">
            <BookText size={24} />
            <p>书库还是空的。上传 EPUB、PDF、TXT 或 Markdown 后，这里就会自动填满。</p>
          </div>
        )}
      </section>

      <section className="catalog-two-column">
        <div className="page-section">
          <SectionTitle
            eyebrow="分类入口"
            title="像资料库一样浏览"
            description="快捷入口保留大型书站那种直接、高密度、偏检索导向的使用感觉。"
          />
          <div className="catalog-link-panel">
            {subjectLinks.map((subject) => (
              <button
                className="catalog-link-panel__item"
                key={subject}
                onClick={() => navigate(`/library?query=${encodeURIComponent(subject)}`)}
                type="button"
              >
                <span>{subject}</span>
                <span>进入搜索</span>
              </button>
            ))}
          </div>
        </div>

        <div className="page-section">
          <SectionTitle
            eyebrow="书架动态"
            title="最近活跃"
            description="右侧维持操作信息密度，随时看到最近打开、阅读进度和账号侧同步状态。"
          />
          <div className="catalog-mini-feed">
            {books.slice(0, 6).map((book) => (
              <button className="catalog-mini-feed__item" key={book.id} onClick={() => navigate(`/reader/${book.id}`)} type="button">
                <div>
                  <strong>{book.title}</strong>
                  <p>{book.author || "作者未知"}</p>
                </div>
                <span>{formatPercent(book.progress?.percent)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
