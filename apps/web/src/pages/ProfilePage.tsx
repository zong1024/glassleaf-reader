import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, Cloud, NotebookTabs, Sparkles } from "lucide-react";

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
    <div className="portal-profile">
      <section className="portal-panel portal-profile__hero">
        <div className="portal-profile__identity">
          <div className="portal-profile__avatar">{displayName(user).slice(0, 2).toUpperCase()}</div>
          <div>
            <span className="portal-panel__eyebrow">账号</span>
            <h1>{displayName(user)}</h1>
            <p>{user.email}</p>
          </div>
        </div>

        <div className="portal-profile__sync">
          <Cloud size={18} />
          <div>
            <strong>书库已同步</strong>
            <span>最近活跃 {formatRelativeDate(metrics.lastSync)}</span>
          </div>
        </div>
      </section>

      <section className="portal-profile__stats">
        <article className="portal-panel portal-profile-stat">
          <Sparkles size={18} />
          <div>
            <strong>{metrics.total}</strong>
            <span>总图书数</span>
          </div>
        </article>
        <article className="portal-panel portal-profile-stat">
          <BookMarked size={18} />
          <div>
            <strong>{metrics.bookmarks}</strong>
            <span>累计书签</span>
          </div>
        </article>
        <article className="portal-panel portal-profile-stat">
          <NotebookTabs size={18} />
          <div>
            <strong>{metrics.notes}</strong>
            <span>累计笔记</span>
          </div>
        </article>
      </section>

      <section className="portal-profile__details">
        <article className="portal-panel portal-profile-card">
          <span className="portal-panel__eyebrow">阅读主题</span>
          <strong>Paper / Sepia / Night</strong>
          <p>阅读器里的配色仍然保留本地保存，切换速度快，也更稳定。</p>
        </article>
        <article className="portal-panel portal-profile-card">
          <span className="portal-panel__eyebrow">同步内容</span>
          <strong>进度、书签、批注</strong>
          <p>只要使用当前账号登录，阅读状态就会随着书库一起同步。</p>
        </article>
        <article className="portal-panel portal-profile-card">
          <span className="portal-panel__eyebrow">触屏交互</span>
          <strong>触摸与显式控件并存</strong>
          <p>手机端优先保证稳定可操作，不把关键动作只交给手势。</p>
        </article>
      </section>
    </div>
  );
}
