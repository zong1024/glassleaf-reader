import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookText, Clock3, Layers3, NotebookPen, Zap } from "lucide-react";
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
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.books.dashboard(token),
  });
  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: () => api.books.list(token),
  });

  const recentBooks = dashboardQuery.data?.recentBooks ?? [];
  const continueReading = recentBooks.find((book) => book.progress) ?? recentBooks[0];
  const continueCover = useBookCover(continueReading ?? {
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
  });

  return (
    <div className="page-stack">
      <section className="hero-banner">
        <div className="hero-banner__copy">
          <span className="section-title__eyebrow">Flow-first reading system</span>
          <h2>Resume instantly, glide through pages, and keep your notes in reach.</h2>
          <p>
            Glassleaf keeps the interface quiet so your library feels like an iOS reading room instead of a bulky
            dashboard.
          </p>
          <div className="hero-banner__actions">
            <button className="primary-button" onClick={() => navigate("/upload")} type="button">
              Upload a new book
            </button>
            <button className="ghost-button ghost-button--light" onClick={() => navigate("/library")} type="button">
              Browse library
            </button>
          </div>
        </div>

        <div className="continue-card glass-panel">
          <div className="continue-card__meta">
            <span>Continue reading</span>
            <ArrowRight size={16} />
          </div>
          {continueReading ? (
            <>
              <div
                className="continue-card__cover"
                style={
                  continueReading.coverUrl
                  && continueCover
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(6, 10, 18, 0.06), rgba(6, 10, 18, 0.42)), url(${continueCover})`,
                      }
                    : { background: `linear-gradient(135deg, ${continueReading.accentColor ?? "#b2c5ff"}, #f8f1e7)` }
                }
              />
              <div className="continue-card__body">
                <div>
                  <h3>{continueReading.title}</h3>
                  <p>{continueReading.author || "Unknown author"}</p>
                </div>
                <div className="continue-card__progress">
                  <strong>{formatPercent(continueReading.progress?.percent)}</strong>
                  <span>{continueReading.progress?.chapter || "Right where you stopped"}</span>
                </div>
                <button className="primary-button" onClick={() => navigate(`/reader/${continueReading.id}`)} type="button">
                  Jump back in
                </button>
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <p>Your continue-reading rail will live here as soon as you upload your first book.</p>
            </div>
          )}
        </div>
      </section>

      <section className="stats-grid">
        <article className="glass-panel stat-card">
          <Clock3 size={18} />
          <div>
            <strong>{dashboardQuery.data?.stats.readingCount ?? 0}</strong>
            <p>Currently reading</p>
          </div>
        </article>
        <article className="glass-panel stat-card">
          <Layers3 size={18} />
          <div>
            <strong>{dashboardQuery.data?.stats.queuedCount ?? 0}</strong>
            <p>Queued on your shelf</p>
          </div>
        </article>
        <article className="glass-panel stat-card">
          <NotebookPen size={18} />
          <div>
            <strong>{booksQuery.data?.books.reduce((sum, book) => sum + book.bookmarkCount, 0) ?? 0}</strong>
            <p>Bookmarks saved</p>
          </div>
        </article>
        <article className="glass-panel stat-card">
          <Zap size={18} />
          <div>
            <strong>{dashboardQuery.data?.stats.finishedCount ?? 0}</strong>
            <p>Finished titles</p>
          </div>
        </article>
      </section>

      <section className="page-section">
        <SectionTitle
          eyebrow="Recent activity"
          title="Momentum shelf"
          description="Recent titles surface your progress first, so returning always feels immediate."
        />
        {recentBooks.length ? (
          <div className="book-grid">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} onOpen={(id) => navigate(`/reader/${id}`)} />
            ))}
          </div>
        ) : (
          <div className="empty-panel empty-panel--wide">
            <BookText size={24} />
            <p>No books yet. Head to Upload and drop in an EPUB, PDF, TXT, or Markdown file.</p>
          </div>
        )}
      </section>
    </div>
  );
}
