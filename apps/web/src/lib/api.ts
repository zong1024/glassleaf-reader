import type { Annotation, Book, Bookmark, DashboardPayload, ReadingProgress, User } from "./types";
import { localApi } from "./localApi";
import {
  clearStoredTokens,
  getStoredRefreshToken,
  setStoredRefreshToken,
  setStoredToken,
} from "./storage";

function resolveApiOrigin() {
  const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim();

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/u, "");
  }

  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const { hostname, origin } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000";
  }

  if (hostname.endsWith("github.io")) {
    return "";
  }

  return origin.replace(/\/$/u, "");
}

const API_ORIGIN = resolveApiOrigin();
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/v1` : "";
const REMOTE_API_ENABLED = Boolean(API_BASE);

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: BodyInit | Record<string, unknown> | null;
  headers?: Record<string, string>;
};

type RawTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
};

type RawUser = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
};

type RawBook = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverUrl?: string | null;
  authors: string[];
  format: "EPUB" | "PDF" | "TXT" | "MD";
  language: string | null;
  publisher: string | null;
  publishedAt: string | null;
  identifier: string | null;
  isbn: string | null;
  subject: string | null;
  series: string | null;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  extension: string;
  fileSize: number;
  checksum: string;
  pageCount: number | null;
  wordCount: number | null;
  chapterCount: number | null;
  metadataSource: string;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type RawLocator = {
  id: string;
  locator: string;
  locatorType: string;
  progression: number | null;
  page: number | null;
  chapter: string | null;
  snippet: string | null;
  createdAt?: string;
  updatedAt: string;
};

type RawProgress = RawLocator & {
  completedAt: string | null;
  lastOpenedAt: string;
};

type RawBookReaderState = {
  book: RawBook;
  progress: RawProgress | null;
  bookmarks: Array<RawLocator & { label: string | null; note: string | null }>;
  annotations: Array<
    RawLocator & {
      quote: string | null;
      note: string | null;
      color: string | null;
    }
  >;
};

let refreshPromise: Promise<string | null> | null = null;

function mapUser(raw: RawUser): User {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.displayName,
    createdAt: raw.createdAt,
  };
}

function progressFraction(raw?: RawProgress | null) {
  if (!raw) {
    return 0;
  }

  return raw.progression != null ? raw.progression / 100 : 0;
}

function accentFromTitle(title: string) {
  const palette = ["#6f88ff", "#ffb46c", "#7ab8a1", "#f18aa4", "#9f8cff"];
  const hash = Array.from(title).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function coverDataUrl(title: string, author: string, accent: string) {
  const escapedTitle = escapeXml(title);
  const escapedAuthor = escapeXml(author || "Unknown author");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 580">
      <defs>
        <linearGradient id="cover" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#f5e8d2" />
        </linearGradient>
      </defs>
      <rect width="420" height="580" rx="38" fill="url(#cover)" />
      <rect x="28" y="28" width="364" height="524" rx="28" fill="rgba(255,255,255,0.14)" />
      <text x="42" y="92" fill="rgba(19,23,31,0.62)" font-family="Manrope, sans-serif" font-size="18" letter-spacing="5">GLASSLEAF</text>
      <text x="42" y="180" fill="#1a1a1a" font-family="Newsreader, serif" font-size="42" font-weight="600">${escapedTitle}</text>
      <text x="42" y="510" fill="rgba(19,23,31,0.78)" font-family="Manrope, sans-serif" font-size="22">${escapedAuthor}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function mapProgress(raw?: RawProgress | null): ReadingProgress | null {
  if (!raw) {
    return null;
  }

  return {
    id: raw.id,
    location: raw.locator,
    locatorType: raw.locatorType,
    percent: progressFraction(raw),
    chapter: raw.chapter,
    page: raw.page,
    updatedAt: raw.updatedAt,
  };
}

function deriveReadingState(progress?: RawProgress | null): Book["readingState"] {
  if (progress?.completedAt) {
    return "FINISHED";
  }

  if (progress) {
    return "READING";
  }

  return "QUEUED";
}

function estimateMinutes(raw: RawBook) {
  if (raw.wordCount) {
    return Math.max(1, Math.round(raw.wordCount / 220));
  }

  if (raw.pageCount) {
    return Math.max(1, raw.pageCount * 2);
  }

  return null;
}

function mapBook(
  raw: RawBook,
  extras?: {
    progress?: RawProgress | null;
    bookmarkCount?: number;
    annotationCount?: number;
  },
): Book {
  const accentColor = accentFromTitle(raw.title);
  const progress = mapProgress(extras?.progress);
  return {
    id: raw.id,
    title: raw.title,
    author: raw.authors[0] ?? null,
    description: raw.description,
    language: raw.language,
    format: raw.format,
    readingState: deriveReadingState(extras?.progress),
    coverUrl: raw.coverUrl ?? coverDataUrl(raw.title, raw.authors[0] ?? "Unknown author", accentColor),
    accentColor,
    pageCount: raw.pageCount,
    wordCount: raw.wordCount,
    estimatedMinutes: estimateMinutes(raw),
    openedAt: extras?.progress?.lastOpenedAt ?? raw.updatedAt,
    uploadedAt: raw.createdAt,
    fileSize: raw.fileSize,
    toc: [],
    bookmarkCount: extras?.bookmarkCount ?? 0,
    annotationCount: extras?.annotationCount ?? 0,
    progress,
  };
}

function mapBookmark(raw: RawLocator & { label: string | null }): Bookmark {
  return {
    id: raw.id,
    location: raw.locator,
    label: raw.label || raw.chapter || "Saved place",
    chapter: raw.chapter,
    progress: raw.progression != null ? raw.progression / 100 : null,
    createdAt: raw.createdAt || raw.updatedAt,
    updatedAt: raw.updatedAt,
  };
}

function mapAnnotation(raw: RawLocator & { quote: string | null; note: string | null; color: string | null }): Annotation {
  return {
    id: raw.id,
    location: raw.locator,
    quote: raw.quote,
    note: raw.note,
    color: raw.color,
    tone: raw.note ? "NOTE" : "HIGHLIGHT",
    createdAt: raw.createdAt || raw.updatedAt,
    updatedAt: raw.updatedAt,
  };
}

async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to refresh session");
        }
        const payload = (await response.json()) as { tokens: RawTokens; user: RawUser };
        setStoredToken(payload.tokens.accessToken);
        setStoredRefreshToken(payload.tokens.refreshToken);
        return payload.tokens.accessToken;
      })
      .catch(() => {
        clearStoredTokens();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function request<T>(endpoint: string, options: RequestOptions = {}, allowRefresh = true) {
  if (!REMOTE_API_ENABLED) {
    throw new Error("Remote API unavailable");
  }

  const headers = new Headers(options.headers);
  const isPlainBody =
    options.body &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof ArrayBuffer);

  if (isPlainBody) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method ?? "GET",
    headers,
    body: isPlainBody ? JSON.stringify(options.body) : (options.body as BodyInit | undefined),
  });

  if (response.status === 401 && allowRefresh && !endpoint.startsWith("/auth/")) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return request<T>(endpoint, { ...options, token: nextToken }, false);
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(data.message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function absoluteAssetUrl(path?: string | null) {
  if (!path) {
    return undefined;
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  if (!API_ORIGIN) {
    return path;
  }

  return `${API_ORIGIN}${path}`;
}

function isLocalToken(token?: string | null) {
  return Boolean(token?.startsWith("local:"));
}

export const api = {
  auth: {
    async register(payload: { email: string; password: string; name?: string }) {
      try {
        const response = await request<{ tokens: RawTokens; user: RawUser }>("/auth/register", {
          method: "POST",
          body: {
            email: payload.email,
            password: payload.password,
            displayName: payload.name,
          },
        });
        return {
          token: response.tokens.accessToken,
          refreshToken: response.tokens.refreshToken,
          user: mapUser(response.user),
        };
      } catch {
        return await localApi.auth.register(payload);
      }
    },
    async login(payload: { email: string; password: string }) {
      try {
        const response = await request<{ tokens: RawTokens; user: RawUser }>("/auth/login", {
          method: "POST",
          body: payload,
        });
        return {
          token: response.tokens.accessToken,
          refreshToken: response.tokens.refreshToken,
          user: mapUser(response.user),
        };
      } catch {
        return await localApi.auth.login(payload);
      }
    },
    async me(token: string) {
      if (isLocalToken(token)) {
        return await localApi.auth.me(token);
      }

      const response = await request<{ user: RawUser }>("/auth/me", {
        token,
      });
      return { user: mapUser(response.user) };
    },
    logout(refreshToken: string) {
      return request<void>("/auth/logout", {
        method: "POST",
        body: { refreshToken },
      });
    },
  },
  books: {
    async list(token: string) {
      if (isLocalToken(token)) {
        return await localApi.books.list(token);
      }

      const [booksResponse, recentResponse] = await Promise.all([
        request<{ items: RawBook[] }>("/books?limit=100&sort=recent", { token }),
        request<{ items: Array<{ book: RawBook; progress: RawProgress }> }>("/library/recent?limit=24", { token }),
      ]);

      const recentMap = new Map(recentResponse.items.map((item) => [item.book.id, item.progress]));

      return {
        books: booksResponse.items.map((book) =>
          mapBook(book, {
            progress: recentMap.get(book.id),
          }),
        ),
      };
    },
    async dashboard(token: string): Promise<DashboardPayload> {
      if (isLocalToken(token)) {
        return await localApi.books.dashboard(token);
      }

      const [booksResponse, recentResponse] = await Promise.all([this.list(token), request<{ items: Array<{ book: RawBook; progress: RawProgress }> }>("/library/recent?limit=5", { token })]);

      const books = booksResponse.books;
      return {
        stats: {
          queuedCount: books.filter((book) => book.readingState === "QUEUED").length,
          readingCount: books.filter((book) => book.readingState === "READING").length,
          finishedCount: books.filter((book) => book.readingState === "FINISHED").length,
        },
        recentBooks: recentResponse.items.map((item) => mapBook(item.book, { progress: item.progress })),
      };
    },
    async detail(bookId: string, token: string) {
      if (isLocalToken(token)) {
        return await localApi.books.detail(bookId, token);
      }

      const response = await request<RawBookReaderState>(`/books/${bookId}/state`, { token });

      return {
        book: mapBook(response.book, {
          progress: response.progress,
          bookmarkCount: response.bookmarks.length,
          annotationCount: response.annotations.length,
        }),
        bookmarks: response.bookmarks.map(mapBookmark),
        annotations: response.annotations.map(mapAnnotation),
        progress: mapProgress(response.progress),
      };
    },
    async upload(file: File, token: string, onProgress?: (value: number) => void) {
      if (isLocalToken(token)) {
        return await localApi.books.upload(file, token, onProgress);
      }

      return await new Promise<{ book: Book }>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/books`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(event.loaded / event.total);
          }
        };
        xhr.onload = () => {
          try {
            const payload = JSON.parse(xhr.responseText || "{}") as { book: RawBook; message?: string };
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                book: mapBook(payload.book),
              });
              return;
            }
            reject(new Error(payload.message || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });
    },
    async downloadFile(bookId: string, token: string) {
      if (isLocalToken(token)) {
        return await localApi.books.downloadFile(bookId, token);
      }

      const response = await fetch(`${API_BASE}/books/${bookId}/file`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load the book file");
      }

      return response.blob();
    },
    async bookmarks(bookId: string, token: string) {
      if (isLocalToken(token)) {
        return await localApi.books.bookmarks(bookId, token);
      }

      const response = await request<{ items: Array<RawLocator & { label: string | null; note: string | null }> }>(
        `/books/${bookId}/bookmarks`,
        { token },
      );
      return { bookmarks: response.items.map(mapBookmark) };
    },
    createBookmark(
      bookId: string,
      token: string,
      payload: { location: string; locatorType?: string; label: string; chapter?: string; progress?: number; page?: number | null },
    ) {
      if (isLocalToken(token)) {
        return localApi.books.createBookmark(bookId, token, payload);
      }

      return request<{ bookmark: Bookmark }>(`/books/${bookId}/bookmarks`, {
        token,
        method: "POST",
        body: {
          locator: payload.location,
          locatorType: payload.locatorType ?? "reader-locator",
          label: payload.label,
          chapter: payload.chapter,
          page: payload.page ?? undefined,
          progression: payload.progress != null ? payload.progress * 100 : undefined,
        },
      });
    },
    deleteBookmark(bookId: string, bookmarkId: string, token: string) {
      if (isLocalToken(token)) {
        return localApi.books.deleteBookmark(bookId, bookmarkId, token);
      }

      return request<{ ok: boolean }>(`/books/${bookId}/bookmarks/${bookmarkId}`, {
        token,
        method: "DELETE",
      });
    },
    async annotations(bookId: string, token: string) {
      if (isLocalToken(token)) {
        return await localApi.books.annotations(bookId, token);
      }

      const response = await request<{ items: Array<RawLocator & { quote: string | null; note: string | null; color: string | null }> }>(
        `/books/${bookId}/annotations`,
        { token },
      );
      return { annotations: response.items.map(mapAnnotation) };
    },
    createAnnotation(
      bookId: string,
      token: string,
      payload: {
        location: string;
        locatorType?: string;
        quote?: string;
        note?: string;
        color?: string;
        tone?: "HIGHLIGHT" | "NOTE";
      },
    ) {
      if (isLocalToken(token)) {
        return localApi.books.createAnnotation(bookId, token, payload);
      }

      return request<{ annotation: Annotation }>(`/books/${bookId}/annotations`, {
        token,
        method: "POST",
        body: {
          locator: payload.location,
          locatorType: payload.locatorType ?? "reader-locator",
          quote: payload.quote,
          note: payload.note,
          color: payload.color,
          snippet: payload.quote,
        },
      });
    },
    deleteAnnotation(bookId: string, annotationId: string, token: string) {
      if (isLocalToken(token)) {
        return localApi.books.deleteAnnotation(bookId, annotationId, token);
      }

      return request<{ ok: boolean }>(`/books/${bookId}/annotations/${annotationId}`, {
        token,
        method: "DELETE",
      });
    },
    progress(bookId: string, token: string) {
      if (isLocalToken(token)) {
        return localApi.books.progress(bookId, token);
      }

      return request<{ progress: RawProgress | null }>(`/books/${bookId}/progress`, { token }).then((response) => ({
        progress: mapProgress(response.progress),
      }));
    },
    saveProgress(
      bookId: string,
      token: string,
      payload: {
        location: string;
        locatorType?: string;
        percent: number;
        chapter?: string;
        page?: number | null;
        device?: string;
        readingState?: Book["readingState"];
      },
    ) {
      if (isLocalToken(token)) {
        return localApi.books.saveProgress(bookId, token, payload);
      }

      return request<{ progress: ReadingProgress }>(`/books/${bookId}/progress`, {
        token,
        method: "PUT",
        body: {
          locator: payload.location,
          locatorType: payload.locatorType ?? "reader-locator",
          progression: payload.percent * 100,
          chapter: payload.chapter,
          page: payload.page ?? undefined,
          snippet: payload.chapter,
          completed: payload.readingState === "FINISHED",
        },
      });
    },
  },
};
