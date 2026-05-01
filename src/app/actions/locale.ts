"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { IQM_LOCALE_COOKIE, isAppLocale } from "@/lib/i18n/constants";

export async function setLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  if (!isAppLocale(raw)) return;
  const jar = await cookies();
  jar.set(IQM_LOCALE_COOKIE, raw, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
