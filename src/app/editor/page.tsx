import type { Metadata } from "next";
import EditorHeader from "@/components/editor/EditorHeader";
import EditorWorkspace from "@/components/editor/EditorWorkspace";
import ResumeWorkspaceSync from "@/components/auth/ResumeWorkspaceSync";

export const metadata: Metadata = {
  title: "이력서 편집기",
  description: "Bripick 블록형 이력서 편집기",
  alternates: { canonical: "/editor" },
  robots: { index: false, follow: false },
};

export default function EditorPage() {
  return <main className="flex flex-col h-screen overflow-hidden" data-nosnippet><ResumeWorkspaceSync /><EditorHeader /><EditorWorkspace /></main>;
}
