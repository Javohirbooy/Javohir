import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const START = 100_000;

async function main() {
  const maxAgg = await prisma.user.aggregate({
    where: { studentNumber: { not: null } },
    _max: { studentNumber: true },
  });
  let next = (maxAgg._max.studentNumber ?? START) + 1;
  const pending = await prisma.user.findMany({
    where: { role: "STUDENT", studentNumber: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  for (const u of pending) {
    await prisma.user.update({
      where: { id: u.id },
      data: { studentNumber: next },
    });
    next += 1;
  }
  console.log(`Assigned studentNumber to ${pending.length} student(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
