import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), ".next");
if (existsSync(dir)) {
  rmSync(dir, { recursive: true, force: true });
  console.log("Removed .next (Next.js / Turbopack cache).");
} else {
  console.log(".next not present; nothing to remove.");
}
