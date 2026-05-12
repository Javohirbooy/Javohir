"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AUTH_TOKEN_TYPE, createOpaqueToken, hashOpaqueToken } from "@/lib/auth-secret";
import { getSiteUrl } from "@/lib/env";
import { sendTransactionalEmail } from "@/lib/mail";
import { logStructured, logStructuredFromRequest } from "@/lib/logger";
import { throttleServerAction } from "@/lib/action-rate-limit";
import { isStrictDistributedRateLimitPolicy } from "@/lib/redis-strict-policy";
import { errResult, okResult } from "@/lib/action-result";
import {
  contactSchema,
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth-public";

const BCRYPT_ROUNDS = 12;
const tokenSchema = z.string().min(10).max(512);

function registrationEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_REGISTRATION !== "0";
}

export async function registerStudent(input: unknown) {
  const t = await throttleServerAction("register", 15, 60 * 60 * 1000, { requireDistributed: true });
  if (!t.ok) return errResult(t.message, "RATE_LIMITED");

  if (!registrationEnabled()) {
    return errResult("Hozircha ro‘yxatdan o‘tish o‘chirilgan.", "DISABLED");
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return errResult("Ma’lumotlar noto‘g‘ri.", "VALIDATION_ERROR");
  }

  const { name, email, password } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  const exists = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (exists) {
    return errResult("Bu email allaqachon ro‘yxatdan o‘tgan.", "CONFLICT");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const plainToken = createOpaqueToken();
  const tokenHash = hashOpaqueToken(plainToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email: emailNorm,
      name: name.trim(),
      passwordHash,
      role: "STUDENT",
      status: "PENDING_VERIFICATION",
      emailVerified: false,
    },
  });

  await prisma.authToken.create({
    data: {
      userId: user.id,
      type: AUTH_TOKEN_TYPE.EMAIL_VERIFY,
      tokenHash,
      expiresAt,
    },
  });

  const verifyUrl = `${getSiteUrl()}/verify-email?token=${encodeURIComponent(plainToken)}`;
  const verifyMail = await sendTransactionalEmail({
    to: emailNorm,
    subject: "IQ Monitoring — emailni tasdiqlang",
    text: `Salom, ${name.trim()}!\n\nQuyidagi havola orqali emailni tasdiqlang (24 soat amal qiladi):\n${verifyUrl}\n\nAgar siz ro‘yxatdan o‘tmagan bo‘lsangiz, xabarni e’tiborsiz qoldiring.`,
    html: `<p>Salom, <strong>${escapeHtml(name.trim())}</strong>!</p><p><a href="${verifyUrl}">Emailni tasdiqlash</a> (24 soat)</p>`,
  });
  if (!verifyMail.ok) {
    logStructured("warn", "email.verify.dispatch_failed", { status: verifyMail.status });
  }

  revalidatePath("/kirish");
  return okResult(
    { devVerifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined },
    "OK",
  );
}

export async function verifyEmailToken(token: string) {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return errResult("Token noto‘g‘ri.", "VALIDATION_ERROR");

  const tokenHash = hashOpaqueToken(parsed.data);
  const row = await prisma.authToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!row || row.type !== AUTH_TOKEN_TYPE.EMAIL_VERIFY) {
    return errResult("Tasdiqlash havolasi yaroqsiz.", "NOT_FOUND");
  }
  if (row.usedAt) return errResult("Bu havola allaqachon ishlatilgan.", "CONFLICT");
  if (row.expiresAt < new Date()) return errResult("Havola muddati tugagan.", "EXPIRED");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { status: "ACTIVE", emailVerified: true },
    }),
    prisma.authToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return okResult(undefined, "OK");
}

export async function requestPasswordReset(input: unknown) {
  const t = await throttleServerAction("forgot-password", 8, 60 * 60 * 1000, { requireDistributed: true });
  if (!t.ok) return errResult(t.message, "RATE_LIMITED");

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return errResult("Email noto‘g‘ri.", "VALIDATION_ERROR");

  const emailNorm = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: emailNorm } });

  /** Timing — har doim muvaffaqiyat ko‘rinishi (user yo‘q bo‘lsa ham). */
  if (!user || user.status === "BLOCKED" || user.status === "INACTIVE") {
    return okResult(undefined, "OK");
  }

  await prisma.authToken.deleteMany({
    where: { userId: user.id, type: AUTH_TOKEN_TYPE.PASSWORD_RESET, usedAt: null },
  });

  const plainToken = createOpaqueToken();
  const tokenHash = hashOpaqueToken(plainToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.authToken.create({
    data: {
      userId: user.id,
      type: AUTH_TOKEN_TYPE.PASSWORD_RESET,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(plainToken)}`;
  const resetMail = await sendTransactionalEmail({
    to: emailNorm,
    subject: "IQ Monitoring — parolni tiklash",
    text: `Parolni tiklash uchun havola (1 soat):\n${resetUrl}\n\nAgar so‘rov sizdan kelmagan bo‘lsa, xabarni e’tiborsiz qoldiring.`,
    html: `<p>Parolni tiklash: <a href="${resetUrl}">bosish</a> (1 soat)</p>`,
  });
  if (!resetMail.ok) {
    logStructured("warn", "email.password_reset.dispatch_failed", { status: resetMail.status });
  }

  return okResult(
    { devResetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined },
    "OK",
  );
}

export async function resetPasswordWithToken(input: unknown) {
  const t = await throttleServerAction("reset-password", 10, 60 * 60 * 1000, { requireDistributed: true });
  if (!t.ok) return errResult(t.message, "RATE_LIMITED");

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return errResult("Ma’lumotlar noto‘g‘ri.", "VALIDATION_ERROR");

  const { token, password } = parsed.data;
  const tokenHash = hashOpaqueToken(token);

  const row = await prisma.authToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!row || row.type !== AUTH_TOKEN_TYPE.PASSWORD_RESET) {
    return errResult("Tiklash havolasi yaroqsiz.", "NOT_FOUND");
  }
  if (row.usedAt) return errResult("Bu havola allaqachon ishlatilgan.", "CONFLICT");
  if (row.expiresAt < new Date()) return errResult("Havola muddati tugagan.", "EXPIRED");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.authToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.authToken.deleteMany({
      where: { userId: row.userId, type: AUTH_TOKEN_TYPE.PASSWORD_RESET },
    }),
  ]);

  revalidatePath("/kirish");
  return okResult(undefined, "OK");
}

export async function submitContactMessage(input: unknown) {
  const t = await throttleServerAction("contact", 10, 60 * 60 * 1000, {
    requireDistributed: isStrictDistributedRateLimitPolicy(),
  });
  if (!t.ok) return errResult(t.message, "RATE_LIMITED");

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return errResult("Forma to‘ldirilmagan.", "VALIDATION_ERROR");

  await prisma.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.trim().toLowerCase(),
      message: parsed.data.message,
    },
  });

  revalidatePath("/aloqa");
  await logStructuredFromRequest("info", "contact.message_created");
  return okResult(undefined, "OK");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
