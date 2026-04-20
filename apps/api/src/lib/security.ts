import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";

import { env } from "../env.js";

export type AuthJwtPayload = {
  sub: string;
  email: string;
  displayName: string | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function signAccessToken(
  app: FastifyInstance,
  user: { id: string; email: string; displayName: string | null },
): Promise<string> {
  return app.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  );
}
