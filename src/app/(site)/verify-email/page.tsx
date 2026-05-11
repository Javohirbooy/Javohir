import { redirect } from "next/navigation";
import { verifyEmailToken } from "@/app/actions/auth-public";
import { getServerLocale } from "@/lib/i18n/resolve-locale";
import { metadataFromSeoKey } from "@/lib/seo/public-page-metadata";

export async function generateMetadata() {
  const locale = await getServerLocale();
  return metadataFromSeoKey(locale, "verifyEmail", {
    robots: { index: false, follow: false },
    titleMode: "absolute",
  });
}

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
