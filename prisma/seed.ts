import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSION_KEYS, type PermissionKey } from "../src/lib/permission-keys";
import { PERMISSION_DESCRIPTIONS_UZ } from "../src/lib/permission-metadata";

const prisma = new PrismaClient();

async function seedPermissionsAndRoleGrants() {
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();

  await prisma.permission.createMany({
    data: PERMISSION_KEYS.map((key) => ({
      key,
      description: PERMISSION_DESCRIPTIONS_UZ[key],
    })),
  });

  const all = await prisma.permission.findMany();
  const idByKey = new Map(all.map((p) => [p.key as PermissionKey, p.id]));

  const grant = (role: string, keys: readonly PermissionKey[]) =>
    keys.map((key) => ({
      role,
      permissionId: idByKey.get(key)!,
    }));

  const superKeys = [...PERMISSION_KEYS];
  const adminKeys = PERMISSION_KEYS.filter((k) => k !== "SITE_SETTINGS_SUPER");
  const teacherKeys: PermissionKey[] = [
    "TESTS_VIEW",
    "TESTS_CREATE",
    "TESTS_EDIT",
    "TESTS_DELETE",
    "TEST_CODES_MANAGE",
    "SUBJECTS_VIEW",
    "QUESTION_BANK_VIEW",
    "QUESTION_BANK_MANAGE",
    "RESULTS_VIEW_ASSIGNED",
    "ANALYTICS_ASSIGNED",
    "PASSWORD_RESET_ASSIGNED_STUDENTS",
    "USERS_CREATE",
    "USERS_UPDATE",
  ];
  const studentKeys: PermissionKey[] = ["TESTS_ATTEMPT", "RESULTS_VIEW_OWN", "SUBJECTS_VIEW", "ANALYTICS_OWN"];

  await prisma.rolePermission.createMany({
    data: [
      ...grant("SUPER_ADMIN", superKeys),
      ...grant("ADMIN", adminKeys),
      ...grant("TEACHER", teacherKeys),
      ...grant("STUDENT", studentKeys),
    ],
  });
}

const gradeColors = [
  "rose",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "indigo",
  "violet",
  "fuchsia",
];

