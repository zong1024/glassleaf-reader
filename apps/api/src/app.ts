import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { Prisma } from "@prisma/client";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import { ZodError } from "zod";

import { env } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { booksRoutes } from "./routes/books.js";
import { readerRoutes } from "./routes/reader.js";
import type { AuthJwtPayload } from "./lib/security.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthJwtPayload;
    user: AuthJwtPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    bodyLimit: env.MAX_UPLOAD_SIZE_BYTES,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: env.MAX_UPLOAD_SIZE_BYTES,
    },
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.decorate("authenticate", async (request, reply) => {
    await request.jwtVerify();
  });

  app.get("/health", async () => ({
    ok: true,
    service: "glassleaf-api",
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(booksRoutes, { prefix: "/v1/books" });
  await app.register(readerRoutes, { prefix: "/v1" });

  app.setErrorHandler((error, _request, reply) => {
    const normalizedError =
      error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");

    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: "Invalid request payload.",
        issues: error.flatten(),
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return reply.code(409).send({
        message: "The requested record conflicts with an existing one.",
      });
    }

    if ((error as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") {
      return reply.code(413).send({
        message: `File is too large. Max size is ${env.MAX_UPLOAD_SIZE_MB} MB.`,
      });
    }

    requestAwareLog(app, normalizedError);

    return reply.code((error as { statusCode?: number }).statusCode ?? 500).send({
      message: normalizedError.message || "Unexpected server error.",
    });
  });

  return app;
}

function requestAwareLog(app: FastifyInstance, error: Error): void {
  app.log.error(error);
}
