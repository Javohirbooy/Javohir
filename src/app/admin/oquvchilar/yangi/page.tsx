import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { AdminStudentCreateForm } from "@/components/students/admin-student-create-form";

export default async function AdminNewStudentPage() {
  const session = await auth();
  requirePermission(session, "USERS_CREATE", { redirectTo: "/admin" });

  const [grades, teachers] = await Promise.all([
    prisma.grade.findMany({ orderBy: { number: "asc" } }),
    prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Yangi o‘quvchi</h1>
        <p className="mt-1 text-sm text-white/60">Email, vaqtinchalik parol, sinf va ixtiyoriy mas’ul o‘qituvchi.</p>
      </div>
      <AdminStudentCreateForm grades={grades} teachers={teachers} />
    </div>
  );
}
