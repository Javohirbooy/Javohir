import { put } from "@vercel/blob";

/** DOCX / import rasmlarini Vercel Blob ga yuklaydi (production uchun). */
export async function uploadPublicImageBuffer(
  path: string,
  buf: Buffer,
  contentType: string,
): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;
  const uploaded = await put(path, buf, { access: "public", token, contentType });
  return uploaded.url;
}
