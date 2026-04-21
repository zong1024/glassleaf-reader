import type {
  Annotation,
  Book,
  Bookmark,
  ReadingProgress,
  User,
} from "@prisma/client";

export function mapUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function mapBook(book: Book) {
  const metadataJson = parseJsonObject(book.metadataJson);
  const coverUrl =
    book.format === "EPUB" && typeof metadataJson?.coverHref === "string"
      ? `/v1/books/${book.id}/cover`
      : null;

  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle ?? null,
    description: book.description ?? null,
    coverUrl,
    authors: parseJsonArray(book.authorsJson),
    format: book.format,
    language: book.language ?? null,
    publisher: book.publisher ?? null,
    publishedAt: book.publishedAt ?? null,
    identifier: book.identifier ?? null,
    isbn: book.isbn ?? null,
    subject: book.subject ?? null,
    series: book.series ?? null,
    fileName: book.fileName,
    originalFileName: book.originalFileName,
    mimeType: book.mimeType,
    extension: book.extension,
    fileSize: book.fileSize,
    checksum: book.checksum,
    pageCount: book.pageCount ?? null,
    wordCount: book.wordCount ?? null,
    chapterCount: book.chapterCount ?? null,
    metadataSource: book.metadataSource,
    metadataJson,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}

export function mapBookmark(bookmark: Bookmark) {
  return {
    id: bookmark.id,
    label: bookmark.label ?? null,
    note: bookmark.note ?? null,
    locator: bookmark.locator,
    locatorType: bookmark.locatorType,
    progression: bookmark.progression ?? null,
    page: bookmark.page ?? null,
    chapter: bookmark.chapter ?? null,
    snippet: bookmark.snippet ?? null,
    createdAt: bookmark.createdAt.toISOString(),
    updatedAt: bookmark.updatedAt.toISOString(),
  };
}

export function mapAnnotation(annotation: Annotation) {
  return {
    id: annotation.id,
    quote: annotation.quote ?? null,
    note: annotation.note ?? null,
    color: annotation.color ?? null,
    locator: annotation.locator,
    locatorType: annotation.locatorType,
    progression: annotation.progression ?? null,
    page: annotation.page ?? null,
    chapter: annotation.chapter ?? null,
    snippet: annotation.snippet ?? null,
    createdAt: annotation.createdAt.toISOString(),
    updatedAt: annotation.updatedAt.toISOString(),
  };
}

export function mapReadingProgress(progress: ReadingProgress) {
  return {
    id: progress.id,
    locator: progress.locator,
    locatorType: progress.locatorType,
    progression: progress.progression ?? null,
    page: progress.page ?? null,
    chapter: progress.chapter ?? null,
    snippet: progress.snippet ?? null,
    completedAt: progress.completedAt?.toISOString() ?? null,
    lastOpenedAt: progress.lastOpenedAt.toISOString(),
    updatedAt: progress.updatedAt.toISOString(),
  };
}

function parseJsonArray(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as unknown;
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
