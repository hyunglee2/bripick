import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { findPublicResumeSitemapEntries } from "@/server/resumes/resume-publication.service";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publications = await findPublicResumeSitemapEntries().catch(() => []);

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...publications.map((publication) => ({
      url: `${SITE_URL}/r/${publication.slug}`,
      lastModified: publication.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
