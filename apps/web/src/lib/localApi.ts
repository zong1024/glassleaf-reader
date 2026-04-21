import type {
  Annotation,
  Book,
  Bookmark,
  DashboardPayload,
  ReadingProgress,
  ReadingState,
  User,
} from "./types";

type AuthPayload = { email: string; password: string; name?: string };

type LocalUserRecord = User & {
  password: string;
};

type StoredBookRecord = Book & {
  sourceType: "demo" | "upload";
  sourceMimeType?: string | null;
};

type StoredFileRecord = {
  id: string;
  userId: string;
  bookId: string;
  mimeType: string;
  fileName: string;
  buffer?: ArrayBuffer;
  text?: string;
};

type SeedBook = {
  book: StoredBookRecord;
  file: StoredFileRecord;
  bookmarks?: Bookmark[];
  annotations?: Annotation[];
};

const TOKEN_PREFIX = "local:";
const STORAGE_VERSION = "v1";
const USERS_KEY = `glassleaf.local.users.${STORAGE_VERSION}`;
const FILE_DB_NAME = "glassleaf-local-files";
const FILE_STORE_NAME = "book-files";
const FILE_DB_VERSION = 1;
const DEMO_EMAIL = "demo@glassleaf.app";
const DEMO_PASSWORD = "demo1234";

const markdownDemo = `# Window Light

The glass corridor between the tram platform and the library was never silent, but it held sound in a way that made every sentence feel slightly more deliberate.

## Blue platforms

Rain dragged long reflections over the painted floor. Every commuter seemed to lower their voice by instinct, as if transit and reading had quietly negotiated a shared etiquette.

Good reading software should feel like that corridor. It should move you forward without asking to be admired.

## Thumb memory

The best part of the evening commute was the last fifteen minutes, when the route stopped surprising him and his thumb started finding the exact resting place on the screen without looking.

He called it thumb memory: the point where interaction ceased to feel like operation and started to feel like continuation.

## Return path

At home he bookmarked a paragraph about bridges, added a note about page weight, and left the device face up on the desk. Progress remained exactly where it should, waiting more like furniture than software.
`;

const textDemo = `Harbor Notes

Morning ferries wrote white seams into dark water while vendors unlatched shutters in a rhythm that felt almost editorial.

She sat near the window because all good reading rooms borrow something from transit: movement beyond the glass, stability within it, and enough quiet to notice the shape of a sentence.

Station Glass

The platform screens were too bright before sunrise, but not harsh. They hovered over tired faces like patient headings, dividing the morning into understandable sections.

No interface should ask for more attention than the content it serves. The useful part is the part that disappears first.

Night Shelf

Back in the apartment, a lamp, a cup, and an unfinished page were enough to make the room feel designed. She saved a bookmark for tomorrow and trusted the shelf to remember the mood as well as the position.
`;

const essayDemo = `# Atlas of Small Lights

Travel is often remembered as weather plus route, but readers know that place is also chair height, lamp warmth, and whether a surface meets the hand with resistance or grace.

## Hotel desk

A brass room key beside a notebook can make even a borrowed desk feel ceremonial. The same is true of a reading surface that restores you to the right paragraph without forcing explanation.

## Tram sun

Afternoon light cut the carriage into panels and made every open page look briefly cinematic. She underlined nothing, but saved a note about timing. Some sentences only become themselves when read at the correct hour.

## Final stop

By the final station she had learned what she wanted from the app she used every day: fewer boxes, softer motion, stronger typography, and enough calm to make rereading feel intentional instead of procedural.
`;

