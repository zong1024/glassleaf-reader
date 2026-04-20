import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, mkdir, unlink } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { pipeline } from "node:stream/promises";
import type { MultipartFile } from "@fastify/multipart";
import { extension as mimeExtension, lookup as lookupMimeType } from "mime-types";

import { env } from "../env.js";

export type StoredUpload = {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  originalFileName: string;
  extension: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
};

export async function ensureStorageRoot(): Promise<void> {
  await mkdir(env.STORAGE_ROOT_ABSOLUTE, { recursive: true });
}

export async function persistUploadedFile(
  file: MultipartFile,
  userId: string,
): Promise<StoredUpload> {
  await ensureStorageRoot();

  const originalFileName = sanitizeFileName(file.filename ?? "upload");
  const extension = inferExtension(originalFileName, file.mimetype);
  const fileName = `${randomUUID()}${extension}`;
  const relativePath = normalize(join("books", userId, fileName)).replaceAll("\\", "/");
  const absolutePath = join(env.STORAGE_ROOT_ABSOLUTE, relativePath);

  await mkdir(dirname(absolutePath), { recursive: true });

  const hash = createHash("sha256");
  let fileSize = 0;

  try {
    await pipeline(
      file.file,
      async function* (source) {
        for await (const chunk of source) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          fileSize += buffer.length;
          hash.update(buffer);
          yield buffer;
        }
      },
      createWriteStream(absolutePath),
    );
  } catch (error) {
    await unlink(absolutePath).catch(() => undefined);
    throw error;
  }

  return {
    absolutePath,
    relativePath,
    fileName,
    originalFileName,
    extension,
    mimeType: file.mimetype || lookupMimeType(extension) || "application/octet-stream",
    fileSize,
    checksum: hash.digest("hex"),
  };
}

export async function removeStoredFile(relativePath: string): Promise<void> {
  await unlink(resolveStoragePath(relativePath)).catch(() => undefined);
}

export function resolveStoragePath(relativePath: string): string {
  return join(env.STORAGE_ROOT_ABSOLUTE, relativePath);
}

export async function storagePathExists(relativePath: string): Promise<boolean> {
  try {
    await access(resolveStoragePath(relativePath));
    return true;
  } catch {
    return false;
  }
}

function inferExtension(fileName: string, mimetype?: string): string {
  const fromFileName = extname(fileName).toLowerCase();
  if (fromFileName) {
    return fromFileName;
  }

  const fromMime = mimetype ? mimeExtension(mimetype) : false;
  return fromMime ? `.${fromMime}` : "";
}

function sanitizeFileName(raw: string): string {
  const cleaned = raw.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 180) : "upload";
}
