import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyUploadToken } from "@/lib/upload-signature";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function canUpload(role: string | undefined): boolean {
  return role === "TEACHER" || role === "ADMIN";
}

async function postImpl(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Kirish talab qilinadi." }, { status: 401 });
  if (!canUpload(session.user.role)) return NextResponse.json({ error: "Ruxsat yo'q." }, { status: 403 });

  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fayl topilmadi." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fayl hajmi 2MB dan oshmasligi kerak." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Faqat png, jpg, webp fayllar ruxsat etiladi." }, { status: 400 });

  const claims = verifyUploadToken(token);
  if (!claims || claims.uid !== session.user.id) {
    return NextResponse.json({ error: "Upload token yaroqsiz yoki eskirgan." }, { status: 403 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage sozlanmagan." }, { status: 503 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `avatars/${session.user.id}/${Date.now()}.${ext}`;
  const uploaded = await put(path, file, { access: "public", token: process.env.BLOB_READ_WRITE_TOKEN });
  return NextResponse.json({ url: uploaded.url });
}

export const POST = wrapRouteHandlerWithSentry(postImpl, {
  method: "POST",
  parameterizedRoute: "/api/profile/avatar/upload",
});
