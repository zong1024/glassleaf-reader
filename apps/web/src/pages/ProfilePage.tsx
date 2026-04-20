import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cloud, BookMarked, NotebookTabs, Sparkles } from "lucide-react";

import { SectionTitle } from "../components/SectionTitle";
import { formatRelativeDate } from "../lib/format";
import { displayName } from "../lib/storage";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

export function ProfilePage() {
  const { token, user } = useSession();
  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: () => api.books.list(token),
  });

  const metrics = useMemo(() => {
    const books = booksQuery.data?.books ?? [];
    return {
      total: books.length,
      bookmarks: books.reduce((sum, book) => sum + book.bookmarkCount, 0),
      notes: books.reduce((sum, book) => sum + book.annotationCount, 0),
      lastSync: books[0]?.openedAt ?? books[0]?.uploadedAt ?? new Date().toISOString(),
    };
  }, [booksQuery.data?.books]);

  return (
    <div className="page-stack">
      <section className="profile-hero glass-panel">
        <div className="profile-hero__identity">
          <div className="profile-hero__avatar">{displayName(user).slice(0, 2).toUpperCase()}</div>
          <div>
            <span className="section-title__eyebrow">Account</span>
            <h2>{displayName(user)}</h2>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="profile-hero__status">
          <div>
            <strong>Synced library</strong>
            <p>Last active {formatRelativeDate(metrics.lastSync)}</p>
          </div>
          <Cloud size={18} />
        </div>
      </section>

      <section className="stats-grid">
        <article className="glass-panel stat-card">
          <Sparkles size={18} />
          <div>
            <strong>{metrics.total}</strong>
            <p>Total books</p>
          </div>
        </article>
        <article className="glass-panel stat-card">
          <BookMarked size={18} />
          <div>
            <strong>{metrics.bookmarks}</strong>
            <p>Bookmarks saved</p>
          </div>
        </article>
        <article className="glass-panel stat-card">
          <NotebookTabs size={18} />
          <div>
            <strong>{metrics.notes}</strong>
            <p>Annotations written</p>
          </div>
        </article>
      </section>

      <section className="page-section">
        <SectionTitle
          eyebrow="Preferences"
          title="Reading defaults"
          description="Reader appearance is saved locally for now, which keeps mobile and desktop interactions snappy."
        />
        <div className="detail-grid">
          <article className="glass-panel detail-card">
            <strong>Visual style</strong>
            <p>Paper, sepia, and night themes inside the reader workspace.</p>
          </article>
          <article className="glass-panel detail-card">
            <strong>Sync model</strong>
            <p>Progress, bookmarks, notes, and recently opened titles travel with your account.</p>
          </article>
          <article className="glass-panel detail-card">
            <strong>Touch behavior</strong>
            <p>All gesture actions also have explicit controls, so the reader remains dependable on every device.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
