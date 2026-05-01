import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /** RSC / mavjud komponentlar: React Compiler qoidalari bosqichma-bosqich yumshatiladi */
  {
    files: ["src/app/super-admin/page.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
  {
    files: ["src/components/admin/role-permissions-manager.tsx"],
    rules: { "react-hooks/refs": "off", "react-hooks/exhaustive-deps": "off" },
  },
  {
    files: ["src/components/teacher/teacher-test-create-form.tsx", "src/components/tests/test-session-timer.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma 6+ config (uses `prisma/config`; excluded from app `tsconfig` while on Prisma 5)
    "prisma.config.ts",
  ]),
]);

export default eslintConfig;
