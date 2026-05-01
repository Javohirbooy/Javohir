import { Prisma } from "@prisma/client";

/** Foydalanuvchiga xavfsiz xabar (ichki detallarsiz). */
export function prismaErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "Bu yozuv allaqachon mavjud (unique cheklov).";
      case "P2025":
        return "Ma’lumot topilmadi.";
      case "P2014":
        return "Bog‘lanish xatosi.";
      case "P2024":
        return "Ma’lumotlar bazasiga ulanish vaqti tugadi. Qayta urinib ko‘ring.";
      default:
        return "Ma’lumotlar bazasi so‘rovi bajarilmadi.";
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Ma’lumotlar bazasiga ulanib bo‘lmadi. DATABASE_URL / DIRECT_URL ni tekshiring.";
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return "Ma’lumotlar bazasi vaqtincha mavjud emas.";
  }
  if (error instanceof Error) {
    const m = error.message.toLowerCase();
    if (m.includes("econnrefused") || m.includes("getaddrinfo") || m.includes("enotfound")) {
      return "Tarmoq yoki DNS xatosi — Neon endpointni tekshiring.";
    }
    if (m.includes("server closed the connection") || m.includes("connection pool")) {
      return "Ulanish uzildi. Keyinroq qayta urinib ko‘ring.";
    }
  }
  return "Kutilmagan xato yuz berdi.";
}

/** Log uchun (server-only). */
export function prismaErrorLogPayload(error: unknown): Record<string, unknown> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return { kind: "PrismaKnownRequest", code: error.code, meta: error.meta };
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { kind: "PrismaInitialization", message: error.message };
  }
  if (error instanceof Error) {
    return { kind: "Error", name: error.name, message: error.message };
  }
  return { kind: "Unknown" };
}
