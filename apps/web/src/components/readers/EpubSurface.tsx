import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { useMediaQuery } from "../../hooks/useMediaQuery";
import type { ReaderLocation, ReaderPreferences, ReaderSurfaceHandle } from "../../lib/types";

type EpubSurfaceProps = {
  fileUrl: string;
  initialLocation?: string | null;
  onLocationChange: (location: ReaderLocation) => void;
  preferences: ReaderPreferences;
};

type TocEntry = {
  label: string;
  href?: string;
};

export default forwardRef<ReaderSurfaceHandle, EpubSurfaceProps>(function EpubSurface(
  { fileUrl, initialLocation, onLocationChange, preferences },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const navigationRef = useRef<TocEntry[]>([]);
  const selectionRef = useRef<string | undefined>(undefined);
  const isCompact = useMediaQuery("(max-width: 960px)");
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    prev: () => {
      void renditionRef.current?.prev?.();
    },
    next: () => {
      void renditionRef.current?.next?.();
    },
    goTo: (location: string) => {
      const target = resolveNavigationTarget(location, navigationRef.current);
      void renditionRef.current?.display?.(target || undefined);
    },
    seek: (percent: number) => {
      const bounded = Math.max(0, Math.min(1, percent));
      const book = bookRef.current;
      const cfi = book?.locations?.cfiFromPercentage?.(bounded);

      if (cfi) {
        void renditionRef.current?.display?.(cfi);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      container.innerHTML = "";
      try {
        setError(null);
        const createBook = await loadEpubFactory();
        const book = createBook(fileUrl);
        const rendition = book.renderTo(container, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: isCompact ? "none" : "auto",
          manager: "default",
        });

        bookRef.current = book;
        renditionRef.current = rendition;
        applyTheme(rendition, preferences);

        const navigation = await book.loaded.navigation.catch(() => ({ toc: [] }));
        navigationRef.current = flattenToc(navigation.toc ?? []);

        rendition.on("selected", (_cfiRange: string, contents: any) => {
          const quote = contents.window.getSelection()?.toString().trim();
          selectionRef.current = quote || undefined;
          contents.window.getSelection()?.removeAllRanges();
        });

        rendition.on("relocated", (location: any) => {
          if (cancelled) {
            return;
          }

          const href = location?.start?.href;
          const cfi = location?.start?.cfi || href || initialLocation || "0";
          const percentFromLocation = location?.start?.percentage;
          const percentFromCfi = book.locations?.percentageFromCfi?.(cfi);
          const percent =
            typeof percentFromLocation === "number"
              ? percentFromLocation
              : typeof percentFromCfi === "number"
                ? percentFromCfi
                : 0;

          onLocationChange({
            location: cfi,
            locatorType: "epub-cfi",
            chapter: chapterLabelForLocation(href, navigationRef.current),
            percent,
            quote: selectionRef.current,
          });
        });

        await book.ready;
        await rendition.display(resolveNavigationTarget(initialLocation, navigationRef.current) || undefined);
      } catch {
        if (!cancelled) {
          setError("This EPUB could not be opened. We have kept the file, but the reader engine could not parse it.");
        }
        return;
      }

      try {
        await bookRef.current?.locations.generate(1200);
      } catch {
        // Some light EPUBs do not expose enough data for generated locations.
      }
    }

    void boot();

    return () => {
      cancelled = true;
      renditionRef.current?.destroy?.();
      bookRef.current?.destroy?.();
      renditionRef.current = null;
      bookRef.current = null;
      navigationRef.current = [];
      selectionRef.current = undefined;
    };
  }, [fileUrl, initialLocation, isCompact, onLocationChange, preferences]);

  if (error) {
    return <div className="reader-loading glass-panel">{error}</div>;
  }

  return <div className="reader-surface reader-surface--epub" ref={containerRef} />;
});

async function loadEpubFactory() {
  const module = await import("epubjs");
  const candidate =
    (module as { default?: { default?: unknown } }).default?.default ??
    (module as { default?: unknown }).default ??
    (module as { ["module.exports"]?: unknown })["module.exports"] ??
    module;

  if (typeof candidate !== "function") {
    throw new Error("EPUB renderer failed to initialize.");
  }

  return candidate as (input: string) => {
    renderTo: (element: HTMLElement, options: Record<string, unknown>) => any;
    loaded: { navigation: Promise<{ toc?: Array<{ label?: string; href?: string; subitems?: Array<any> }> }> };
    ready: Promise<unknown>;
    locations: {
      generate: (chars: number) => Promise<void>;
      cfiFromPercentage?: (value: number) => string | undefined;
      percentageFromCfi?: (value: string) => number | undefined;
    };
    destroy?: () => void;
  };
}

function applyTheme(rendition: any, preferences: ReaderPreferences) {
  const palette =
    preferences.theme === "night"
      ? {
          bg: "#0f1218",
          fg: "#eff2ff",
          muted: "#a5b2d1",
        }
      : preferences.theme === "sepia"
        ? {
            bg: "#f3ead8",
            fg: "#4e3f31",
            muted: "#967d63",
          }
        : {
            bg: "#fffaf3",
            fg: "#1b1b22",
            muted: "#7e808e",
          };

  rendition.themes.default({
    "html, body": {
      "font-family": "'Newsreader', serif",
      "font-size": `${preferences.fontScale}em`,
      "line-height": String(preferences.lineHeight),
      color: palette.fg,
      background: palette.bg,
      margin: "0",
      padding: "1.8rem 0 2.4rem",
    },
    body: {
      margin: "0 auto",
      "max-width": "42rem",
      padding: "0 1.6rem",
    },
    p: {
      "margin-bottom": "1.1em",
      "text-wrap": "pretty",
    },
    "h1, h2, h3, h4": {
      "font-family": "'Manrope', sans-serif",
      color: palette.fg,
    },
    blockquote: {
      color: palette.muted,
      "border-left": `2px solid ${palette.muted}`,
      margin: "0 0 1.1rem",
      padding: "0 0 0 1rem",
    },
    "img, svg": {
      "max-width": "100%",
      height: "auto",
    },
    a: {
      color: palette.fg,
    },
  });

  rendition.themes.fontSize(`${preferences.fontScale}em`);
  rendition.themes.override("line-height", String(preferences.lineHeight));
}

function flattenToc(entries: Array<{ label?: string; href?: string; subitems?: Array<any> }>) {
  const flattened: TocEntry[] = [];

  for (const entry of entries) {
    flattened.push({
      label: entry.label || "Section",
      href: entry.href,
    });

    if (entry.subitems?.length) {
      flattened.push(...flattenToc(entry.subitems));
    }
  }

  return flattened;
}

function normalizeHref(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.split("#")[0].replace(/^\.\//u, "").toLowerCase();
}

function chapterLabelForLocation(location?: string | null, toc: TocEntry[] = []) {
  const normalized = normalizeHref(location);
  if (!normalized) {
    return toc[0]?.label || "Opening pages";
  }

  const match = toc.find((entry) => {
    const entryHref = normalizeHref(entry.href);
    return entryHref === normalized || normalized.endsWith(entryHref);
  });

  return match?.label || toc[0]?.label || "Opening pages";
}

function resolveNavigationTarget(location?: string | null, toc: TocEntry[] = []) {
  if (!location) {
    return undefined;
  }

  const numericIndex = Number(location);
  if (Number.isFinite(numericIndex) && !location.includes("epubcfi(")) {
    const target = toc[Math.max(0, Math.round(numericIndex) - 1)];
    return target?.href || undefined;
  }

  return location;
}
