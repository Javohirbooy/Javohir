import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TeacherStudentCreateForm } from "@/components/students/teacher-student-create-form";

export default async function TeacherNewStudentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const classes = await prisma.teacherOnClass.findMany({
    where: { userId: session.user.id },
    include: { grade: true },
    orderBy: { grade: { number: "asc" } },
  });

  const classOpts = classes.map((c) => ({ gradeId: c.gradeId, gradeName: c.grade.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">O‘quvchi yaratish</h1>
        <p className="mt-1 text-sm text-white/60">Faqat sizga biriktirilgan sinflar ichida. Avtomatik sizga birikadi.</p>
      </div>
      <TeacherStudentCreateForm classes={classOpts} />
    </div>
  );
}