const palettes = [
  {
    accent: "#8aa5ff",
    coverLow: "#0f203d",
    coverHigh: "#8aa5ff",
  },
  {
    accent: "#76c7a3",
    coverLow: "#102c27",
    coverHigh: "#8de0bb",
  },
  {
    accent: "#f0b17b",
    coverLow: "#3b2315",
    coverHigh: "#ffd1aa",
  },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function userBooksKey(userId: string) {
  return `glassleaf.local.${userId}.books.${STORAGE_VERSION}`;
}

function userBookmarksKey(userId: string) {
  return `glassleaf.local.${userId}.bookmarks.${STORAGE_VERSION}`;
}

function userAnnotationsKey(userId: string) {
  return `glassleaf.local.${userId}.annotations.${STORAGE_VERSION}`;
}

function userProgressKey(userId: string) {
  return `glassleaf.local.${userId}.progress.${STORAGE_VERSION}`;
}

function listUsers() {
  return readJson<LocalUserRecord[]>(USERS_KEY, []);
}

function saveUsers(users: LocalUserRecord[]) {
  writeJson(USERS_KEY, users);
}

function toPublicUser(user: LocalUserRecord): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    avatarGradient: user.avatarGradient ?? null,
    createdAt: user.createdAt,
  };
}

function tokenForUser(userId: string) {
  return `${TOKEN_PREFIX}${userId}`;
}

function parseToken(token: string) {
  if (!token.startsWith(TOKEN_PREFIX)) {
    throw new Error("Unsupported token");
  }

  return token.slice(TOKEN_PREFIX.length);
}

function getUserByToken(token: string) {
  const userId = parseToken(token);
  const user = listUsers().find((entry) => entry.id === userId);

  if (!user) {
    throw new Error("Session expired");
  }

  ensureSeedLibrary(user.id);
  return user;
}

