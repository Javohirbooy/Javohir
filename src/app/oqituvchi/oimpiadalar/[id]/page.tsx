import { OlympiadManageDetail } from "@/components/olympiad/olympiad-manage-detail";

export default async function TeacherOlympiadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OlympiadManageDetail id={id} basePath="/oqituvchi/oimpiadalar" />;
}
