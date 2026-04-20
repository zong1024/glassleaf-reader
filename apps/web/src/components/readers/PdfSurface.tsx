import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import type { ReaderLocation, ReaderPreferences, ReaderSurfaceHandle } from "../../lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PdfSurfaceProps = {
  fileUrl: string;
  initialLocation?: string | null;
  onLocationChange: (location: ReaderLocation) => void;
  preferences: ReaderPreferences;
};

export default forwardRef<ReaderSurfaceHandle, PdfSurfaceProps>(function PdfSurface(
  { fileUrl, initialLocation, onLocationChange, preferences },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageNumber, setPageNumber] = useState(() => Number(initialLocation || 1));
  const [pageCount, setPageCount] = useState(1);
  const [width, setWidth] = useState(680);

  useImperativeHandle(ref, () => ({
    prev: () => setPageNumber((current) => Math.max(1, current - 1)),
    next: () => setPageNumber((current) => Math.min(pageCount, current + 1)),
    goTo: (location: string) => {
      const nextPage = Number(location);
      if (Number.isFinite(nextPage)) {
        setPageNumber(Math.max(1, Math.min(pageCount, nextPage)));
      }
    },
    seek: (percent: number) => {
      const bounded = Math.max(0, Math.min(1, percent));
      const nextPage = Math.round(bounded * Math.max(pageCount - 1, 0)) + 1;
      setPageNumber(Math.max(1, Math.min(pageCount, nextPage)));
    },
  }));

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(Math.min(entry.contentRect.width - 48, 840));
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    onLocationChange({
      location: String(pageNumber),
      locatorType: "pdf-page",
      chapter: `Page ${pageNumber}`,
      percent: pageCount ? pageNumber / pageCount : 0,
      page: pageNumber,
    });
  }, [pageCount, pageNumber, onLocationChange]);

  return (
    <div className="reader-surface reader-surface--pdf" ref={containerRef}>
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => {
          setPageCount(numPages);
          if (initialLocation) {
            const initialPage = Number(initialLocation);
            if (Number.isFinite(initialPage)) {
              setPageNumber(Math.max(1, Math.min(numPages, initialPage)));
            }
          }
        }}
      >
        <Page
          pageNumber={pageNumber}
          renderAnnotationLayer={false}
          renderTextLayer
          width={width}
          className={`pdf-page pdf-page--${preferences.theme}`}
        />
      </Document>
    </div>
  );
});
