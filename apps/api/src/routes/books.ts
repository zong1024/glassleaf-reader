import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import {
  bookMetadataInputSchema,
  paginationQuerySchema,
} from "@glassleaf/contracts";
import { Prisma } from "@prisma/client";
import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { z } from "zod";

import { mapBook } from "../lib/mappers.js";
import {
  detectBookFormat,
  extractEpubCover,
  extractBookMetadata,
  mergeMetadata,
  parseLooseAuthors,
  type ParsedBookMetadata,
} from "../lib/metadata.js";
import { prisma } from "../lib/prisma.js";
import {
  persistUploadedFile,
  removeStoredFile,
  resolveStoragePath,
  storagePathExists,
} from "../lib/storage.js";

const bookIdParamsSchema = z.object({
  bookId: z.string().trim().min(1),
});

export const booksRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const upload = await request.file();

      if (!upload) {
        return reply.code(400).send({
          message: "A book file is required.",
        });
      }

      const stored = await persistUploadedFile(upload, request.user.sub);
      const format = detectBookFormat(stored.extension, stored.mimeType);

      if (!format) {
        await removeStoredFile(stored.relativePath);
        return reply.code(415).send({
          message: "Unsupported book format. Use epub, pdf, txt, or md.",
        });
      }

      try {
        const duplicate = await prisma.book.findUnique({
          where: {
            ownerId_checksum: {
              ownerId: request.user.sub,
              checksum: stored.checksum,
            },
          },
        });

        if (duplicate) {
          await removeStoredFile(stored.relativePath);
          return reply.code(409).send({
            message: "This file already exists in the current user's library.",
            book: mapBook(duplicate),
          });
        }

        const parsedMetadata = await extractBookMetadata({
          format,
          absolutePath: stored.absolutePath,
          originalFileName: stored.originalFileName,
          checksum: stored.checksum,
        });
        const overrideMetadata = parseMultipartMetadata(upload.fields);
        const metadata = finalizeMetadata(parsedMetadata, overrideMetadata, stored.originalFileName);

        const created = await prisma.book.create({
          data: {
            ownerId: request.user.sub,
            title: metadata.title,
            subtitle: metadata.subtitle ?? null,
            description: metadata.description ?? null,
            authorsJson: JSON.stringify(metadata.authors),
            format,
            language: metadata.language ?? null,
            publisher: metadata.publisher ?? null,
            publishedAt: metadata.publishedAt ?? null,
            identifier: metadata.identifier ?? null,
            isbn: metadata.isbn ?? null,
            subject: metadata.subject ?? null,
            series: metadata.series ?? null,
            fileName: stored.fileName,
            originalFileName: stored.originalFileName,
            mimeType: stored.mimeType,
            extension: stored.extension,
            fileSize: stored.fileSize,
            checksum: stored.checksum,
            storagePath: stored.relativePath,
            pageCount: metadata.pageCount ?? null,
            wordCount: metadata.wordCount ?? null,
            chapterCount: metadata.chapterCount ?? null,
            metadataSource: metadata.metadataSource,
            metadataJson: metadata.metadataJson ? JSON.stringify(metadata.metadataJson) : null,
          },
        });

        return reply.code(201).send({
          book: mapBook(created),
        });
      } catch (error) {
        await removeStoredFile(stored.relativePath);
        throw error;
      }
    },
  );

  app.get(
    "/",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const query = paginationQuerySchema.parse(request.query);
      const where: Prisma.BookWhereInput = {
        ownerId: request.user.sub,
      };

      if (query.format) {
        where.format = query.format;
      }

      if (query.search) {
        where.OR = [
          {
            title: {
              contains: query.search,
            },
          },
          {
            description: {
              contains: query.search,
            },
          },
          {
            originalFileName: {
              contains: query.search,
            },
          },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.book.findMany({
          where,
          orderBy: resolveBookOrderBy(query.sort),
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.book.count({ where }),
      ]);

      return {
        items: items.map(mapBook),
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      };
    },
  );

  app.get(
    "/:bookId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await findUserBook(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const [progress, bookmarkCount, annotationCount] = await Promise.all([
        prisma.readingProgress.findUnique({
          where: {
            userId_bookId: {
              userId: request.user.sub,
              bookId,
            },
          },
        }),
        prisma.bookmark.count({
          where: {
            userId: request.user.sub,
            bookId,
          },
        }),
        prisma.annotation.count({
          where: {
            userId: request.user.sub,
            bookId,
          },
        }),
      ]);

      return {
        book: mapBook(book),
        stateSummary: {
          hasProgress: Boolean(progress),
          bookmarkCount,
          annotationCount,
        },
      };
    },
  );

  app.patch(
    "/:bookId/metadata",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await findUserBook(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const body = bookMetadataInputSchema.parse(request.body);
      const updated = await prisma.book.update({
        where: { id: bookId },
        data: {
          title: body.title ?? undefined,
          subtitle: body.subtitle ?? undefined,
          description: body.description ?? undefined,
          authorsJson: body.authors ? JSON.stringify(body.authors) : undefined,
          language: body.language ?? undefined,
          publisher: body.publisher ?? undefined,
          publishedAt: body.publishedAt ?? undefined,
          identifier: body.identifier ?? undefined,
          isbn: body.isbn ?? undefined,
          subject: body.subject ?? undefined,
          series: body.series ?? undefined,
          metadataJson:
            body.metadataJson !== undefined ? JSON.stringify(body.metadataJson) : undefined,
        },
      });

      return {
        book: mapBook(updated),
      };
    },
  );

  app.get(
    "/:bookId/cover",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await findUserBook(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      if (book.format !== "EPUB") {
        return reply.code(404).send({
          message: "Cover is unavailable for this format.",
        });
      }

      const exists = await storagePathExists(book.storagePath);
      if (!exists) {
        return reply.code(404).send({
          message: "Stored file is missing.",
        });
      }

      const absolutePath = resolveStoragePath(book.storagePath);
      const cover = await extractEpubCover(absolutePath);

      if (!cover) {
        return reply.code(404).send({
          message: "Cover image not found in EPUB.",
        });
      }

      reply.header("Content-Type", cover.mimeType);
      reply.header("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(cover.fileName)}`);
      reply.header("Cache-Control", "private, max-age=3600");

      return reply.send(cover.buffer);
    },
  );

  app.get(
    "/:bookId/file",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await findUserBook(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const absolutePath = resolveStoragePath(book.storagePath);
      const exists = await storagePathExists(book.storagePath);

      if (!exists) {
        return reply.code(404).send({
          message: "Stored file is missing.",
        });
      }

      const fileStats = await stat(absolutePath);
      const downloadName = encodeURIComponent(book.originalFileName || basename(absolutePath));
      reply.header("Accept-Ranges", "bytes");
      reply.header("Content-Type", book.mimeType);
      reply.header("Content-Disposition", `inline; filename*=UTF-8''${downloadName}`);
      reply.header("Cache-Control", "private, max-age=0, must-revalidate");

      return sendFileWithRangeSupport(request, reply, absolutePath, fileStats.size);
    },
  );
};

