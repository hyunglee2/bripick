import type { MetadataRoute } from "next";
import { OPEN_GRAPH_IMAGE, SITE_LAST_MODIFIED, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

// 게시된 이력서(/resume/...)는 검색 노출을 막으므로 사이트맵에 넣지 않는다.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${SITE_URL}${OPEN_GRAPH_IMAGE.url}`],
    },
  ];
}
