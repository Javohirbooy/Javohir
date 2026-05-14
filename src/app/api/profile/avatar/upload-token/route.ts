import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUploadToken } from "@/lib/upload-signature";

function canUpload(role: string | undefined): boolean {
  return role === "TEACHER" || role === "ADMIN" || role === "SUPER_ADMIN";
}

async function postImpl() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Kirish talab qilinadi." }, { status: 401 });
  if (!canUpload(session.user.role)) return NextResponse.json({ error: "Ruxsat yo'q." }, { status: 403 });

  const token = createUploadToken({
    uid: session.user.id,
    purpose: "profile_avatar",
    exp: Date.now() + 5 * 60 * 1000,
  });
  return NextResponse.json({ token });
}

export const POST = wrapRouteHandlerWithSentry(postImpl, {
  method: "POST",
  parameterizedRoute: "/api/profile/avatar/upload-token",
});
