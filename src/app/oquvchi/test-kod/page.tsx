import { redirect } from "next/navigation";

/** Eski “test kodi” havolalari monitoring sahifasiga yo‘naltiriladi. */
export default function LegacyTestKodRedirect() {
  redirect("/oquvchi/monitoring-testlar");
}
