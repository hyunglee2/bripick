import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// 홈 화면/데스크톱에 "앱으로 설치"할 때 쓰는 설명서. Next가 /manifest.webmanifest로 내보낸다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/editor",
    name: `${SITE_NAME} - 개발자 이력서 빌더`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "ko",
    start_url: "/editor",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0c0d12",
    theme_color: "#0c0d12",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
