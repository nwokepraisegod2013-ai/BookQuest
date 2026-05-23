import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveUploadedFile(
  file: File,
  folder: "covers" | "pdfs" | "samples"
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = path.extname(file.name) || (folder === "covers" ? ".jpg" : ".pdf");
  const filename = `${nanoid()}${ext}`;
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, buffer);
  return `/uploads/${folder}/${filename}`;
}

export function getPdfAbsolutePath(publicKey: string): string {
  if (publicKey.startsWith("/uploads/")) {
    return path.join(process.cwd(), "public", publicKey.replace(/^\//, ""));
  }
  return publicKey;
}
