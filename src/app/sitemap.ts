import type { MetadataRoute } from "next";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import { listIcons } from "@/lib/db";
import { iconUrl } from "@/lib/paths";

const SITE = "https://www.pixicons.io";

// Rebuilt daily, like the icon pages.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const icons = await listIcons("public");
  return [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/icons`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/how-to`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/shop`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/bundle`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...CATEGORIES.map((c) => ({ url: SITE + categoryPath(c.slug), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...icons.map((i) => ({ url: SITE + iconUrl(i.name), lastModified: new Date(i.updated_at), priority: 0.6 })),
  ];
}
