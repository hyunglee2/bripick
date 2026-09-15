// src/types/resume.ts

export type BlockType =
    | "profile"
    | "experience"
    | "project"
    | "skills"
    | "education"      // 신규 추가
    | "certification"  // 신규 추가
    | "custom_text";

export type TemplateStyle = "modern" | "minimal" | "creative";

export interface BlockStyle {
    paddingY: number;
    paddingX: number;
    columns: number;
    showDivider: boolean;
}

export interface ProfileData {
    name: string;
    role: string;
    email: string;
    phone: string;
    location: string;
    bio: string;
}

export interface ExperienceItem {
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string[];
    techStack?: string[];
}

export interface ProjectItem {
    id: string;
    title: string;
    role: string;
    startDate: string;
    endDate: string;
    link?: string;
    description: string[];
}

export interface EducationItem {
    id: string;
    school: string;
    major: string;
    startDate: string;
    endDate: string;
    status: string; // 예: "졸업", "재학 중", "수료"
    score?: string;  // 예: "3.8 / 4.5"
}

export interface CertificationItem {
    id: string;
    title: string;       // 예: "정보처리기사", "TOEIC 900점"
    issuer: string;      // 예: "한국산업인력공단", "ETS"
    date: string;        // 예: "2024.08"
    description?: string;
}

export interface ResumeBlock {
    id: string;
    type: BlockType;
    title: string;
    isVisible: boolean;
    order: number;
    style: BlockStyle;
    data: any;
}

export interface GlobalStyle {
    fontFamily: string;
    primaryColor: string;
    contentWidth: number;
    basePadding: number;
    template?: TemplateStyle;
}

export interface ResumeDocument {
    id: string;
    versionName: string;
    updatedAt: string;
    globalStyle: GlobalStyle;
    blocks: ResumeBlock[];
}