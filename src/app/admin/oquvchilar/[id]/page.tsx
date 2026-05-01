import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminStudentEditForm, AdminStudentResetPasswordForm } from "@/components/students/admin-student-edit-form";

type Props = { params: Promise<{ id: string }> };

export default async function AdminStudentDetailPage({ params }: Props) {
  const session = await auth();
  requirePermission(session, "USERS_UPDATE", { redirectTo: "/admin" });

  const { id } = await params;
  const student = await prisma.user.findUnique({
    where: { id },
    include: { studentManagedLink: { select: { teacherUserId: true } } },
  });
  if (!student || student.role !== "STUDENT") notFound();

  const [grades, teachers] = await Promise.all([
    prisma.grade.findMany({ orderBy: { number: "asc" } }),
    prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const row = {
    id: student.id,
    email: student.email,
    name: student.name,
    status: student.status,
    gradeId: student.gradeId,
    managingTeacherId: student.studentManagedLink?.teacherUserId ?? null,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/oquvchilar" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
          ← Ro‘yxat
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-extrabold text-white">O‘quvchini tahrirlash</h1>
        <p className="mt-1 text-sm text-white/60">{student.name}</p>
        {student.studentNumber != null ? (
          <p className="mt-1 font-mono text-sm font-semibold text-sky-200">O‘quvchi ID: {student.studentNumber}</p>
        ) : null}
      </div>
      <AdminStudentEditForm student={row} grades={grades} teachers={teachers} />
      <AdminStudentResetPasswordForm studentId={student.id} />
    </div>
  );
}
