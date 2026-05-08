import { spawn } from "node:child_process";

const env = { ...process.env };

if (typeof env.DATABASE_URL === "string" && env.DATABASE_URL.startsWith("prisma://") && env.DIRECT_URL) {
  env.DATABASE_URL = env.DIRECT_URL;
}

const child = spawn("npm run start", {
  stdio: "inherit",
  env,
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
