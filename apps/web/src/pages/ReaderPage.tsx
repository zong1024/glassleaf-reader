import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { ReaderWorkspace } from "../components/ReaderWorkspace";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

export function ReaderPage() {
  const { bookId = "" } = useParams();
  const navigate = useNavigate();
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [fileUrl, setFileUrl] = useState("");
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);

  const stateQuery = useQuery({
    queryKey: ["bookState", bookId],
    queryFn: () => api.books.detail(bookId, token),
    enabled: Boolean(bookId),
  });

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setFileBuffer(null);

    api.books
      .downloadFile(bookId, token)
      .then(async (blob) => {
        objectUrl = URL.createObjectURL(blob);
        const nextBuffer =
          stateQuery.data?.book?.format === "EPUB" || blob.type === "application/epub+zip"
            ? await blob.arrayBuffer()
            : null;
        if (active) {
          setFileUrl(objectUrl);
          setFileBuffer(nextBuffer);
        }
      })
      .catch(() => {
        setFileUrl("");
        setFileBuffer(null);
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [bookId, stateQuery.data?.book?.format, token]);

  const addBookmark = useMutation({
    mutationFn: (payload: {
      location: string;
      locatorType?: string;
      label: string;
      chapter?: string;
      progress?: number;
      page?: number | null;
    }) => api.books.createBookmark(bookId, token, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookState", bookId] }),
  });

  const removeBookmark = useMutation({
    mutationFn: (bookmarkId: string) => api.books.deleteBookmark(bookId, bookmarkId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookState", bookId] }),
  });

  const addAnnotation = useMutation({
    mutationFn: (payload: {
      location: string;
      locatorType?: string;
      quote?: string;
      note?: string;
      color?: string;
      tone?: "HIGHLIGHT" | "NOTE";
    }) => api.books.createAnnotation(bookId, token, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookState", bookId] }),
  });

  const removeAnnotation = useMutation({
    mutationFn: (annotationId: string) => api.books.deleteAnnotation(bookId, annotationId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookState", bookId] }),
  });

  const saveProgress = useMutation({
    mutationFn: (payload: {
      location: string;
      locatorType?: string;
      percent: number;
      chapter?: string;
      page?: number | null;
      readingState?: "QUEUED" | "READING" | "FINISHED";
    }) => api.books.saveProgress(bookId, token, { ...payload, device: "web" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookState", bookId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const book = stateQuery.data?.book;
  const annotations = stateQuery.data?.annotations ?? [];
  const bookmarks = stateQuery.data?.bookmarks ?? [];
  const progress = stateQuery.data?.progress;

  if (!book || !fileUrl || (book.format === "EPUB" && !fileBuffer)) {
    return (
      <div className="reader-loading-shell glass-panel">
        <LoaderCircle className="is-spinning" size={20} />
        <p>Loading your book and restoring reading position...</p>
      </div>
    );
  }

  return (
    <ReaderWorkspace
      annotations={annotations}
      bookmarks={bookmarks}
      book={book}
      fileBuffer={fileBuffer}
      fileUrl={fileUrl}
      initialLocation={progress?.location ?? book.progress?.location}
      onAddAnnotation={(payload) => addAnnotation.mutate(payload)}
      onAddBookmark={(payload) => addBookmark.mutate(payload)}
      onBack={() => navigate("/library")}
      onRemoveAnnotation={(annotationId) => removeAnnotation.mutate(annotationId)}
      onRemoveBookmark={(bookmarkId) => removeBookmark.mutate(bookmarkId)}
      onSaveProgress={(payload) => saveProgress.mutate(payload)}
    />
  );
}
