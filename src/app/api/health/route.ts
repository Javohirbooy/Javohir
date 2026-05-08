import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Liveness / readiness: bazaga ulanishni tekshiradi.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: true });
  } catch {
    return NextResponse.json({ status: "degraded", database: false }, { status: 503 });
  }
}
