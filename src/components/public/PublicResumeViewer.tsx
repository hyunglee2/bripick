"use client";

import ResumeCanvas from "@/components/editor/ResumeCanvas";
import { ResumeDocument } from "@/types/resume";

export default function PublicResumeViewer({ resume }: { resume: ResumeDocument }) {
    return (
        <div className="public-resume-shell">
            <header className="public-resume-header">
                <img src="/bripick_header_logo_light.svg" alt="Bripick" />
                <span>{resume.versionName}</span>
            </header>
            <ResumeCanvas resumeOverride={resume} readOnly />
        </div>
    );
}
