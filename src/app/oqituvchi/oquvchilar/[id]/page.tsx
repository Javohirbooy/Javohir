import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { teacherManagesStudent } from "@/lib/teacher-scope";
import { TeacherStudentEditForm, TeacherStudentResetPasswordForm } from "@/components/students/teacher-student-edit-form";

type Props = { params: Promise<{ id: string }> };

export default async function TeacherStudentDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/kirish");

  const { id } = await params;
  const ok = await teacherManagesStudent(session.user.id, id);
  if (!ok) redirect("/oqituvchi/oquvchilar");

  const student = await prisma.user.findUnique({
    where: { id },
    include: { grade: true },
  });
  if (!student || student.role !== "STUDENT") notFound();

  const classes = await prisma.teacherOnClass.findMany({
    where: { userId: session.user.id },
    include: { grade: true },
    orderBy: { grade: { number: "asc" } },
  });
  const grades = classes.map((c) => ({ id: c.gradeId, name: c.grade.name }));

  const row = {
    id: student.id,
    email: student.email,
    name: student.name,
    status: student.status,
    gradeId: student.gradeId,
  };

  return (
    <div className="space-y-6">
      <Link href="/oqituvchi/oquvchilar" className="inline-flex rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
        ← Ro‘yxat
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold text-white">O‘quvchini tahrirlash</h1>
        <p className="mt-1 text-sm text-white/60">{student.name}</p>
        {student.studentNumber != null ? (
          <p className="mt-1 font-mono text-sm font-semibold text-sky-200">O‘quvchi ID: {student.studentNumber}</p>
        ) : null}
      </div>
      <TeacherStudentEditForm student={row} grades={grades} />
      <TeacherStudentResetPasswordForm studentId={student.id} />
    </div>
  );
}
