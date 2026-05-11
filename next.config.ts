import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders: { key: string; value: string }[] = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** Vercel / CDN da HTTPS kafolatlangan bo‘lsa `ENABLE_HSTS=1` qo‘ying (max-age ni domen bo‘yicha sozlang). */
if (process.env.ENABLE_HSTS === "1") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  /** Smaller client bundles for markdown/KaTeX-heavy pages */
  experimental: {
    optimizePackageImports: ["react-markdown", "lucide-react"],
    /**
     * Prisma + Neon: `next build` SSG paytida parallel sahifalar bir vaqtda poolni to‘ldirib yuborishi mumkin.
     * `staticGenerationMaxConcurrency` — bir worker ichidagi parallel export.
     * `staticGenerationMinPagesPerWorker` — ko‘proq sahifa/batch → kamroq parallel worker.
     * Sozlash: NEXT_STATIC_GEN_MAX_CONCURRENCY, NEXT_STATIC_GEN_MIN_PAGES_PER_WORKER
     */
    staticGenerationMaxConcurrency: Number.parseInt(process.env.NEXT_STATIC_GEN_MAX_CONCURRENCY ?? "4", 10) || 4,
    staticGenerationMinPagesPerWorker:
      Number.parseInt(process.env.NEXT_STATIC_GEN_MIN_PAGES_PER_WORKER ?? "32", 10) || 32,
    staticGenerationRetryCount: 2,
  },
  /**
   * Load Prisma from `node_modules` at runtime instead of bundling it into Turbopack chunks.
   * Otherwise the query engine + DMMF baked at compile time can stay stale after `prisma generate`,
   * causing `PrismaClientValidationError` for fields that exist in `schema.prisma` but not in the old bundle.
   */
  serverExternalPackages: ["@prisma/client"],
  /** Vercel serverless: Prisma query engine fayllari bundle ga kirsin */
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/.prisma/client/**/*"],
    "/**/*": ["./node_modules/.prisma/client/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/about", destination: "/biz-haqimizda", permanent: true },
      { source: "/contact", destination: "/aloqa", permanent: true },
      { source: "/royxatdan-otish", destination: "/register", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    reactComponentAnnotation: { enabled: true },
    automaticVercelMonitors: true,
    treeshake: { removeDebugLogging: true },
  },
  _experimental: {
    turbopackApplicationKey: "iq-edu-platform",
    turbopackReactComponentAnnotation: { enabled: true },
  },
  errorHandler: (err: Error) => {
    console.warn("[sentry-build]", err.message);
  },
});
