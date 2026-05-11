/**
 * `next-auth/react` dagi `signIn("credentials")` ba’zi JSON javoblarda `new URL(data.url)`
 * bilan qulay ishlamaydi. Bu yerda fetch + xavfsiz URL tahlili.
 */
import { getCsrfToken } from "next-auth/react";

export type CredentialsSignInResult = { ok: true } | { ok: false; reason: string };

export async function signInWithCredentials(identifier: string, password: string): Promise<CredentialsSignInResult> {
  const csrfToken = await getCsrfToken();
  if (!csrfToken?.trim()) {
    return { ok: false, reason: "csrf" };
  }
  const callbackUrl = typeof window !== "undefined" ? window.location.href : "/";
  const res = await fetch(`${window.location.origin}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl,
      identifier,
      password,
    }),
    /** Standart `follow` ba’zan yakuniy HTML sahifa qaytaradi — JSON yo‘q deb chiqadi. */
    redirect: "manual",
  });

  /** JSON rejimi (Auth.js): 200 + `{ url }` */
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    let data: { url?: string };
    try {
      data = (await res.json()) as { url?: string };
    } catch {
      return { ok: false, reason: "json_parse" };
    }
    let authErr: string | undefined;
    try {
      const raw = data.url ?? `${window.location.origin}/`;
      const u =
        raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : new URL(raw, window.location.origin);
      authErr = u.searchParams.get("error") ?? undefined;
    } catch {
      authErr = undefined;
    }
    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }
    if (authErr) {
      return { ok: false, reason: authErr };
    }
    return { ok: true };
  }

  /** Redirect rejimi (Edge/proksi ba’zan `X-Auth-Return-Redirect` ni yo‘qotadi): 302 + Location */
  if (res.status === 302 || res.status === 301 || res.status === 307 || res.status === 308) {
    const loc = res.headers.get("Location");
    if (!loc) {
      return { ok: false, reason: "redirect_no_location" };
    }
    let authErr: string | undefined;
    try {
      const u = new URL(loc, window.location.origin);
      authErr = u.searchParams.get("error") ?? undefined;
    } catch {
      authErr = undefined;
    }
    if (authErr) {
      return { ok: false, reason: authErr };
    }
    return { ok: true };
  }

  return { ok: false, reason: `unexpected_${res.status}` };
}
