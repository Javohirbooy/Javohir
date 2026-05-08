import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

const siteUrl = getSiteUrl();

const publicRoutes = [
  "/",
  "/fanlar",
  "/sinflar",
  "/testlar",
  "/reyting",
  "/biz-haqimizda",
  "/kirish",
  "/register",
  "/forgot-password",
  "/aloqa",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return publicRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