async function main() {
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.testCode.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.question.deleteMany();
  await prisma.test.deleteMany();
  await prisma.material.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.teacherOnClass.deleteMany();
  await prisma.user.deleteMany();
  await prisma.grade.deleteMany();

  await seedPermissionsAndRoleGrants();

  /** Demo login password — must match what users type in /kirish (bcrypt same as `src/auth.ts`). */
  const DEMO_PASSWORD = "password";
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const grades = await Promise.all(
    Array.from({ length: 11 }, (_, i) => {
      const n = i + 1;
      return prisma.grade.create({
        data: {
          number: n,
          name: `${n}-sinf`,
          colorKey: gradeColors[i % gradeColors.length]!,
        },
      });
    }),
  );

  const g5 = grades[4]!;

  const superUser = await prisma.user.upsert({
    where: { email: "super@demo.uz" },
    create: {
      email: "super@demo.uz",
      passwordHash,
      name: "Demo Super Admin",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      avatarEmoji: "⚡",
      locale: "uz",
    },
    update: {
      passwordHash,
      name: "Demo Super Admin",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      avatarEmoji: "⚡",
      locale: "uz",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.uz" },
    create: {
      email: "admin@demo.uz",
      passwordHash,
      name: "Demo Admin",
      role: "ADMIN",
      status: "ACTIVE",
      avatarEmoji: "🛡️",
    },
    update: {
      passwordHash,
      name: "Demo Admin",
      role: "ADMIN",
      status: "ACTIVE",
      avatarEmoji: "🛡️",
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@demo.uz" },
    create: {
      email: "teacher@demo.uz",
      passwordHash,
      name: "Demo O‘qituvchi",
      role: "TEACHER",
      status: "ACTIVE",
      avatarEmoji: "👩‍🏫",
    },
    update: {
      passwordHash,
      name: "Demo O‘qituvchi",
      role: "TEACHER",
      status: "ACTIVE",
      avatarEmoji: "👩‍🏫",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@demo.uz" },
    create: {
      email: "student@demo.uz",
      passwordHash,
      name: "Demo O‘quvchi",
      role: "STUDENT",
      status: "ACTIVE",
      gradeId: g5.id,
      avatarEmoji: "🌟",
      studentNumber: 100_001,
    },
    update: {
      passwordHash,
      name: "Demo O‘quvchi",
      role: "STUDENT",
      status: "ACTIVE",
      gradeId: g5.id,
      avatarEmoji: "🌟",
      studentNumber: 100_001,
    },
  });

  void superUser;

  await prisma.teacherOnClass.createMany({
    data: [
      { userId: teacher.id, gradeId: g5.id },
      { userId: teacher.id, gradeId: grades[3]!.id },
    ],
  });

  await prisma.siteSetting.createMany({
    data: [
      { key: "brand.title", value: "IQ Monitoring" },
      { key: "brand.tagline", value: "Universal ta’lim monitoringi va test platformasi" },
      { key: "brand.primaryHue", value: "violet" },
    ],
  });

  await prisma.announcement.create({
    data: {
      title: "IQ Monitoring demo",
      body: "O‘quvchilar testlarni faqat o‘qituvchi bergan kod orqali ochadi (masalan: G5-DEMO).",
      audience: "STUDENTS",
      isActive: true,
      publishedAt: new Date(),
    },
  });

  const subjectTemplates = [
    { title: "Matematika", emoji: "➗", desc: "Algebra, geometriya va mantiqiy masalalar." },
    { title: "Fizika", emoji: "⚛️", desc: "Mexanika, to‘lqinlar va zamonaviy fizika." },
    { title: "Kimyo", emoji: "🧪", desc: "Organik va noorganik kimyo asoslari." },
    { title: "Biologiya", emoji: "🧬", desc: "Genetika, ekologiya va hujayra biologiyasi." },
    { title: "Geografiya", emoji: "🌍", desc: "Tabiiy va iqtisodiy geografiya." },
    { title: "Tarix", emoji: "🏛️", desc: "Jahon va mahalliy tarix bo‘yicha kurs." },
    { title: "Ona tili", emoji: "📖", desc: "Grammatika, adabiyot va insho mashqlari." },
    { title: "Ingliz tili", emoji: "🇬🇧", desc: "So‘zlashuv, grammatika va tinglash." },
    { title: "Informatika", emoji: "💻", desc: "Algoritmlar va raqamli savodxonlik." },
    { title: "Adabiyot", emoji: "📚", desc: "She’riyat, nasr va tahlil mashqlari." },
    { title: "Psixologiya", emoji: "🧠", desc: "Motivatsiya va o‘qish strategiyalari." },
  ];

  let demoTestIdForCode: string | null = null;

  for (const grade of grades) {
    for (let s = 0; s < subjectTemplates.length; s++) {
      const t = subjectTemplates[s]!;
      const subject = await prisma.subject.create({
        data: {
          gradeId: grade.id,
          title: t.title,
          description: t.desc,
          imageEmoji: t.emoji,
          order: s,
        },
      });

      const demoTopic = await prisma.topic.create({
        data: {
          subjectId: subject.id,
          title: `${t.title} — asosiy mavzu`,
          order: 0,
        },
      });

      const difficulties = ["EASY", "MEDIUM", "HARD"] as const;
      const difficulty = difficulties[(s + grade.number) % 3]!;

      const test = await prisma.test.create({
        data: {
          subjectId: subject.id,
          gradeId: grade.id,
          topicId: demoTopic.id,
          title: `${t.title} — tezkor test`,
          difficulty,
          isDraft: false,
          isActive: true,
          status: "PUBLISHED",
          antiCheatMode: "STANDARD",
        },
      });

      if (grade.id === g5.id && t.title === "Matematika") {
        demoTestIdForCode = test.id;
      }

      const questions = [
        {
          text: `${grade.number}-sinf uchun: "${t.title}" bo‘yicha qaysi mashg‘ulot eng foydali?`,
          options: ["Kunlik qayta ishlash", "Faqat imtihon oldi", "Darsni o‘tkazib yuborish", "Hech qaysi"],
          correctIndex: 0,
          order: 0,
        },
        {
          text: "Ta’lim jarayonida muhim narsa nima?",
          options: ["Faol qatnashish", "Faqat natija", "Hech narsa qilmaslik", "Faqat kitob o‘qish"],
          correctIndex: 0,
          order: 1,
        },
        {
          text: "Platformada test natijalari qanday ko‘rinadi?",
          options: ["Foiz ko‘rinishida", "Faqat ha/yo‘q", "Hech qanday", "Faqat rangda"],
          correctIndex: 0,
          order: 2,
        },
      ];

      for (const q of questions) {
        await prisma.question.create({
          data: {
            testId: test.id,
            text: q.text,
            optionsJson: JSON.stringify(q.options),
            correctIndex: q.correctIndex,
            order: q.order,
          },
        });
      }

      await prisma.material.create({
        data: {
          subjectId: subject.id,
          teacherId: teacher.id,
          title: `${t.title} — qo‘shimcha resurs`,
          url: "https://example.com/demo",
          type: "link",
        },
      });
    }
  }

  const grades4and5 = grades.filter((g) => g.number === 4 || g.number === 5);
  const subjectsForTeacher = await prisma.subject.findMany({
    where: { gradeId: { in: grades4and5.map((g) => g.id) } },
    select: { id: true },
  });
  await prisma.teacherSubjectAssignment.createMany({
    data: subjectsForTeacher.map((s) => ({ userId: teacher.id, subjectId: s.id })),
  });

  if (demoTestIdForCode) {
    await prisma.testCode.create({
      data: {
        testId: demoTestIdForCode,
        code: "G5-DEMO",
        maxUses: 500,
        isActive: true,
      },
    });
  }

  const anyTest = await prisma.test.findFirst({ where: { subject: { gradeId: g5.id } } });
  if (anyTest) {
    await prisma.testResult.create({
      data: {
        userId: student.id,
        testId: anyTest.id,
        score: 85,
        answersJson: JSON.stringify([0, 0, 1]),
      },
    });
  }

  void admin;
  console.log(
    "Seed OK: super@demo.uz, admin@demo.uz, teacher@demo.uz, student@demo.uz — parol: password · test kodi: G5-DEMO (5-sinf Matematika)",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
