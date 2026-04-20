import { z } from "zod";

export const bookFormats = ["EPUB", "PDF", "TXT", "MD"] as const;
export const bookFormatSchema = z.enum(bookFormats);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  format: bookFormatSchema.optional(),
  sort: z.enum(["recent", "created", "title"]).default("recent"),
});

export const readerLocatorSchema = z.object({
  locator: z.string().trim().min(1).max(500),
  locatorType: z.string().trim().min(1).max(64),
  progression: z.number().min(0).max(100).optional(),
  page: z.number().int().min(0).optional(),
  chapter: z.string().trim().max(255).optional(),
  snippet: z.string().trim().max(1_500).optional(),
});

export const authRegisterSchema = z.object({
  email: z.email().trim().max(320),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const authLoginSchema = z.object({
  email: z.email().trim().max(320),
  password: z.string().min(8).max(72),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(24).max(512),
});

export const bookMetadataInputSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  subtitle: z.string().trim().max(255).optional(),
  description: z.string().trim().max(8_000).optional(),
  authors: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  language: z.string().trim().max(32).optional(),
  publisher: z.string().trim().max(120).optional(),
  publishedAt: z.string().trim().max(40).optional(),
  identifier: z.string().trim().max(255).optional(),
  isbn: z.string().trim().max(40).optional(),
  subject: z.string().trim().max(255).optional(),
  series: z.string().trim().max(120).optional(),
  metadataJson: z.record(z.string(), z.unknown()).optional(),
});

export const bookmarkCreateSchema = readerLocatorSchema.extend({
  label: z.string().trim().max(120).optional(),
  note: z.string().trim().max(2_000).optional(),
});

export const bookmarkUpdateSchema = bookmarkCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one bookmark field is required.",
);

export const annotationCreateSchema = readerLocatorSchema.extend({
  quote: z.string().trim().max(4_000).optional(),
  note: z.string().trim().max(4_000).optional(),
  color: z.string().trim().max(32).optional(),
});

export const annotationUpdateSchema = annotationCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one annotation field is required.",
);

export const progressUpsertSchema = readerLocatorSchema.extend({
  completed: z.boolean().optional(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresInSeconds: z.number().int().positive(),
});

export const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  authors: z.array(z.string()),
  format: bookFormatSchema,
  language: z.string().nullable(),
  publisher: z.string().nullable(),
  publishedAt: z.string().nullable(),
  identifier: z.string().nullable(),
  isbn: z.string().nullable(),
  subject: z.string().nullable(),
  series: z.string().nullable(),
  fileName: z.string(),
  originalFileName: z.string(),
  mimeType: z.string(),
  extension: z.string(),
  fileSize: z.number().int().nonnegative(),
  checksum: z.string(),
  pageCount: z.number().int().nonnegative().nullable(),
  wordCount: z.number().int().nonnegative().nullable(),
  chapterCount: z.number().int().nonnegative().nullable(),
  metadataSource: z.string(),
  metadataJson: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const bookmarkSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  note: z.string().nullable(),
  locator: z.string(),
  locatorType: z.string(),
  progression: z.number().nullable(),
  page: z.number().int().nullable(),
  chapter: z.string().nullable(),
  snippet: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const annotationSchema = z.object({
  id: z.string(),
  quote: z.string().nullable(),
  note: z.string().nullable(),
  color: z.string().nullable(),
  locator: z.string(),
  locatorType: z.string(),
  progression: z.number().nullable(),
  page: z.number().int().nullable(),
  chapter: z.string().nullable(),
  snippet: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const readingProgressSchema = z.object({
  id: z.string(),
  locator: z.string(),
  locatorType: z.string(),
  progression: z.number().nullable(),
  page: z.number().int().nullable(),
  chapter: z.string().nullable(),
  snippet: z.string().nullable(),
  completedAt: z.string().nullable(),
  lastOpenedAt: z.string(),
  updatedAt: z.string(),
});

export const paginatedBooksSchema = z.object({
  items: z.array(bookSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const recentReadingItemSchema = z.object({
  book: bookSchema,
  progress: readingProgressSchema,
});

export type BookFormat = z.infer<typeof bookFormatSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ReaderLocator = z.infer<typeof readerLocatorSchema>;
export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type BookMetadataInput = z.infer<typeof bookMetadataInputSchema>;
export type BookmarkCreateInput = z.infer<typeof bookmarkCreateSchema>;
export type BookmarkUpdateInput = z.infer<typeof bookmarkUpdateSchema>;
export type AnnotationCreateInput = z.infer<typeof annotationCreateSchema>;
export type AnnotationUpdateInput = z.infer<typeof annotationUpdateSchema>;
export type ProgressUpsertInput = z.infer<typeof progressUpsertSchema>;
export type ApiUser = z.infer<typeof userSchema>;
export type ApiAuthTokens = z.infer<typeof authTokensSchema>;
export type ApiBook = z.infer<typeof bookSchema>;
export type ApiBookmark = z.infer<typeof bookmarkSchema>;
export type ApiAnnotation = z.infer<typeof annotationSchema>;
export type ApiReadingProgress = z.infer<typeof readingProgressSchema>;
