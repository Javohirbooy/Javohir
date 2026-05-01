import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Spec route — tahrirlash sahifasiga yo‘naltirish. */
export default async function AdminTeacherIdPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/ustozlar/${id}/tahrirlash`);
}