function hashSeed(input: string) {
  return [...input].reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function pickPalette(input: string) {
  return palettes[hashSeed(input) % palettes.length];
}

function wrapTitle(title: string, maxLength: number) {
  const words = title.split(/\s+/u);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function coverDataUrl(title: string, author: string, accent: string) {
  const palette = pickPalette(title + author + accent);
  const titleLines = wrapTitle(title, 14);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 580">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.coverLow}" />
          <stop offset="100%" stop-color="${palette.coverHigh}" />
        </linearGradient>
      </defs>
      <rect width="420" height="580" rx="40" fill="url(#g)" />
      <rect x="28" y="28" width="364" height="524" rx="28" fill="rgba(255,255,255,0.08)" />
      <text x="44" y="120" fill="rgba(255,255,255,0.78)" font-family="Manrope, Arial, sans-serif" font-size="18" letter-spacing="6">GLASSLEAF</text>
      ${titleLines
        .map(
          (line, index) =>
            `<text x="44" y="${210 + index * 58}" fill="#fff8ef" font-family="Newsreader, Georgia, serif" font-size="54" font-weight="600">${escapeXml(
              line,
            )}</text>`,
        )
        .join("")}
      <text x="44" y="500" fill="rgba(255,255,255,0.82)" font-family="Manrope, Arial, sans-serif" font-size="22">${escapeXml(
        author || "Unknown author",
      )}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
}

function estimateMinutes(wordCount: number, bonus = 0) {
  return Math.max(5, Math.round(wordCount / 230) + bonus);
}

function summarizeText(text: string) {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (normalized.length <= 140) {
    return normalized;
  }

  return `${normalized.slice(0, 137)}...`;
}

function parseMarkdownToc(markdown: string) {
  return markdown
    .split("\n")
    .filter((line) => /^#{1,3}\s+/u.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/u, "").trim())
    .slice(0, 12);
}

function createDemoBooks(userId: string): SeedBook[] {
  const createdAt = new Date().toISOString();
  const demoBooks: Array<{
    id: string;
    title: string;
    author: string;
    format: "MD" | "TXT";
    readingState: ReadingState;
    fileName: string;
    text: string;
    progress: ReadingProgress | null;
  }> = [
    {
      id: "demo-window-light",
      title: "Window Light Manual",
      author: "Mara Tan",
      format: "MD",
      readingState: "READING",
      fileName: "window-light.md",
      text: markdownDemo,
      progress: {
        id: "progress-demo-window-light",
        location: "0.32",
        percent: 0.32,
        chapter: "Thumb memory",
        device: "web",
        updatedAt: createdAt,
      },
    },
    {
      id: "demo-harbor-notes",
      title: "Harbor Notes",
      author: "Senna Vale",
      format: "TXT",
      readingState: "QUEUED",
      fileName: "harbor-notes.txt",
      text: textDemo,
      progress: null,
    },
    {
      id: "demo-small-lights",
      title: "Atlas of Small Lights",
      author: "Ivo Lin",
      format: "MD",
      readingState: "FINISHED",
      fileName: "atlas-of-small-lights.md",
      text: essayDemo,
      progress: {
        id: "progress-demo-small-lights",
        location: "1",
        percent: 1,
        chapter: "Final stop",
        device: "web",
        updatedAt: createdAt,
      },
    },
  ];

  return demoBooks.map((entry, index) => {
    const palette = pickPalette(`${entry.title}-${entry.author}`);
    const toc = entry.format === "MD" ? parseMarkdownToc(entry.text) : ["Opening pages", "Midway", "Closing pages"];
    const wordCount = countWords(entry.text);
    const book: StoredBookRecord = {
      id: entry.id,
      title: entry.title,
      author: entry.author,
      description: summarizeText(entry.text),
      language: "en",
      format: entry.format,
      readingState: entry.readingState,
      coverUrl: coverDataUrl(entry.title, entry.author, palette.accent),
      accentColor: palette.accent,
      pageCount: null,
      wordCount,
      estimatedMinutes: estimateMinutes(wordCount, index * 4),
      openedAt: entry.progress ? createdAt : null,
      uploadedAt: createdAt,
      fileSize: new Blob([entry.text]).size,
      toc,
      bookmarkCount: entry.id === "demo-window-light" ? 1 : 0,
      annotationCount: entry.id === "demo-window-light" ? 1 : 0,
      progress: entry.progress,
      sourceType: "demo",
      sourceMimeType: entry.format === "MD" ? "text/markdown" : "text/plain",
    };

    const bookmark =
      entry.id === "demo-window-light"
        ? [
            {
              id: "bookmark-demo-window-light",
              location: "0.32",
              label: "Thumb memory",
              chapter: "Thumb memory",
              progress: 0.32,
              createdAt,
              updatedAt: createdAt,
            } satisfies Bookmark,
          ]
        : [];

    const annotations =
      entry.id === "demo-window-light"
        ? [
            {
              id: "annotation-demo-window-light",
              location: "0.32",
              quote: "Thumb memory: the point where interaction ceases to feel like operation.",
              note: "Keep this tone when polishing the mobile tap zones.",
              color: "#8aa5ff",
              tone: "NOTE",
              createdAt,
              updatedAt: createdAt,
            } satisfies Annotation,
          ]
        : [];

    return {
      book,
      file: {
        id: `${userId}-${entry.id}`,
        userId,
        bookId: entry.id,
        mimeType: book.sourceMimeType || "text/plain",
        fileName: entry.fileName,
        text: entry.text,
      },
      bookmarks: bookmark,
      annotations,
    };
  });
}

function ensureSeedLibrary(userId: string) {
  const currentBooks = readJson<StoredBookRecord[]>(userBooksKey(userId), []);
  if (currentBooks.length > 0) {
    return;
  }

  const seeded = createDemoBooks(userId);
  writeJson(
    userBooksKey(userId),
    seeded.map((entry) => entry.book),
  );
  writeJson(
    userBookmarksKey(userId),
    Object.fromEntries(seeded.map((entry) => [entry.book.id, entry.bookmarks ?? []])),
  );
  writeJson(
    userAnnotationsKey(userId),
    Object.fromEntries(seeded.map((entry) => [entry.book.id, entry.annotations ?? []])),
  );
  writeJson(
    userProgressKey(userId),
    Object.fromEntries(
      seeded
        .filter((entry) => entry.book.progress)
        .map((entry) => [entry.book.id, entry.book.progress as ReadingProgress]),
    ),
  );

  for (const entry of seeded) {
    void saveFileRecord(entry.file);
  }
}

function getBooksForUser(userId: string) {
  ensureSeedLibrary(userId);
  const books = readJson<StoredBookRecord[]>(userBooksKey(userId), []);
  const progressMap = readJson<Record<string, ReadingProgress>>(userProgressKey(userId), {});

  return books
    .map((book) => ({
      ...book,
      progress: progressMap[book.id] ?? book.progress ?? null,
    }))
    .sort(
      (left, right) =>
        new Date(right.openedAt ?? right.uploadedAt).getTime() -
        new Date(left.openedAt ?? left.uploadedAt).getTime(),
    );
}

function saveBooksForUser(userId: string, books: StoredBookRecord[]) {
  writeJson(userBooksKey(userId), books);
}

function getBookmarksForUser(userId: string) {
  ensureSeedLibrary(userId);
  return readJson<Record<string, Bookmark[]>>(userBookmarksKey(userId), {});
}

function saveBookmarksForUser(userId: string, value: Record<string, Bookmark[]>) {
  writeJson(userBookmarksKey(userId), value);
}

function getAnnotationsForUser(userId: string) {
  ensureSeedLibrary(userId);
  return readJson<Record<string, Annotation[]>>(userAnnotationsKey(userId), {});
}

function saveAnnotationsForUser(userId: string, value: Record<string, Annotation[]>) {
  writeJson(userAnnotationsKey(userId), value);
}

function getProgressForUser(userId: string) {
  ensureSeedLibrary(userId);
  return readJson<Record<string, ReadingProgress>>(userProgressKey(userId), {});
}

function saveProgressForUser(userId: string, value: Record<string, ReadingProgress>) {
  writeJson(userProgressKey(userId), value);
}

function updateBook(userId: string, bookId: string, updater: (book: StoredBookRecord) => StoredBookRecord) {
  const books = getBooksForUser(userId);
  const nextBooks = books.map((book) => (book.id === bookId ? updater(book) : book));
  saveBooksForUser(userId, nextBooks);
  return nextBooks.find((book) => book.id === bookId) as StoredBookRecord;
}

async function openFileDatabase() {
  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(FILE_DB_NAME, FILE_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILE_STORE_NAME)) {
        database.createObjectStore(FILE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFileRecord(record: StoredFileRecord) {
  const database = await openFileDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(FILE_STORE_NAME, "readwrite");
      transaction.objectStore(FILE_STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

async function readFileRecord(userId: string, bookId: string) {
  const database = await openFileDatabase();

  try {
    return await new Promise<StoredFileRecord | null>((resolve, reject) => {
      const transaction = database.transaction(FILE_STORE_NAME, "readonly");
      const request = transaction.objectStore(FILE_STORE_NAME).get(`${userId}-${bookId}`);
      request.onsuccess = () => resolve((request.result as StoredFileRecord | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function loadEpubFactory() {
  const module = await import("epubjs");
  const candidate =
    (module as { default?: { default?: unknown } }).default?.default ??
    (module as { default?: unknown }).default ??
    (module as { ["module.exports"]?: unknown })["module.exports"] ??
    module;

  if (typeof candidate !== "function") {
    throw new Error("EPUB parser failed to initialize.");
  }

  return candidate as (input: ArrayBuffer | string) => {
    loaded: {
      metadata: Promise<Record<string, string>>;
      navigation: Promise<{ toc?: Array<{ label?: string; subitems?: Array<{ label?: string }> }> }>;
    };
    coverUrl?: () => Promise<string | null>;
    destroy?: () => void;
  };
}

async function createBookFromUpload(file: File) {
  const uploadedAt = new Date().toISOString();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const palette = pickPalette(file.name);
  const buffer = await file.arrayBuffer();
  const bookId = crypto.randomUUID();

  if (extension === "epub" || file.type === "application/epub+zip") {
    const createBook = await loadEpubFactory();
    const epub = createBook(buffer);

    try {
      const [metadata, navigation, coverUrl] = await Promise.all([
        epub.loaded.metadata.catch(
          () =>
            ({}) as {
              title?: string;
              creator?: string;
              description?: string;
            },
        ),
        epub.loaded.navigation.catch(() => ({ toc: [] })),
        epub.coverUrl?.().catch(() => null) ?? Promise.resolve(null),
      ]);

      const toc: string[] = (navigation.toc ?? [])
        .flatMap((entry: { label?: string; subitems?: Array<{ label?: string }> }) => [
          entry.label ?? "Opening pages",
          ...(entry.subitems?.map((item) => item.label ?? "Section") ?? []),
        ])
        .filter(Boolean)
        .slice(0, 14);

      const title = metadata.title?.trim() || file.name.replace(/\.epub$/iu, "");
      const author = metadata.creator?.trim() || "Unknown author";
      const book: StoredBookRecord = {
        id: bookId,
        title,
        author,
        description:
          metadata.description?.trim() ||
          "Imported EPUB stored in the local preview database and ready for paginated reading.",
        language: "en",
        format: "EPUB",
        readingState: "QUEUED",
        coverUrl: coverUrl || coverDataUrl(title, author, palette.accent),
        accentColor: palette.accent,
        pageCount: null,
        wordCount: null,
        estimatedMinutes: Math.max(18, toc.length * 9),
        openedAt: null,
        uploadedAt,
        fileSize: file.size,
        toc: toc.length ? toc : ["Opening pages"],
        bookmarkCount: 0,
        annotationCount: 0,
        progress: null,
        sourceType: "upload",
        sourceMimeType: file.type || "application/epub+zip",
      };

      return { book, buffer };
    } finally {
      epub.destroy?.();
    }
  }

  if (extension === "txt" || extension === "md" || file.type.startsWith("text/")) {
    const text = new TextDecoder().decode(buffer);
    const wordCount = countWords(text);
    const format = extension === "md" ? "MD" : "TXT";
    const title = file.name.replace(/\.[^/.]+$/u, "");
    const book: StoredBookRecord = {
      id: bookId,
      title,
      author: "Imported locally",
      description: summarizeText(text),
      language: "en",
      format,
      readingState: "QUEUED",
      coverUrl: coverDataUrl(title, "Imported locally", palette.accent),
      accentColor: palette.accent,
      pageCount: null,
      wordCount,
      estimatedMinutes: estimateMinutes(wordCount, 2),
      openedAt: null,
      uploadedAt,
      fileSize: file.size,
      toc: format === "MD" ? parseMarkdownToc(text) : ["Opening pages", "Middle", "Closing pages"],
      bookmarkCount: 0,
      annotationCount: 0,
      progress: null,
      sourceType: "upload",
      sourceMimeType: file.type || (format === "MD" ? "text/markdown" : "text/plain"),
    };

    return { book, buffer, text };
  }

  const title = file.name.replace(/\.[^/.]+$/u, "");
  const book: StoredBookRecord = {
    id: bookId,
    title,
    author: "Imported locally",
    description: "Binary format stored in preview mode. The reader surface will open the file directly.",
    language: "en",
    format: "PDF",
    readingState: "QUEUED",
    coverUrl: coverDataUrl(title, "Imported locally", palette.accent),
    accentColor: palette.accent,
    pageCount: null,
    wordCount: null,
    estimatedMinutes: 28,
    openedAt: null,
    uploadedAt,
    fileSize: file.size,
    toc: ["Document"],
    bookmarkCount: 0,
    annotationCount: 0,
    progress: null,
    sourceType: "upload",
    sourceMimeType: file.type || "application/pdf",
  };

  return { book, buffer };
}

function createDashboard(books: StoredBookRecord[]): DashboardPayload {
  return {
    stats: {
      queuedCount: books.filter((book) => book.readingState === "QUEUED").length,
      readingCount: books.filter((book) => book.readingState === "READING").length,
      finishedCount: books.filter((book) => book.readingState === "FINISHED").length,
    },
    recentBooks: books.slice(0, 4),
  };
}

function upsertProgress(userId: string, bookId: string, progress: ReadingProgress) {
  const progressMap = getProgressForUser(userId);
  progressMap[bookId] = progress;
  saveProgressForUser(userId, progressMap);
}

export const localApi = {
  auth: {
    async register(payload: AuthPayload) {
      const users = listUsers();
      if (users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
      }

      const now = new Date().toISOString();
      const nextUser: LocalUserRecord = {
        id: crypto.randomUUID(),
        email: payload.email,
        password: payload.password,
        name: payload.name?.trim() || payload.email.split("@")[0],
        avatarGradient: null,
        createdAt: now,
      };

      users.push(nextUser);
      saveUsers(users);
      ensureSeedLibrary(nextUser.id);

      return {
        token: tokenForUser(nextUser.id),
        user: toPublicUser(nextUser),
      };
    },

    async login(payload: AuthPayload) {
      const users = listUsers();
      let user = users.find((entry) => entry.email.toLowerCase() === payload.email.toLowerCase());

      if (!user && payload.email.toLowerCase() === DEMO_EMAIL && payload.password === DEMO_PASSWORD) {
        user = {
          id: "demo-reader",
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          name: "Demo Reader",
          avatarGradient: null,
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        saveUsers(users);
      }

      if (!user || user.password !== payload.password) {
        throw new Error("Invalid email or password.");
      }

      ensureSeedLibrary(user.id);
      return {
        token: tokenForUser(user.id),
        user: toPublicUser(user),
      };
    },

    async me(token: string) {
      const user = getUserByToken(token);
      return { user: toPublicUser(user) };
    },
  },

  books: {
    async list(token: string) {
      const user = getUserByToken(token);
      return { books: getBooksForUser(user.id) };
    },

    async dashboard(token: string) {
      const user = getUserByToken(token);
      return createDashboard(getBooksForUser(user.id));
    },

    async detail(bookId: string, token: string) {
      const user = getUserByToken(token);
      const book = getBooksForUser(user.id).find((entry) => entry.id === bookId);

      if (!book) {
        throw new Error("Book not found");
      }

      const progressMap = getProgressForUser(user.id);
      const bookmarks = getBookmarksForUser(user.id);
      const annotations = getAnnotationsForUser(user.id);
      const progress = progressMap[bookId] ?? null;

      return {
        book,
        progress,
        bookmarks: bookmarks[bookId] ?? [],
        annotations: annotations[bookId] ?? [],
      };
    },

    async upload(file: File, token: string, onProgress?: (value: number) => void) {
      const user = getUserByToken(token);
      onProgress?.(0.08);
      const created = await createBookFromUpload(file);
      onProgress?.(0.62);

      const books = getBooksForUser(user.id);
      saveBooksForUser(user.id, [created.book, ...books]);
      await saveFileRecord({
        id: `${user.id}-${created.book.id}`,
        userId: user.id,
        bookId: created.book.id,
        mimeType: created.book.sourceMimeType || file.type || "application/octet-stream",
        fileName: file.name,
        buffer: created.buffer,
        text: created.text,
      });
      onProgress?.(1);

      return { book: created.book };
    },

    async downloadFile(bookId: string, token: string) {
      const user = getUserByToken(token);
      const file = await readFileRecord(user.id, bookId);

      if (!file) {
        throw new Error("Unable to load the book file");
      }

      if (file.text != null) {
        return new Blob([file.text], { type: file.mimeType });
      }

      if (file.buffer) {
        return new Blob([file.buffer], { type: file.mimeType });
      }

      throw new Error("Unable to load the book file");
    },

    async updateState(bookId: string, token: string, readingState: ReadingState) {
      const user = getUserByToken(token);
      updateBook(user.id, bookId, (book) => ({ ...book, readingState }));
      return { ok: true };
    },

    async bookmarks(bookId: string, token: string) {
      const user = getUserByToken(token);
      const bookmarks = getBookmarksForUser(user.id);
      return { bookmarks: bookmarks[bookId] ?? [] };
    },

    async createBookmark(
      bookId: string,
      token: string,
      payload: { location: string; label: string; chapter?: string; progress?: number },
    ) {
      const user = getUserByToken(token);
      const bookmark: Bookmark = {
        id: crypto.randomUUID(),
        location: payload.location,
        label: payload.label,
        chapter: payload.chapter ?? null,
        progress: payload.progress ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const bookmarks = getBookmarksForUser(user.id);
      bookmarks[bookId] = [bookmark, ...(bookmarks[bookId] ?? [])];
      saveBookmarksForUser(user.id, bookmarks);

      updateBook(user.id, bookId, (book) => ({
        ...book,
        bookmarkCount: bookmarks[bookId].length,
      }));

      return { bookmark };
    },

    async deleteBookmark(bookId: string, bookmarkId: string, token: string) {
      const user = getUserByToken(token);
      const bookmarks = getBookmarksForUser(user.id);
      bookmarks[bookId] = (bookmarks[bookId] ?? []).filter((bookmark) => bookmark.id !== bookmarkId);
      saveBookmarksForUser(user.id, bookmarks);

      updateBook(user.id, bookId, (book) => ({
        ...book,
        bookmarkCount: bookmarks[bookId].length,
      }));

      return { ok: true };
    },

    async annotations(bookId: string, token: string) {
      const user = getUserByToken(token);
      const annotations = getAnnotationsForUser(user.id);
      return { annotations: annotations[bookId] ?? [] };
    },

    async createAnnotation(
      bookId: string,
      token: string,
      payload: {
        location: string;
        quote?: string;
        note?: string;
        color?: string;
        tone?: "HIGHLIGHT" | "NOTE";
      },
    ) {
      const user = getUserByToken(token);
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        location: payload.location,
        quote: payload.quote ?? null,
        note: payload.note ?? null,
        color: payload.color ?? null,
        tone: payload.tone ?? "NOTE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const annotations = getAnnotationsForUser(user.id);
      annotations[bookId] = [annotation, ...(annotations[bookId] ?? [])];
      saveAnnotationsForUser(user.id, annotations);

      updateBook(user.id, bookId, (book) => ({
        ...book,
        annotationCount: annotations[bookId].length,
      }));

      return { annotation };
    },

    async deleteAnnotation(bookId: string, annotationId: string, token: string) {
      const user = getUserByToken(token);
      const annotations = getAnnotationsForUser(user.id);
      annotations[bookId] = (annotations[bookId] ?? []).filter((entry) => entry.id !== annotationId);
      saveAnnotationsForUser(user.id, annotations);

      updateBook(user.id, bookId, (book) => ({
        ...book,
        annotationCount: annotations[bookId].length,
      }));

      return { ok: true };
    },

    async progress(bookId: string, token: string) {
      const user = getUserByToken(token);
      const progressMap = getProgressForUser(user.id);
      return { progress: progressMap[bookId] ?? null };
    },

    async saveProgress(
      bookId: string,
      token: string,
      payload: {
        location: string;
        percent: number;
        chapter?: string;
        device?: string;
        readingState?: ReadingState;
      },
    ) {
      const user = getUserByToken(token);
      const progress: ReadingProgress = {
        id: `progress-${bookId}`,
        location: payload.location,
        percent: payload.percent,
        chapter: payload.chapter ?? null,
        device: payload.device ?? "web",
        updatedAt: new Date().toISOString(),
      };

      upsertProgress(user.id, bookId, progress);

      updateBook(user.id, bookId, (book) => ({
        ...book,
        progress,
        openedAt: new Date().toISOString(),
        readingState:
          payload.readingState ??
          (payload.percent >= 0.98 ? "FINISHED" : payload.percent > 0 ? "READING" : book.readingState),
      }));

      return { progress };
    },
  },
};
