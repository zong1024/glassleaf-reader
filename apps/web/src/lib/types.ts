export type User = {
  id: string;
  email: string;
  name?: string | null;
  avatarGradient?: string | null;
  createdAt?: string;
};

export type ReadingState = "QUEUED" | "READING" | "FINISHED";
export type BookFormat = "EPUB" | "PDF" | "TXT" | "MD";

export type ReadingProgress = {
  id?: string;
  location: string;
  locatorType?: string;
  percent: number;
  chapter?: string | null;
  page?: number | null;
  device?: string | null;
  updatedAt?: string;
};

export type Bookmark = {
  id: string;
  location: string;
  label: string;
  chapter?: string | null;
  progress?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Annotation = {
  id: string;
  location: string;
  quote?: string | null;
  note?: string | null;
  color?: string | null;
  tone: "HIGHLIGHT" | "NOTE";
  createdAt: string;
  updatedAt: string;
};

export type Book = {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  language?: string | null;
  format: BookFormat;
  readingState: ReadingState;
  coverUrl?: string | null;
  accentColor?: string | null;
  pageCount?: number | null;
  wordCount?: number | null;
  estimatedMinutes?: number | null;
  openedAt?: string | null;
  uploadedAt: string;
  fileSize: number;
  toc: string[];
  bookmarkCount: number;
  annotationCount: number;
  progress: ReadingProgress | null;
};

export type DashboardPayload = {
  stats: {
    queuedCount: number;
    readingCount: number;
    finishedCount: number;
  };
  recentBooks: Book[];
};

export type ReaderLocation = {
  location: string;
  locatorType?: string;
  chapter?: string | null;
  percent: number;
  page?: number | null;
  quote?: string | null;
};

export type ReaderSurfaceHandle = {
  prev: () => void;
  next: () => void;
  goTo: (location: string) => void;
  seek: (percent: number) => void;
};

export type ReaderTheme = "paper" | "sepia" | "night";

export type ReaderPreferences = {
  theme: ReaderTheme;
  fontScale: number;
  lineHeight: number;
};
