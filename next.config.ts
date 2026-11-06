import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // 예전 공개 링크(/r/...)를 새 주소로 영구 이동(308). 이미 공유된 링크가 끊기지 않게 한다.
  async redirects() {
    return [
      { source: "/r/:slug", destination: "/resume/:slug", permanent: true },
    ];
  },
  // 게시된 이력서는 링크로만 열리게 하고 검색엔진 색인은 막는다(HTML 메타와 별개로 응답 헤더에도 표시).
  async headers() {
    return [
      {
        source: "/resume/:slug*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/r/:slug*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
