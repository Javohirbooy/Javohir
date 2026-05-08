import { Redis } from "@upstash/redis";

let cached: Redis | null | undefined;

/**
 * Upstash REST Redis — Vercel serverless / Edge uchun.
 * Env yo‘q bo‘lsa `null` (xotira asosidagi fallback).
 */
export function getUpstashRedis(): Redis | null {
  if (cached !== undefined) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url?.trim() || !token?.trim()) {
    cached = null;
    return null;
  }
  try {
    cached = new Redis({ url, token });
    return cached;
  } catch (e) {
    console.error("[redis] Upstash client init failed", e);
    cached = null;
    return null;
  }
}

export function isUpstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
}
