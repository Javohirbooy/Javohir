import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertDemoUser(email: string, role: "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT", name: string) {
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: "password",
      name,
      role,
      status: "ACTIVE",
      mustChangePassword: false,
      locale: "uz",
    },
    update: {
      passwordHash: "password",
      name,
      role,
      status: "ACTIVE",
      mustChangePassword: false,
    },
  });
}

async function main() {
  await upsertDemoUser("super@demo.uz", "SUPER_ADMIN", "Demo Super Admin");
  await upsertDemoUser("admin@demo.uz", "ADMIN", "Demo Admin");
  await upsertDemoUser("teacher@demo.uz", "TEACHER", "Demo Teacher");
  await upsertDemoUser("student@demo.uz", "STUDENT", "Demo Student");
  console.log("Demo users ensured: super/admin/teacher/student @demo.uz with password=password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
