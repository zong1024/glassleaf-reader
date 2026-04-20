import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { marked } from "marked";

import type { BookFormat, ReaderLocation, ReaderPreferences, ReaderSurfaceHandle } from "../../lib/types";

type TextSurfaceProps = {
  fileUrl: string;
  format: BookFormat;
  initialLocation?: string | null;
  onLocationChange: (location: ReaderLocation) => void;
  preferences: ReaderPreferences;
};

export default forwardRef<ReaderSurfaceHandle, TextSurfaceProps>(function TextSurface(
  { fileUrl, format, initialLocation, onLocationChange, preferences },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [content, setContent] = useState("");

  useImperativeHandle(ref, () => ({
    prev: () => scrollRef.current?.scrollBy({ top: -(scrollRef.current.clientHeight * 0.88), behavior: "smooth" }),
    next: () => scrollRef.current?.scrollBy({ top: scrollRef.current.clientHeight * 0.88, behavior: "smooth" }),
    goTo: (location: string) => {
      const percent = Number(location);
      if (!Number.isFinite(percent) || !scrollRef.current) {
        return;
      }
      const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
      scrollRef.current.scrollTo({ top: maxScroll * percent, behavior: "smooth" });
    },
    seek: (percent: number) => {
      if (!scrollRef.current) {
        return;
      }
      const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
      scrollRef.current.scrollTo({
        top: Math.max(0, Math.min(1, percent)) * maxScroll,
        behavior: "smooth",
      });
    },
  }));

  useEffect(() => {
    fetch(fileUrl)
      .then((response) => response.text())
      .then((text) => setContent(text));
  }, [fileUrl]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    if (initialLocation) {
      const percent = Number(initialLocation);
      if (Number.isFinite(percent)) {
        requestAnimationFrame(() => {
          const maxScroll = node.scrollHeight - node.clientHeight;
          node.scrollTop = Math.max(0, maxScroll * percent);
        });
      }
    }

    const onScroll = () => {
      const maxScroll = Math.max(1, node.scrollHeight - node.clientHeight);
      const percent = node.scrollTop / maxScroll;
      const selection = window.getSelection()?.toString();
      onLocationChange({
        location: String(percent),
        locatorType: format === "MD" ? "markdown-scroll" : "text-scroll",
        chapter: percent > 0.5 ? "Lower section" : "Upper section",
        percent,
        quote: selection || undefined,
      });
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => node.removeEventListener("scroll", onScroll);
  }, [content, format, initialLocation, onLocationChange]);

  return (
    <div className="reader-surface reader-surface--text" ref={scrollRef}>
      {format === "MD" ? (
        <article
          className={`text-prose text-prose--${preferences.theme}`}
          style={{ fontSize: `${preferences.fontScale}rem`, lineHeight: preferences.lineHeight }}
          dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
        />
      ) : (
        <article
          className={`text-prose text-prose--${preferences.theme}`}
          style={{ fontSize: `${preferences.fontScale}rem`, lineHeight: preferences.lineHeight }}
        >
          {content}
        </article>
      )}
    </div>
  );
});
