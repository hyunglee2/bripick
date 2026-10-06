import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicResumeViewer from "@/components/public/PublicResumeViewer";
import { OPEN_GRAPH_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { findPublicResume } from "@/server/resumes/resume-publication.service";
import { PUBLIC_SLUG_PATTERN } from "@/server/resumes/resume.validator";
import type { ProfileData, ResumeDocument } from "@/types/resume";

export const dynamic = "force-dynamic";

function getResumeDescription(resume: ResumeDocument) {
    const profile = resume.blocks.find(
        (block) => block.type === "profile" && block.isVisible,
    )?.data as ProfileData | undefined;

    const bio = profile?.bio?.trim();
    const role = profile?.role?.trim();
    const name = profile?.name?.trim();

    if (bio && role && name) return `${bio} ${role} ${name}입니다`;
    if (role && name) return `${role} ${name}입니다`;
    if (bio) return bio;
    if (name) return `${name}의 개발자 이력서입니다`;
    return SITE_DESCRIPTION;
}

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
    const description = getResumeDescription(resume);
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
