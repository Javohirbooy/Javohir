import { redirect } from "next/navigation";
import { verifyEmailToken } from "@/app/actions/auth-public";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/kirish?notice=verify-failed");
  const res = await verifyEmailToken(token);
  if (!res.ok) redirect("/kirish?notice=verify-failed");
  redirect("/kirish?notice=verified");
}
