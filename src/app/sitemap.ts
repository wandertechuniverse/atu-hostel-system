import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hostels = await db.hostel.findMany({
    where: { isApproved: true },
    select: { id: true, updatedAt: true },
    orderBy: { name: "asc" },
  });

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...hostels.map((hostel) => ({
      url: `${siteUrl}/hostels/${hostel.id}`,
      lastModified: hostel.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
