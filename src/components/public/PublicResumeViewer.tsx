"use client";

import Link from "next/link";
import ResumeCanvas from "@/components/editor/ResumeCanvas";
import { ResumeDocument } from "@/types/resume";

export default function PublicResumeViewer({ resume }: { resume: ResumeDocument }) {
    return (
        <div className="public-resume-shell">
            <header className="public-resume-header">
                <Link className="public-resume-home-link" href="/" aria-label="Bripick 홈으로 이동">
                    <img src="/bripick_header_logo_dark.svg" alt="" />
                </Link>
                <span>{resume.versionName}</span>
            </header>
            <ResumeCanvas resumeOverride={resume} readOnly />
        </div>
    );
}
