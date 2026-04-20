import {
  annotationCreateSchema,
  annotationUpdateSchema,
  bookmarkCreateSchema,
  bookmarkUpdateSchema,
  progressUpsertSchema,
} from "@glassleaf/contracts";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import {
  mapAnnotation,
  mapBook,
  mapBookmark,
  mapReadingProgress,
} from "../lib/mappers.js";
import { prisma } from "../lib/prisma.js";

const bookIdParamsSchema = z.object({
  bookId: z.string().trim().min(1),
});

const bookmarkParamsSchema = bookIdParamsSchema.extend({
  bookmarkId: z.string().trim().min(1),
});

const annotationParamsSchema = bookIdParamsSchema.extend({
  annotationId: z.string().trim().min(1),
});

const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const readerRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/books/:bookId/state",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await ensureBookAccess(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const [progress, bookmarks, annotations] = await Promise.all([
        prisma.readingProgress.findUnique({
          where: {
            userId_bookId: {
              userId: request.user.sub,
              bookId,
            },
          },
        }),
        prisma.bookmark.findMany({
          where: {
            userId: request.user.sub,
            bookId,
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
        prisma.annotation.findMany({
          where: {
            userId: request.user.sub,
            bookId,
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
      ]);

      return {
        book: mapBook(book),
        progress: progress ? mapReadingProgress(progress) : null,
        bookmarks: bookmarks.map(mapBookmark),
        annotations: annotations.map(mapAnnotation),
      };
    },
  );

  app.get(
    "/books/:bookId/bookmarks",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await ensureBookAccess(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const bookmarks = await prisma.bookmark.findMany({
        where: {
          userId: request.user.sub,
          bookId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return {
        items: bookmarks.map(mapBookmark),
      };
    },
  );

  app.post(
    "/books/:bookId/bookmarks",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await ensureBookAccess(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const body = bookmarkCreateSchema.parse(request.body);
      const bookmark = await prisma.bookmark.create({
        data: {
          userId: request.user.sub,
          bookId,
          label: body.label ?? null,
          note: body.note ?? null,
          locator: body.locator,
          locatorType: body.locatorType,
          progression: body.progression ?? null,
          page: body.page ?? null,
          chapter: body.chapter ?? null,
          snippet: body.snippet ?? null,
        },
      });

      return reply.code(201).send({
        bookmark: mapBookmark(bookmark),
      });
    },
  );

  app.patch(
    "/books/:bookId/bookmarks/:bookmarkId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId, bookmarkId } = bookmarkParamsSchema.parse(request.params);
      const body = bookmarkUpdateSchema.parse(request.body);
      const bookmark = await prisma.bookmark.findFirst({
        where: {
          id: bookmarkId,
          bookId,
          userId: request.user.sub,
        },
      });

      if (!bookmark) {
        return reply.code(404).send({
          message: "Bookmark not found.",
        });
      }

      const updated = await prisma.bookmark.update({
        where: {
          id: bookmark.id,
        },
        data: {
          label: body.label ?? undefined,
          note: body.note ?? undefined,
          locator: body.locator ?? undefined,
          locatorType: body.locatorType ?? undefined,
          progression: body.progression ?? undefined,
          page: body.page ?? undefined,
          chapter: body.chapter ?? undefined,
          snippet: body.snippet ?? undefined,
        },
      });

      return {
        bookmark: mapBookmark(updated),
      };
    },
  );

  app.delete(
    "/books/:bookId/bookmarks/:bookmarkId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId, bookmarkId } = bookmarkParamsSchema.parse(request.params);

      await prisma.bookmark.deleteMany({
        where: {
          id: bookmarkId,
          bookId,
          userId: request.user.sub,
        },
      });

      return reply.code(204).send();
    },
  );

  app.get(
    "/books/:bookId/annotations",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await ensureBookAccess(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const annotations = await prisma.annotation.findMany({
        where: {
          userId: request.user.sub,
          bookId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return {
        items: annotations.map(mapAnnotation),
      };
    },
  );

  app.post(
    "/books/:bookId/annotations",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await ensureBookAccess(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const body = annotationCreateSchema.parse(request.body);
      const annotation = await prisma.annotation.create({
        data: {
          userId: request.user.sub,
          bookId,
          quote: body.quote ?? null,
          note: body.note ?? null,
          color: body.color ?? null,
          locator: body.locator,
          locatorType: body.locatorType,
          progression: body.progression ?? null,
          page: body.page ?? null,
          chapter: body.chapter ?? null,
          snippet: body.snippet ?? null,
        },
      });

      return reply.code(201).send({
        annotation: mapAnnotation(annotation),
      });
    },
  );

  app.patch(
    "/books/:bookId/annotations/:annotationId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId, annotationId } = annotationParamsSchema.parse(request.params);
      const body = annotationUpdateSchema.parse(request.body);
      const annotation = await prisma.annotation.findFirst({
        where: {
          id: annotationId,
          bookId,
          userId: request.user.sub,
        },
      });

      if (!annotation) {
        return reply.code(404).send({
          message: "Annotation not found.",
        });
      }

      const updated = await prisma.annotation.update({
        where: {
          id: annotation.id,
        },
        data: {
          quote: body.quote ?? undefined,
          note: body.note ?? undefined,
          color: body.color ?? undefined,
          locator: body.locator ?? undefined,
          locatorType: body.locatorType ?? undefined,
          progression: body.progression ?? undefined,
          page: body.page ?? undefined,
          chapter: body.chapter ?? undefined,
          snippet: body.snippet ?? undefined,
        },
      });

      return {
        annotation: mapAnnotation(updated),
      };
    },
  );

  app.delete(
    "/books/:bookId/annotations/:annotationId",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId, annotationId } = annotationParamsSchema.parse(request.params);

      await prisma.annotation.deleteMany({
        where: {
          id: annotationId,
          bookId,
          userId: request.user.sub,
        },
      });

      return reply.code(204).send();
    },
  );

  app.get(
    "/books/:bookId/progress",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await ensureBookAccess(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const progress = await prisma.readingProgress.findUnique({
        where: {
          userId_bookId: {
            userId: request.user.sub,
            bookId,
          },
        },
      });

      return {
        progress: progress ? mapReadingProgress(progress) : null,
      };
    },
  );

  app.put(
    "/books/:bookId/progress",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { bookId } = bookIdParamsSchema.parse(request.params);
      const book = await ensureBookAccess(request.user.sub, bookId);

      if (!book) {
        return reply.code(404).send({
          message: "Book not found.",
        });
      }

      const body = progressUpsertSchema.parse(request.body);
      const now = new Date();
      const progress = await prisma.readingProgress.upsert({
        where: {
          userId_bookId: {
            userId: request.user.sub,
            bookId,
          },
        },
        create: {
          userId: request.user.sub,
          bookId,
          locator: body.locator,
          locatorType: body.locatorType,
          progression: body.progression ?? null,
          page: body.page ?? null,
          chapter: body.chapter ?? null,
          snippet: body.snippet ?? null,
          completedAt: body.completed ? now : null,
          lastOpenedAt: now,
        },
        update: {
          locator: body.locator,
          locatorType: body.locatorType,
          progression: body.progression ?? null,
          page: body.page ?? null,
          chapter: body.chapter ?? null,
          snippet: body.snippet ?? null,
          completedAt:
            body.completed === undefined ? undefined : body.completed ? now : null,
          lastOpenedAt: now,
        },
      });

      return {
        progress: mapReadingProgress(progress),
      };
    },
  );

  app.get(
    "/library/recent",
    {
      preHandler: app.authenticate,
    },
    async (request) => {
      const query = recentQuerySchema.parse(request.query);
      const progresses = await prisma.readingProgress.findMany({
        where: {
          userId: request.user.sub,
        },
        orderBy: {
          lastOpenedAt: "desc",
        },
        take: query.limit,
        include: {
          book: true,
        },
      });

      return {
        items: progresses.map((progress) => ({
          book: mapBook(progress.book),
          progress: mapReadingProgress(progress),
        })),
      };
    },
  );
};

async function ensureBookAccess(userId: string, bookId: string) {
  return prisma.book.findFirst({
    where: {
      id: bookId,
      ownerId: userId,
    },
  });
}
