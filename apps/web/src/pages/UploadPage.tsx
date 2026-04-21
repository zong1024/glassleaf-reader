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
      setMessage(`已导入《${payload.book.title}》`);
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "上传失败");
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
            <h2>把电子书拖进来，立刻入库。</h2>
            <p>优先优化 EPUB，同时支持 PDF、TXT 和 Markdown，统一进入同一套书架与阅读流程。</p>
          </div>
          <div className="upload-dropzone__meta">
            <span>快速提取元数据</span>
            <span>移动端触控友好</span>
            <span>书签与笔记就绪</span>
          </div>
          <div className="upload-progress">
            <div className="upload-progress__bar">
              <div className="upload-progress__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span>{message || (uploadMutation.isPending ? `正在上传 ${Math.round(progress * 100)}%` : "选择文件或直接拖拽到这里")}</span>
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
          <span className="section-title__eyebrow">处理流程</span>
          <h3>上传后会发生什么</h3>
          <ol className="detail-list">
            <li>文件先进入你的私有空间，系统立即识别格式并创建书籍记录。</li>
            <li>EPUB 会优先提取元数据、封面和目录，保证第一次打开更快。</li>
            <li>书架、进度、书签和批注会自动挂到当前账号下。</li>
          </ol>
          <p className="upload-side__footnote">手机端建议一次上传一本，桌面端可以直接拖拽，流程会更顺手。</p>
        </aside>
      </section>

      <section className="page-section">
        <div className="section-title section-title--compact">
          <div>
            <span className="section-title__eyebrow">最近加入</span>
            <h2>新导入图书</h2>
          </div>
          <Sparkles size={16} />
        </div>
        <div className="import-list">
          {(booksQuery.data?.books ?? []).slice(0, 4).map((book) => (
            <article className="glass-panel import-row" key={book.id}>
              <div>
                <strong>{book.title}</strong>
                <p>
                  {(book.author || "作者未知")} · {book.format.toLowerCase()}
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
