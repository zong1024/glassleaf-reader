import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, LoaderCircle } from "lucide-react";

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
    <div className="portal-upload">
      <section className="portal-upload__hero">
        <h1>上传图书</h1>
        <p>继续沿用当前深色检索站风格，把文件直接送进你的私有书库。</p>
      </section>

      <section className="portal-upload__layout">
        <button
          className={`portal-upload-dropzone ${dragging ? "is-dragging" : ""}`}
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
          <div className="portal-upload-dropzone__icon">
            {uploadMutation.isPending ? <LoaderCircle className="is-spinning" size={22} /> : <FileUp size={22} />}
          </div>
          <div className="portal-upload-dropzone__copy">
            <strong>把电子书拖到这里</strong>
            <p>支持 EPUB、PDF、TXT、Markdown。点击也可以直接选择文件。</p>
          </div>
          <div className="portal-upload-dropzone__meta">
            <span>优先优化 EPUB 解析</span>
            <span>自动抽取封面与元数据</span>
            <span>直接进入账号书架</span>
          </div>
          <div className="portal-upload-dropzone__progress">
            <div className="portal-upload-dropzone__track">
              <div className="portal-upload-dropzone__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span>{message || (uploadMutation.isPending ? `正在上传 ${Math.round(progress * 100)}%` : "拖拽或点击开始上传")}</span>
          </div>
        </button>

        <input
          accept=".epub,.pdf,.txt,.md"
          hidden
          onChange={(event) => pickFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />

        <aside className="portal-panel portal-upload-side">
          <span className="portal-panel__eyebrow">处理流程</span>
          <h2>上传后会发生什么</h2>
          <ol className="portal-upload-side__list">
            <li>文件进入你的私有空间，并立即识别格式。</li>
            <li>EPUB 会优先提取元数据、目录和封面，首开更快。</li>
            <li>进度、书签和批注会自动绑定到当前账号。</li>
          </ol>
          <p>手机端建议一次上传一本，桌面端可以直接拖拽，体验会更顺手。</p>
        </aside>
      </section>

      <section className="portal-shelf">
        <div className="portal-shelf__head">
          <h2>最近导入</h2>
          <span>显示最新 4 本</span>
        </div>

        <div className="portal-upload-list">
          {(booksQuery.data?.books ?? []).slice(0, 4).map((book) => (
            <article className="portal-upload-list__item" key={book.id}>
              <div>
                <strong>{book.title}</strong>
                <p>{book.author || "作者未知"}</p>
              </div>
              <div className="portal-upload-list__meta">
                <span>{book.format}</span>
                <span>{formatBytes(book.fileSize)}</span>
                <span>{formatMinutes(book.estimatedMinutes)}</span>
              </div>
            </article>
          ))}
          {!booksQuery.data?.books?.length ? <div className="portal-empty">上传后，这里会出现最新入库的图书。</div> : null}
        </div>
      </section>
    </div>
  );
}
