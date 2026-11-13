import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const validKey = /^[a-f0-9-]+\.(jpg|png|webp)$/i;
const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function uploadDirectory() {
  const configured = process.env.UPLOAD_DIR?.trim();
  return path.resolve(configured || path.join(process.cwd(), "storage", "uploads"));
}

function safePath(key: string) {
  if (!validKey.test(key)) throw new Error("Invalid media key.");
  return path.join(uploadDirectory(), key);
}

export async function saveUploadedImage(key: string, bytes: ArrayBuffer) {
  const directory = uploadDirectory();
  await mkdir(directory, { recursive: true, mode: 0o750 });
  await writeFile(safePath(key), Buffer.from(bytes), { mode: 0o640 });
}

export async function readUploadedImage(key: string) {
  const filePath = safePath(key);
  const body = await readFile(filePath);
  return {
    body,
    contentType: mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
  };
}
