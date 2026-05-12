/**
 * `next-auth/react` dagi `signIn("credentials")` ba’zi JSON javoblarda `new URL(data.url)`
 * bilan qulay ishlamaydi. Bu yerda fetch + xavfsiz URL tahlili.
 */
import { getCsrfToken } from "next-auth/react";

export type CredentialsSignInResult =
  | { ok: true }
  | { ok: false; reason: string; credentialCode?: string };

function parseAuthRedirect(urlStr: string): { error?: string; code?: string } {
  try {
    const u =
      urlStr.startsWith("http://") || urlStr.startsWith("https://")
        ? new URL(urlStr)
        : new URL(urlStr, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return {
      error: u.searchParams.get("error") ?? undefined,
      code: u.searchParams.get("code") ?? undefined,
    };
  } catch {
    return {};
  }
}

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
    let authCode: string | undefined;
    try {
      const raw = data.url ?? `${window.location.origin}/`;
      const parsed = parseAuthRedirect(raw);
      authErr = parsed.error;
      authCode = parsed.code;
    } catch {
      authErr = undefined;
    }
    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }
    if (authErr) {
      return { ok: false, reason: authErr, credentialCode: authCode };
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
    let authCode: string | undefined;
    try {
      const u = new URL(loc, window.location.origin);
      authErr = u.searchParams.get("error") ?? undefined;
      authCode = u.searchParams.get("code") ?? undefined;
    } catch {
      authErr = undefined;
    }
    if (authErr) {
      return { ok: false, reason: authErr, credentialCode: authCode };
    }
    return { ok: true };
  }

  return { ok: false, reason: `unexpected_${res.status}` };
}
