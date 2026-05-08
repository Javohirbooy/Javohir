import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { takeRateLimitSlot } from "@/lib/distributed-rate-limit";
import { logStructured } from "@/lib/logger";
import { createEdgeContext, getEdgeClientIp, nextWithRequestHeaders, withCsp } from "@/lib/edge/middleware-utils";

/** Edge: Prisma yuklanmasin — faqat `auth.config.ts`. To‘liq auth — `auth.ts` + API route. */
const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const ctx = createEdgeContext(req);
  const authPath = req.nextUrl.pathname;
  const isSensitiveAuthPost =
    req.method === "POST" &&
    (authPath.startsWith("/api/auth/callback/") || authPath === "/api/auth/signin/credentials");

  if (isSensitiveAuthPost) {
    const ip = getEdgeClientIp(req);
    const rl = await takeRateLimitSlot("mw_auth_post", ip, 80, 15 * 60 * 1000, {
      requireDistributed: true,
      requestId: ctx.requestId,
    });
    if (!rl.ok) {
      const retrySec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
      const res = NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
      res.headers.set("Retry-After", String(retrySec));
      logStructured("warn", "auth.middleware_rate_limited", { backend: rl.backend, requestId: ctx.requestId });
      return withCsp(res, ctx);
    }
  }

  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/admin")) {
    if (!role) return withCsp(NextResponse.redirect(new URL("/kirish", req.url)), ctx);
    if (role !== "ADMIN" && role !== "SUPER_ADMIN")
      return withCsp(NextResponse.redirect(new URL("/", req.url)), ctx);
  }

  if (pathname.startsWith("/super-admin")) {
    if (!role) return withCsp(NextResponse.redirect(new URL("/kirish", req.url)), ctx);
    if (role !== "SUPER_ADMIN") return withCsp(NextResponse.redirect(new URL("/", req.url)), ctx);
  }

  if (pathname.startsWith("/oqituvchi")) {
    if (!role) return withCsp(NextResponse.redirect(new URL("/kirish", req.url)), ctx);
    if (role !== "TEACHER") return withCsp(NextResponse.redirect(new URL("/", req.url)), ctx);
  }

  if (pathname.startsWith("/oquvchi")) {
    if (!role) return withCsp(NextResponse.redirect(new URL("/kirish", req.url)), ctx);
    if (role !== "STUDENT") return withCsp(NextResponse.redirect(new URL("/", req.url)), ctx);
  }
  if (pathname.startsWith("/profile")) {
    if (!role) return withCsp(NextResponse.redirect(new URL("/kirish", req.url)), ctx);
    if (role !== "TEACHER" && role !== "ADMIN") {
      return withCsp(NextResponse.redirect(new URL("/", req.url)), ctx);
    }
  }
  return nextWithRequestHeaders(req, ctx);
});

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
