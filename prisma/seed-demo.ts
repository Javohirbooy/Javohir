import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** `src/auth.ts` faqat bcrypt hash qabul qiladi; plaintext saqlansa kirish ishlamaydi. */
const DEMO_PASSWORD = "password";

async function upsertDemoUser(email: string, role: "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT", name: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name,
      role,
      status: "ACTIVE",
      emailVerified: true,
      mustChangePassword: false,
      locale: "uz",
    },
    update: {
      passwordHash,
      name,
      role,
      status: "ACTIVE",
      emailVerified: true,
      mustChangePassword: false,
    },
  });
}

async function main() {
  await upsertDemoUser("super@demo.uz", "SUPER_ADMIN", "Demo Super Admin");
  await upsertDemoUser("admin@demo.uz", "ADMIN", "Demo Admin");
  await upsertDemoUser("teacher@demo.uz", "TEACHER", "Demo Teacher");
  await upsertDemoUser("student@demo.uz", "STUDENT", "Demo Student");
  console.log("Demo users ensured: super/admin/teacher/student @demo.uz — parol: password (bcrypt)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
