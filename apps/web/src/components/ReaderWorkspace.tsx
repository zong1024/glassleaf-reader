import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  MoonStar,
  NotebookPen,
  Plus,
  Settings2,
  SunMedium,
  Trash2,
} from "lucide-react";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { formatPercent } from "../lib/format";
import { getReaderPreferences, setReaderPreferences } from "../lib/storage";
import type {
  Annotation,
  Book,
  Bookmark,
  ReaderLocation,
  ReaderPreferences,
  ReaderSurfaceHandle,
} from "../lib/types";

const EpubSurface = lazy(() => import("./readers/EpubSurface"));
const PdfSurface = lazy(() => import("./readers/PdfSurface"));
const TextSurface = lazy(() => import("./readers/TextSurface"));

type ReaderWorkspaceProps = {
  book: Book;
  fileUrl: string;
  fileBuffer?: ArrayBuffer | null;
  initialLocation?: string | null;
  bookmarks: Bookmark[];
  annotations: Annotation[];
  onBack: () => void;
  onAddBookmark: (payload: {
    location: string;
    label: string;
    chapter?: string;
    progress?: number;
    page?: number | null;
    locatorType?: string;
  }) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onAddAnnotation: (payload: {
    location: string;
    locatorType?: string;
    quote?: string;
    note?: string;
    color?: string;
    tone?: "HIGHLIGHT" | "NOTE";
  }) => void;
  onRemoveAnnotation: (annotationId: string) => void;
  onSaveProgress: (payload: {
    location: string;
    locatorType?: string;
    percent: number;
    chapter?: string;
    page?: number | null;
    readingState?: Book["readingState"];
  }) => void;
};

type DrawerKey = "contents" | "bookmarks" | "notes" | "settings" | null;

