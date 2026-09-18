// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bripick - 모듈식 이력서 빌더",
  description: "Next.js 기반 고성능 인터랙티브 이력서 제작기",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem('bripick-theme');var theme=saved==='light'||saved==='dark'?saved:'dark';document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}catch(e){document.documentElement.dataset.theme='dark';}})();`,
          }}
        />
        {/* 국문 웹폰트 로드: Pretendard, Noto Sans KR, Nanum Myeongjo */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="text-neutral-100 antialiased overflow-hidden selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
