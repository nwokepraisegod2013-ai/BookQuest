import { createReadStream } from "fs";
import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PRIVATE_STORAGE_DIR = path.join(process.cwd(), "storage", "private");

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function saveUploadedFile(
  file: File,
  folder: "covers" | "pdfs" | "samples"
): Promise<string> {
  if (folder === "covers" && !file.type.startsWith("image/")) {
    throw new Error("Cover must be an image");
  }
  if ((folder === "pdfs" || folder === "samples") && file.type !== "application/pdf") {
    throw new Error("File must be a PDF");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (folder === "covers" && buffer.length > MAX_COVER_BYTES) {
    throw new Error("Cover image too large (max 5MB)");
  }
  if ((folder === "pdfs" || folder === "samples") && buffer.length > MAX_PDF_BYTES) {
    throw new Error("PDF too large (max 50MB)");
  }

  const ext = path.extname(file.name) || (folder === "covers" ? ".jpg" : ".pdf");
  const filename = `${nanoid()}${ext}`;

  if (folder === "covers") {
    const dir = path.join(PUBLIC_UPLOAD_DIR, folder);
    await mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, filename);
    await writeFile(fullPath, buffer);
    return `/uploads/${folder}/${filename}`;
  }

  const sub = folder === "samples" ? "samples" : "pdfs";
  const dir = path.join(PRIVATE_STORAGE_DIR, sub);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, buffer);
  return `private:${sub}/${filename}`;
}

export function resolvePrivateFileKey(key: string): string {
  if (key.startsWith("private:")) {
    const relative = key.replace(/^private:/, "");
    return path.join(PRIVATE_STORAGE_DIR, relative);
  }
  if (key.startsWith("/uploads/pdfs/")) {
    return path.join(PRIVATE_STORAGE_DIR, "pdfs", path.basename(key));
  }
  if (key.startsWith("/uploads/samples/")) {
    return path.join(PRIVATE_STORAGE_DIR, "samples", path.basename(key));
  }
  return key;
}

export async function privateFileExists(key: string): Promise<boolean> {
  try {
    await access(resolvePrivateFileKey(key));
    return true;
  } catch {
    return false;
  }
}

export function openPrivateFileStream(key: string) {
  return createReadStream(resolvePrivateFileKey(key));
}

/** @deprecated Use resolvePrivateFileKey */
export function getPdfAbsolutePath(publicKey: string): string {
  return resolvePrivateFileKey(publicKey);
}
