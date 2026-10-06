import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicResumeViewer from "@/components/public/PublicResumeViewer";
import { OPEN_GRAPH_IMAGE, SITE_NAME } from "@/lib/site";
import { findPublicResume } from "@/server/resumes/resume-publication.service";
import { PUBLIC_SLUG_PATTERN } from "@/server/resumes/resume.validator";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    if (!PUBLIC_SLUG_PATTERN.test(slug)) {
        return { title: "공개 이력서", robots: { index: false, follow: false } };
    }

    const resume = await findPublicResume(slug).catch(() => null);
    if (!resume) {
        return { title: "공개 이력서", robots: { index: false, follow: false } };
    }

    const title = resume.versionName || "개발자 이력서";
    const description = "Bripick에서 경험을 블록처럼 쌓아 만든 개발자 이력서입니다.";
    const url = `/r/${slug}`;

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title: `${title} | ${SITE_NAME}`,
            description,
            url,
            siteName: SITE_NAME,
            locale: "ko_KR",
            type: "website",
            images: [OPEN_GRAPH_IMAGE],
        },
        twitter: {
            card: "summary_large_image",
            title: `${title} | ${SITE_NAME}`,
            description,
            images: [OPEN_GRAPH_IMAGE.url],
        },
    };
}

export default async function PublicResumePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (!PUBLIC_SLUG_PATTERN.test(slug)) notFound();
    const resume = await findPublicResume(slug);
    if (!resume) notFound();
    return <PublicResumeViewer resume={resume} />;
}
