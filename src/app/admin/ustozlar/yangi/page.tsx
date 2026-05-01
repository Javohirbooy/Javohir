import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { AdminTeacherCreateForm } from "@/components/teachers/admin-teacher-create-form";

export default async function AdminNewTeacherPage() {
  const session = await auth();
  requirePermission(session, "USERS_CREATE", { redirectTo: "/admin" });

  const [grades, subjects] = await Promise.all([
    prisma.grade.findMany({ orderBy: { number: "asc" } }),
    prisma.subject.findMany({ orderBy: [{ grade: { number: "asc" } }, { title: "asc" }], include: { grade: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Yangi o‘qituvchi</h1>
        <p className="mt-1 text-sm text-white/60">Sinflar va fanlar — relational biriktirish (TeacherOnClass + TeacherSubjectAssignment).</p>
      </div>
      <AdminTeacherCreateForm grades={grades} subjects={subjects} />
    </div>
  );
}
