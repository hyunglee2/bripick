import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bripick - Build brick by brick. Get picked.",
  description: "모듈식 이력서 빌더",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased bg-[#0C0D12] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}