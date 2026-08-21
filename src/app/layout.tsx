// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bripick",
  description: "Build brick by brick. Get picked.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased bg-[#0C0D12] text-slate-100">
        {children}
      </body>
    </html>
  );
}