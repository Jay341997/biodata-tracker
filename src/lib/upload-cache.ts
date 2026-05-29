import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const CACHE_DIR =
  process.env.VERCEL === "1"
    ? "/tmp/biodata-uploads"
    : join(process.cwd(), "data", "uploads");

export type PendingUpload = {
  sourceFileName: string;
  uploadedPdfGzipBase64: string;
  extractedText: string;
  profilePhotoDataUrl: string;
  profilePhotoDataUrls: string[];
};

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

function cachePath(uploadId: string) {
  return join(CACHE_DIR, `${uploadId}.json`);
}

export async function savePendingUpload(data: PendingUpload): Promise<string> {
  await ensureCacheDir();
  const uploadId = randomUUID();
  await writeFile(cachePath(uploadId), JSON.stringify(data), "utf-8");
  return uploadId;
}

export async function getPendingUpload(uploadId: string): Promise<PendingUpload | null> {
  try {
    const raw = await readFile(cachePath(uploadId), "utf-8");
    return JSON.parse(raw) as PendingUpload;
  } catch {
    return null;
  }
}

export async function deletePendingUpload(uploadId: string): Promise<void> {
  try {
    await unlink(cachePath(uploadId));
  } catch {
    // Ignore missing cache entries.
  }
}