async function findUserBook(userId: string, bookId: string) {
  return prisma.book.findFirst({
    where: {
      id: bookId,
      ownerId: userId,
    },
  });
}

function parseMultipartMetadata(fields: Record<string, unknown>): Partial<ParsedBookMetadata> {
  const rawAuthors = readMultipartField(fields, "authors");
  const rawMetadataJson = readMultipartField(fields, "metadataJson");

  return bookMetadataInputSchema.parse({
    title: readMultipartField(fields, "title"),
    subtitle: readMultipartField(fields, "subtitle"),
    description: readMultipartField(fields, "description"),
    authors: rawAuthors ? parseLooseAuthors(rawAuthors) : undefined,
    language: readMultipartField(fields, "language"),
    publisher: readMultipartField(fields, "publisher"),
    publishedAt: readMultipartField(fields, "publishedAt"),
    identifier: readMultipartField(fields, "identifier"),
    isbn: readMultipartField(fields, "isbn"),
    subject: readMultipartField(fields, "subject"),
    series: readMultipartField(fields, "series"),
    metadataJson: rawMetadataJson ? parseJsonField(rawMetadataJson) : undefined,
  });
}

function finalizeMetadata(
  parsedMetadata: ParsedBookMetadata,
  overrideMetadata: Partial<ParsedBookMetadata>,
  originalFileName: string,
): ParsedBookMetadata {
  const merged = mergeMetadata(parsedMetadata, overrideMetadata);
  return {
    ...merged,
    title: merged.title?.trim() || basename(originalFileName),
    authors: Array.from(new Set(merged.authors.map((author) => author.trim()).filter(Boolean))),
  };
}

function readMultipartField(fields: Record<string, unknown>, name: string): string | undefined {
  const raw = fields[name];
  const first = Array.isArray(raw) ? raw[0] : raw;

  if (typeof first !== "object" || first === null || !("value" in first)) {
    return undefined;
  }

  const value = (first as { value?: unknown }).value;
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseJsonField(input: string): Record<string, unknown> {
  const parsed = JSON.parse(input) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("metadataJson must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

function resolveBookOrderBy(sort: "recent" | "created" | "title"): Prisma.BookOrderByWithRelationInput {
  if (sort === "created") {
    return { createdAt: "desc" };
  }

  if (sort === "title") {
    return { title: "asc" };
  }

  return { updatedAt: "desc" };
}

async function sendFileWithRangeSupport(
  request: FastifyRequest,
  reply: FastifyReply,
  absolutePath: string,
  totalSize: number,
) {
  const rangeHeader = request.headers.range;
  if (!rangeHeader) {
    reply.header("Content-Length", totalSize);
    return reply.send(createReadStream(absolutePath));
  }

  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/i);
  if (!match) {
    return reply.code(416).send({
      message: "Invalid Range header.",
    });
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : totalSize - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= totalSize) {
    return reply.code(416).send({
      message: "Requested range is not satisfiable.",
    });
  }

  reply.code(206);
  reply.header("Content-Range", `bytes ${start}-${end}/${totalSize}`);
  reply.header("Content-Length", end - start + 1);

  return reply.send(createReadStream(absolutePath, { start, end }));
}
