import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { notFound } from "next/navigation";
import { AdminTeacherEditForm, type TeacherEditRow } from "@/components/teachers/admin-teacher-edit-form";

type Props = { params: Promise<{ id: string }> };

export default async function AdminTeacherEditPage({ params }: Props) {
  const session = await auth();
  requirePermission(session, "USERS_UPDATE", { redirectTo: "/admin" });

  const { id } = await params;
  const teacher = await prisma.user.findFirst({
    where: { id, role: "TEACHER" },
    include: {
      teacherClasses: { select: { gradeId: true } },
      teacherSubjects: { select: { subjectId: true } },
    },
  });
  if (!teacher) notFound();

  const [grades, subjects] = await Promise.all([
    prisma.grade.findMany({ orderBy: { number: "asc" } }),
    prisma.subject.findMany({ orderBy: [{ grade: { number: "asc" } }, { title: "asc" }], include: { grade: true } }),
  ]);

  const row: TeacherEditRow = {
    id: teacher.id,
    email: teacher.email,
    name: teacher.name,
    status: teacher.status,
    gradeIds: teacher.teacherClasses.map((c) => c.gradeId),
    subjectIds: teacher.teacherSubjects.map((s) => s.subjectId),
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/ustozlar" className="inline-flex rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
        ← Ro‘yxat
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold text-white">O‘qituvchini tahrirlash</h1>
        <p className="mt-1 text-sm text-white/60">{teacher.name}</p>
      </div>
      <AdminTeacherEditForm teacher={row} grades={grades} subjects={subjects} />
    </div>
  );
}
