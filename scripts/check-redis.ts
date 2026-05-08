/**
 * Upstash ulanishini tekshiradi: `npm run redis:ping`
 * Kalitlar .env yoki muhit o‘zgaruvchilaridan olinadi.
 */
import "dotenv/config";
import { Redis } from "@upstash/redis";

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    console.error(
      "UPSTASH_REDIS_REST_URL va UPSTASH_REDIS_REST_TOKEN yo‘q.\n" +
        ".env.example dagi bo‘yicha Upstash console dan qo‘shing, so‘ng qayta urinib ko‘ring.",
    );
    process.exit(1);
  }
  const redis = new Redis({ url, token });
  const pong = await redis.ping();
  if (pong !== "PONG") {
    console.error("Kutilmagan javob:", pong);
    process.exit(1);
  }
  console.log("OK — Upstash Redis ulangan (PING → PONG).");
}

main().catch((e) => {
  console.error("Redis xatosi:", e);
  process.exit(1);
});