export function ReaderWorkspace({
  book,
  fileUrl,
  fileBuffer,
  initialLocation,
  bookmarks,
  annotations,
  onBack,
  onAddBookmark,
  onRemoveBookmark,
  onAddAnnotation,
  onRemoveAnnotation,
  onSaveProgress,
}: ReaderWorkspaceProps) {
  const readerRef = useRef<ReaderSurfaceHandle | null>(null);
  const isCompact = useMediaQuery("(max-width: 1100px)");
  const [chromeVisible, setChromeVisible] = useState(true);
  const [drawer, setDrawer] = useState<DrawerKey>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [preferences, setPreferences] = useState<ReaderPreferences>(() => getReaderPreferences());
  const [currentLocation, setCurrentLocation] = useState<ReaderLocation>({
    location: initialLocation || "0",
    locatorType: book.format === "EPUB" ? "epub-cfi" : book.format === "PDF" ? "pdf-page" : "text-scroll",
    percent: book.progress?.percent ?? 0,
    chapter: book.progress?.chapter ?? undefined,
    page: book.progress?.page ?? undefined,
  });

  useEffect(() => {
    setReaderPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!isCompact && drawer === null) {
      setDrawer("contents");
    }
  }, [drawer, isCompact]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSaveProgress({
        location: currentLocation.location,
        locatorType: currentLocation.locatorType,
        percent: currentLocation.percent,
        chapter: currentLocation.chapter ?? undefined,
        page: currentLocation.page,
        readingState: currentLocation.percent >= 0.98 ? "FINISHED" : "READING",
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [currentLocation, onSaveProgress]);

  const activeThemeLabel = useMemo(() => {
    if (preferences.theme === "night") {
      return "夜间";
    }
    if (preferences.theme === "sepia") {
      return "护眼";
    }
    return "纸张";
  }, [preferences.theme]);

  function toggleDrawer(next: Exclude<DrawerKey, null>) {
    setDrawer((current) => (current === next ? null : next));
  }

  const drawerContent = (
    <div className="reader-drawer__content">
      {drawer === "contents" ? (
        <>
          <div className="reader-drawer__header">
            <h3>目录</h3>
            <span>{book.toc.length} 节</span>
          </div>
          <div className="detail-list detail-list--reader">
            {book.toc.length ? (
              book.toc.map((entry, index) => (
                <button
                  className="reader-link"
                  key={`${entry}-${index}`}
                  onClick={() => {
                    readerRef.current?.goTo(String(index + 1));
                    setDrawer(null);
                  }}
                  type="button"
                >
                  <span>{entry}</span>
                  <ChevronRight size={14} />
                </button>
              ))
            ) : (
              <p className="empty-copy">这个格式暂时没有可用目录。</p>
            )}
          </div>
        </>
      ) : null}

      {drawer === "bookmarks" ? (
        <>
          <div className="reader-drawer__header">
            <h3>书签</h3>
            <span>{bookmarks.length}</span>
          </div>
          <button
            className="secondary-button"
            onClick={() =>
              onAddBookmark({
                location: currentLocation.location,
                locatorType: currentLocation.locatorType,
                label: currentLocation.chapter || `${book.title} / ${formatPercent(currentLocation.percent)}`,
                chapter: currentLocation.chapter ?? undefined,
                progress: currentLocation.percent,
                page: currentLocation.page,
              })
            }
            type="button"
          >
            <Plus size={16} />
            保存当前位置
          </button>
          <div className="reader-list">
            {bookmarks.length ? (
              bookmarks.map((bookmark) => (
                <article className="reader-list__item" key={bookmark.id}>
                  <button
                    className="reader-list__jump"
                    onClick={() => readerRef.current?.goTo(bookmark.location)}
                    type="button"
                  >
                    <strong>{bookmark.label}</strong>
                    <span>{bookmark.chapter || formatPercent(bookmark.progress)}</span>
                  </button>
                  <button className="icon-button" onClick={() => onRemoveBookmark(bookmark.id)} type="button">
                    <Trash2 size={14} />
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-copy">读到哪里就存到哪里，方便下次直接回来。</p>
            )}
          </div>
        </>
      ) : null}

      {drawer === "notes" ? (
        <>
          <div className="reader-drawer__header">
            <h3>笔记</h3>
            <span>{annotations.length}</span>
          </div>
          <form
            className="note-form"
            onSubmit={(event) => {
              event.preventDefault();
              onAddAnnotation({
                location: currentLocation.location,
                locatorType: currentLocation.locatorType,
                quote: currentLocation.quote ?? undefined,
                note: noteDraft || undefined,
                color: preferences.theme === "night" ? "#82a7ff" : "#f0b45a",
                tone: "NOTE",
              });
              setNoteDraft("");
            }}
          >
            <textarea
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="记录你在当前段落的想法"
              value={noteDraft}
            />
            <button className="secondary-button" type="submit">
              <NotebookPen size={16} />
              添加笔记
            </button>
          </form>
          <div className="reader-list">
            {annotations.length ? (
              annotations.map((annotation) => (
                <article className="reader-list__note" key={annotation.id}>
                  <button
                    className="reader-list__jump"
                    onClick={() => readerRef.current?.goTo(annotation.location)}
                    type="button"
                  >
                    <strong>{annotation.quote || annotation.note || "笔记"}</strong>
                    <span>{annotation.note || "回到这个位置"}</span>
                  </button>
                  <button className="icon-button" onClick={() => onRemoveAnnotation(annotation.id)} type="button">
                    <Trash2 size={14} />
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-copy">笔记会和账号一起同步，也能精确跳回对应位置。</p>
            )}
          </div>
        </>
      ) : null}

      {drawer === "settings" ? (
        <>
          <div className="reader-drawer__header">
            <h3>外观</h3>
            <span>{activeThemeLabel}</span>
          </div>
          <div className="settings-stack">
            <div className="segment-group">
              {([
                { key: "paper", label: "纸张" },
                { key: "sepia", label: "护眼" },
                { key: "night", label: "夜间" },
              ] as const).map((theme) => (
                <button
                  className={preferences.theme === theme.key ? "is-active" : ""}
                  key={theme.key}
                  onClick={() => setPreferences((current) => ({ ...current, theme: theme.key }))}
                  type="button"
                >
                  {theme.label}
                </button>
              ))}
            </div>
            <label className="slider-field">
              <span>字号</span>
              <input
                max="1.4"
                min="0.85"
                onChange={(event) => setPreferences((current) => ({ ...current, fontScale: Number(event.target.value) }))}
                step="0.05"
                type="range"
                value={preferences.fontScale}
              />
            </label>
            <label className="slider-field">
              <span>行高</span>
              <input
                max="2.1"
                min="1.4"
                onChange={(event) => setPreferences((current) => ({ ...current, lineHeight: Number(event.target.value) }))}
                step="0.05"
                type="range"
                value={preferences.lineHeight}
              />
            </label>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <div className={`reader-scene reader-theme--${preferences.theme}`}>
      <header className={`reader-topbar ${chromeVisible ? "is-visible" : ""}`}>
        <button className="ghost-button" onClick={onBack} type="button">
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="reader-topbar__center">
          <strong>{book.title}</strong>
          <span>{currentLocation.chapter || "沉浸阅读"}</span>
        </div>
        <div className="reader-topbar__actions">
          <button className="icon-button" onClick={() => toggleDrawer("bookmarks")} type="button">
            <BookMarked size={16} />
          </button>
          <button className="icon-button" onClick={() => toggleDrawer("settings")} type="button">
            {preferences.theme === "night" ? <SunMedium size={16} /> : <MoonStar size={16} />}
          </button>
        </div>
      </header>

      <div className="reader-stage">
        <div className="reader-controls reader-controls--left">
          <button className="tap-zone" onClick={() => readerRef.current?.prev()} type="button">
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="reader-frame" onClick={() => setChromeVisible((current) => !current)} role="presentation">
          <Suspense fallback={<div className="reader-loading glass-panel">Preparing the book for reading...</div>}>
            {book.format === "EPUB" ? (
              <EpubSurface
                fileSource={fileBuffer ?? fileUrl}
                initialLocation={initialLocation}
                onLocationChange={setCurrentLocation}
                preferences={preferences}
                ref={readerRef}
              />
            ) : book.format === "PDF" ? (
              <PdfSurface
                fileUrl={fileUrl}
                initialLocation={initialLocation}
                onLocationChange={setCurrentLocation}
                preferences={preferences}
                ref={readerRef}
              />
            ) : (
              <TextSurface
                fileUrl={fileUrl}
                format={book.format}
                initialLocation={initialLocation}
                onLocationChange={setCurrentLocation}
                preferences={preferences}
                ref={readerRef}
              />
            )}
          </Suspense>
        </div>

        <div className="reader-controls reader-controls--right">
          <button className="tap-zone" onClick={() => readerRef.current?.next()} type="button">
            <ChevronRight size={18} />
          </button>
        </div>

        <aside className={`reader-drawer glass-panel ${drawer ? "is-open" : ""} ${isCompact ? "is-compact" : ""}`}>
          <div className="reader-drawer__tabs">
            <button className={drawer === "contents" ? "is-active" : ""} onClick={() => toggleDrawer("contents")} type="button">
              <LayoutGrid size={15} />
            </button>
            <button className={drawer === "bookmarks" ? "is-active" : ""} onClick={() => toggleDrawer("bookmarks")} type="button">
              <BookMarked size={15} />
            </button>
            <button className={drawer === "notes" ? "is-active" : ""} onClick={() => toggleDrawer("notes")} type="button">
              <NotebookPen size={15} />
            </button>
            <button className={drawer === "settings" ? "is-active" : ""} onClick={() => toggleDrawer("settings")} type="button">
              <Settings2 size={15} />
            </button>
          </div>
          {drawerContent}
        </aside>
      </div>

      <footer className={`reader-bottombar ${chromeVisible ? "is-visible" : ""}`}>
        <div className="reader-bottombar__progress">
          <span>进度</span>
          <strong>{formatPercent(currentLocation.percent)}</strong>
          <input
            max="100"
            min="0"
            onChange={(event) => readerRef.current?.seek(Number(event.target.value) / 100)}
            step="1"
            type="range"
            value={Math.round(currentLocation.percent * 100)}
          />
        </div>
        <div className="reader-bottombar__actions">
          <button className="secondary-button" onClick={() => toggleDrawer("contents")} type="button">
            目录
          </button>
          <button className="secondary-button" onClick={() => toggleDrawer("notes")} type="button">
            笔记
          </button>
          <button className="secondary-button" onClick={() => toggleDrawer("settings")} type="button">
            外观
          </button>
        </div>
      </footer>
    </div>
  );
}
