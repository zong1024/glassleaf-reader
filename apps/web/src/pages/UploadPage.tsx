import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, LoaderCircle, Sparkles } from "lucide-react";

import { api } from "../lib/api";
import { formatBytes, formatMinutes } from "../lib/format";
import { useSession } from "../lib/session";

export function UploadPage() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: () => api.books.list(token),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.books.upload(file, token, setProgress),
    onMutate: () => {
      setProgress(0);
      setMessage("");
    },
    onSuccess: (payload) => {
      setMessage(`Imported ${payload.book.title}`);
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    },
  });

  function pickFile(file?: File | null) {
    if (!file) {
      return;
    }

    uploadMutation.mutate(file);
  }

  return (
    <div className="page-stack">
      <section className="upload-layout">
        <button
          className={`upload-dropzone ${dragging ? "is-dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pickFile(event.dataTransfer.files[0]);
          }}
          type="button"
        >
          <div className="brand-mark">
            {uploadMutation.isPending ? <LoaderCircle className="is-spinning" size={20} /> : <FileUp size={20} />}
          </div>
          <div>
            <h2>Drop a book to ingest it at reading speed.</h2>
            <p>EPUB is optimized first, with PDF, TXT, and Markdown supported in the same library pipeline.</p>
          </div>
          <div className="upload-dropzone__meta">
            <span>Fast metadata extraction</span>
            <span>Touch-friendly mobile import</span>
            <span>Bookmarks and notes ready</span>
          </div>
          <div className="upload-progress">
            <div className="upload-progress__bar">
              <div className="upload-progress__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span>{message || (uploadMutation.isPending ? `Uploading ${Math.round(progress * 100)}%` : "Choose or drag a file")}</span>
          </div>
        </button>

        <input
          accept=".epub,.pdf,.txt,.md"
          hidden
          onChange={(event) => pickFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />

        <aside className="upload-side glass-panel">
          <span className="section-title__eyebrow">Pipeline notes</span>
          <h3>What happens on upload</h3>
          <ol className="detail-list">
            <li>The file lands in your private storage and format is detected immediately.</li>
            <li>EPUB metadata, cover art, and table of contents are extracted for faster first open.</li>
            <li>Library rows, progress sync, bookmarks, and notes are wired to your account automatically.</li>
          </ol>
          <p className="upload-side__footnote">
            Add one book at a time for the cleanest mobile experience, or drag from desktop for a faster batch-like flow.
          </p>
        </aside>
      </section>

      <section className="page-section">
        <div className="section-title section-title--compact">
          <div>
            <span className="section-title__eyebrow">Recently added</span>
            <h2>Fresh imports</h2>
          </div>
          <Sparkles size={16} />
        </div>
        <div className="import-list">
          {(booksQuery.data?.books ?? []).slice(0, 4).map((book) => (
            <article className="glass-panel import-row" key={book.id}>
              <div>
                <strong>{book.title}</strong>
                <p>
                  {(book.author || "Unknown author")} · {book.format.toLowerCase()}
                </p>
              </div>
              <div className="import-row__meta">
                <span>{formatBytes(book.fileSize)}</span>
                <span>{formatMinutes(book.estimatedMinutes)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
