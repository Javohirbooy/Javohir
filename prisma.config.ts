import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma ORM 6+ project configuration (`npx prisma db seed`, migrate, etc.).
 *
 * This repo currently runs **Prisma 5.22**, which reads the seed command from
 * `package.json` → `prisma.seed`. Prisma 5 ignores this file.
 *
 * After upgrading to Prisma 6+, this file is used by the CLI; remove `prisma.config.ts`
 * from the `exclude` array in `tsconfig.json` so types resolve.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "npx tsx prisma/seed.ts",
  },
});
