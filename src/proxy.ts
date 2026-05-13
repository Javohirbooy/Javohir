import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { takeRateLimitSlot } from "@/lib/distributed-rate-limit";
import { logStructured } from "@/lib/logger";
import { createEdgeContext, getEdgeClientIp, nextWithRequestHeaders, withCsp } from "@/lib/edge/middleware-utils";
import { MW_AUTH_POST_MAX_PER_IP, MW_AUTH_POST_WINDOW_MS } from "@/lib/auth-rate-limits";

/** Edge: Prisma yuklanmasin — faqat `auth.config.ts`. To‘liq auth — `auth.ts` + API route. */
const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const ctx = createEdgeContext(req);
  const pathnameEarly = req.nextUrl.pathname;

  if (process.env.MAINTENANCE_MODE === "1") {
    const allowed =
      pathnameEarly.startsWith("/api/health") ||
      pathnameEarly.startsWith("/certificate/verify") ||
      pathnameEarly.startsWith("/sertifikatni-tekshirish") ||
      pathnameEarly.startsWith("/olympiada") ||
      pathnameEarly.startsWith("/api/olympiad/monitor") ||
      pathnameEarly.startsWith("/api/certificate/verify") ||
      pathnameEarly.startsWith("/api/certificate/pdf") ||
      pathnameEarly === "/maintenance";
    if (!allowed) {
      if (pathnameEarly.startsWith("/api/")) {
        return withCsp(
          NextResponse.json(
            { error: "maintenance", message: "Texnik xizmat. Iltimos, keyinroq urinib ko‘ring." },
            { status: 503 },
          ),
          ctx,
        );
      }
      return withCsp(NextResponse.redirect(new URL("/maintenance", req.url)), ctx);
    }
  }

  const authPath = req.nextUrl.pathname;
  const isSensitiveAuthPost =
    req.method === "POST" &&
    (authPath.startsWith("/api/auth/callback/") || authPath === "/api/auth/signin/credentials");

  if (isSensitiveAuthPost) {
    const ip = getEdgeClientIp(req);
    /** IP aniqlanmasa (`unknown`) — barcha mijozlar bitta kalitga tushmasligi uchun yuqori limit. */
    const perIpLimit = ip === "unknown" ? Math.max(MW_AUTH_POST_MAX_PER_IP * 5, 2000) : MW_AUTH_POST_MAX_PER_IP;
    const rl = await takeRateLimitSlot("mw_auth_post", ip, perIpLimit, MW_AUTH_POST_WINDOW_MS, {
      requireDistributed: true,
      requestId: ctx.requestId,
    });
    if (!rl.ok) {
      const retrySec = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
      const res = NextResponse.json(
        {
          error: "Too Many Requests",
          /** Klient / loglar: noto‘g‘ri parol deb chalkashmasin */
          code: rl.backend === "redis_unavailable" ? "middleware_redis_unavailable" : "middleware_rate_limited",
          backend: rl.backend,
        },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(retrySec));
      logStructured("warn", "auth.middleware_rate_limited", {
        backend: rl.backend,
        requestId: ctx.requestId,
        path: authPath,
      });
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
