import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicResumeViewer from "@/components/public/PublicResumeViewer";
import { findPublicResume } from "@/server/resumes/resume-publication.service";
import { PUBLIC_SLUG_PATTERN } from "@/server/resumes/resume.validator";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    if (!PUBLIC_SLUG_PATTERN.test(slug)) return { title: "공개 이력서 | Bripick" };
    const resume = await findPublicResume(slug).catch(() => null);
    return {
        title: resume ? `${resume.versionName} | Bripick` : "공개 이력서 | Bripick",
        description: "Bripick으로 작성한 공개 이력서입니다.",
    };
}

export default async function PublicResumePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (!PUBLIC_SLUG_PATTERN.test(slug)) notFound();
    const resume = await findPublicResume(slug);
    if (!resume) notFound();
    return <PublicResumeViewer resume={resume} />;
}
