import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AUTH_TOKEN_TYPE, hashOpaqueToken } from "../../src/lib/auth-secret";

export const prisma = new PrismaClient();

export async function deleteUserByEmail(email: string) {
  await prisma.user.deleteMany({ where: { email } });
}

export async function createPendingStudent(email: string, password: string, name: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "STUDENT",
      status: "PENDING_VERIFICATION",
      emailVerified: false,
    },
  });
  const plainToken = `e2e-verify-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await prisma.authToken.create({
    data: {
      userId: user.id,
      type: AUTH_TOKEN_TYPE.EMAIL_VERIFY,
      tokenHash: hashOpaqueToken(plainToken),
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });
  return { user, plainToken };
}

export async function createActiveStudent(email: string, password: string, name: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      emailVerified: true,
    },
  });
}

export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`User not found: ${email}`);
  await prisma.authToken.deleteMany({
    where: { userId: user.id, type: AUTH_TOKEN_TYPE.PASSWORD_RESET },
  });
  const plain = `e2e-reset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await prisma.authToken.create({
    data: {
      userId: user.id,
      type: AUTH_TOKEN_TYPE.PASSWORD_RESET,
      tokenHash: hashOpaqueToken(plain),
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });
  return plain;
}
