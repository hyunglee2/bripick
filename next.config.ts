import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // 정적 HTML export 필수
  images: {
    unoptimized: true,
  },
};

export default nextConfig;