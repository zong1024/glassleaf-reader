import {
  authLoginSchema,
  authRegisterSchema,
  refreshTokenSchema,
} from "@glassleaf/contracts";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { env } from "../env.js";
import { mapUser } from "../lib/mappers.js";
import { prisma } from "../lib/prisma.js";
import {
  addDays,
  createRefreshToken,
  hashOpaqueToken,
  hashPassword,
  normalizeEmail,
  signAccessToken,
  verifyPassword,
} from "../lib/security.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const body = authRegisterSchema.parse(request.body);
    const email = normalizeEmail(body.email);

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return reply.code(409).send({
        message: "This email is already registered.",
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        displayName: body.displayName?.trim() || null,
        passwordHash: await hashPassword(body.password),
      },
    });

    const tokens = await createSession(app, user, request.ip, request.headers["user-agent"]);

    return reply.code(201).send({
      user: mapUser(user),
      tokens,
    });
  });

  app.post("/login", async (request, reply) => {
    const body = authLoginSchema.parse(request.body);
    const email = normalizeEmail(body.email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.code(401).send({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await verifyPassword(body.password, user.passwordHash);

    if (!passwordMatches) {
      return reply.code(401).send({
        message: "Invalid email or password.",
      });
    }

    const tokens = await createSession(app, user, request.ip, request.headers["user-agent"]);

    return {
      user: mapUser(user),
      tokens,
    };
  });

  app.post("/refresh", async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);
    const tokenHash = hashOpaqueToken(body.refreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt <= new Date()) {
      return reply.code(401).send({
        message: "Refresh token is invalid or expired.",
      });
    }

    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date(),
      },
    });

    const tokens = await createSession(
      app,
      tokenRecord.user,
      request.ip,
      request.headers["user-agent"],
    );

    return {
      user: mapUser(tokenRecord.user),
      tokens,
    };
  });

  app.post("/logout", async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);

    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashOpaqueToken(body.refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return reply.code(204).send();
  });

  app.get(
    "/me",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
      });

      if (!user) {
        return reply.code(404).send({
          message: "User not found.",
        });
      }

      return {
        user: mapUser(user),
      };
    },
  );
};

async function createSession(
  app: FastifyInstance,
  user: { id: string; email: string; displayName: string | null },
  ipAddress: string,
  userAgent: string | string[] | undefined,
) {
  const refreshToken = createRefreshToken();
  const accessToken = await signAccessToken(app, user);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt: addDays(new Date(), env.REFRESH_TOKEN_TTL_DAYS),
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent.join(" | ") : userAgent,
    },
  });

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer" as const,
    expiresInSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  };
}
