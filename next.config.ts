import type { NextConfig } from "next";

const securityHeaders: { key: string; value: string }[] = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
};

export default nextConfig;
