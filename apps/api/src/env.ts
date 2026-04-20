import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  DATABASE_URL: z.string().trim().min(1).default("file:./prisma/dev.db"),
  JWT_SECRET: z
    .string()
    .trim()
    .min(24)
    .default("glassleaf-local-dev-secret-change-me"),
  JWT_EXPIRES_IN: z.string().trim().min(2).default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(200),
  STORAGE_ROOT: z.string().trim().min(1).default("./storage"),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  ACCESS_TOKEN_TTL_SECONDS: parseDurationToSeconds(parsed.JWT_EXPIRES_IN),
  MAX_UPLOAD_SIZE_BYTES: Math.floor(parsed.MAX_UPLOAD_SIZE_MB * 1024 * 1024),
  STORAGE_ROOT_ABSOLUTE: resolve(process.cwd(), parsed.STORAGE_ROOT),
} as const;

function parseDurationToSeconds(raw: string): number {
  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 15 * 60;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 60 * 60 : 60 * 60 * 24;

  return value * multiplier;
}
