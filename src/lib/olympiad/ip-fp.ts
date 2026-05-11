import { createHash } from "crypto";

export function hashIp(ip: string): string {
  const t = ip.trim() || "unknown";
  return createHash("sha256").update("ip|").update(t).digest("hex").slice(0, 32);
}

export function hashUserAgent(ua: string | null): string {
  const t = (ua ?? "").trim().slice(0, 512);
  return createHash("sha256").update("ua|").update(t).digest("hex").slice(0, 32);
}

export function hashDeviceFingerprint(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  return createHash("sha256").update("fp|").update(raw.trim().slice(0, 2000)).digest("hex").slice(0, 32);
}
