import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyUploadToken } from "@/lib/upload-signature";
import { MAX_AVATAR_FILE_BYTES } from "@/lib/uploads/image-limits";

function canUpload(role: string | undefined): boolean {
  return role === "TEACHER" || role === "ADMIN" || role === "SUPER_ADMIN";
}

function isAllowedImageFile(file: File): boolean {
  const t = (file.type || "").toLowerCase().trim();
  if (t.startsWith("image/")) return true;
  if (t === "application/octet-stream" && /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif|svg)$/i.test(file.name)) return true;
  return false;
}

function extFromImageFile(file: File): string {
  const t = (file.type || "").toLowerCase();
  const fromName = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("webp")) return "webp";
  if (t.includes("gif")) return "gif";
  if (t.includes("svg")) return "svg";
  if (t.includes("bmp")) return "bmp";
  if (t.includes("ico")) return "ico";
  if (t.includes("heic") || t.includes("heif")) return "heic";
  if (t.includes("avif")) return "avif";
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return "img";
}

async function postImpl(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Kirish talab qilinadi." }, { status: 401 });
  if (!canUpload(session.user.role)) return NextResponse.json({ error: "Ruxsat yo'q." }, { status: 403 });

  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fayl topilmadi." }, { status: 400 });
  if (file.size > MAX_AVATAR_FILE_BYTES) {
    return NextResponse.json(
      { error: `Fayl hajmi ${Math.round(MAX_AVATAR_FILE_BYTES / (1024 * 1024))} MB dan oshmasligi kerak.` },
      { status: 400 },
    );
  }
  if (!isAllowedImageFile(file)) {
    return NextResponse.json({ error: "Faqat rasm fayllari (image/*) ruxsat etiladi." }, { status: 400 });
  }

  const claims = verifyUploadToken(token);
  if (!claims || claims.uid !== session.user.id) {
    return NextResponse.json({ error: "Upload token yaroqsiz yoki eskirgan." }, { status: 403 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage sozlanmagan." }, { status: 503 });
  }

  const ext = extFromImageFile(file);
  const path = `avatars/${session.user.id}/${Date.now()}.${ext}`;
  const uploaded = await put(path, file, { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN });
  return NextResponse.json({ url: uploaded.url });
}

export const POST = wrapRouteHandlerWithSentry(postImpl, {
  method: "POST",
  parameterizedRoute: "/api/profile/avatar/upload",
});
