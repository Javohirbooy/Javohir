import type { NextConfig } from "next";

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
};

export default nextConfig;
