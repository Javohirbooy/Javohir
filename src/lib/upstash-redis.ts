import { Redis } from "@upstash/redis";

/** Faqat muvaffaqiyatli yaratilgan klient (null keshlanmasin — env keyinroq paydo bo‘lsa qayta uriniladi). */
let cachedClient: Redis | undefined;

/**
 * Upstash REST Redis — Vercel serverless / Edge uchun.
 * Env yo‘q bo‘lsa `null` (xotira asosidagi fallback).
 */
export function getUpstashRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  if (cachedClient) return cachedClient;
  try {
    cachedClient = new Redis({ url, token });
    return cachedClient;
  } catch (e) {
    console.error("[redis] Upstash client init failed", e);
    return null;
  }
}

export function isUpstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
}
