// src/types/resume.ts

export type BlockType =
    | "profile"
    | "experience"
    | "project"
    | "skills"
    | "education"      // 신규 추가
    | "certification"  // 신규 추가
    | "custom_text"
    | "page_break";

export type TemplateStyle = "modern" | "minimal" | "creative";

export interface BlockStyle {
    paddingY: number;
    paddingX: number;
    columns: number;
    showDivider: boolean;
    keepTogether?: boolean;
    startOnNewPage?: boolean;
    useCustomPadding?: boolean;
    otherExperienceLeftColumnRatio?: number;
}

export interface ProfileData {
    name: string;
    role: string;
    email: string;
    phone: string;
    location?: string;
    bio: string;
    bioHtml?: string;
    photo?: string;
    photoSource?: string;
    photoCrop?: {
        focusX: number;
        focusY: number;
        zoom: number;
    };
    showPhoto?: boolean;
    blog?: string;
    github?: string;
    highlights?: string[];
    highlightsHtml?: string[];
    introductionStyle?: "bullets" | "paragraph";
    contacts?: ProfileContact[];
}

export interface ProfileContact {
    id: string;
    label: string;
    value: string;
    inlineWithPrevious?: boolean;
}

export interface ExperienceItem {
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    secondStartDate?: string;
    secondEndDate?: string;
    description: string[];
    descriptionHtml?: string[];
    descriptionStyle?: "bullets" | "paragraph";
    techStack?: string[];
    projects?: ExperienceProject[];
    startOnNewPage?: boolean;
}

export interface ExperienceProject {
    id: string;
    title: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string[];
    descriptionLevels?: number[];
    descriptionHtml?: string[];
    startOnNewPage?: boolean;
}

export interface ProjectItem {
    id: string;
    title: string;
    role: string;
    startDate: string;
    endDate: string;
    link?: string;
    description: string[];
    descriptionLevels?: number[];
    descriptionHtml?: string[];
    keepTogether?: boolean;
    startOnNewPage?: boolean;
}

export interface EducationItem {
    id: string;
    school: string;
    major: string;
    startDate: string;
    endDate: string;
    status: string; // 예: "졸업", "재학 중", "수료"
    score?: string;  // 예: "3.8 / 4.5"
    startOnNewPage?: boolean;
}

export interface CertificationItem {
    id: string;
    title: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    link?: string;
    description?: string[] | string;
    descriptionLevels?: number[];
    descriptionHtml?: string[];
    issuer?: string;
    startOnNewPage?: boolean;
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
    blockGap?: number;
    projectDividerGap?: number;
    displayTitleFontSize?: number;
    sectionTitleFontSize?: number;
    itemTitleFontSize?: number;
    bodyFontSize?: number;
    captionFontSize?: number;
    template?: TemplateStyle;
    /** 템플릿마다 따로 저장한 전역 설정. 현재 템플릿의 값은 위 필드에도 그대로 들어 있다. */
    templateStyles?: Partial<Record<TemplateStyle, TemplateGlobalStyle>>;
}

export type TemplateGlobalStyle = Partial<Omit<GlobalStyle, "template" | "templateStyles">>;

export interface SkillCategory {
    id: string;
    name: string;
    skills: string[];
}

export interface SkillsData {
    categories?: SkillCategory[];
    /** 이전에 저장된 이력서와의 호환을 위한 단일 배열 형식 */
    skills?: string[];
}

export interface ResumeDocument {
    id: string;
    versionName: string;
    updatedAt: string;
    globalStyle: GlobalStyle;
    blocks: ResumeBlock[];
    publication?: {
        slug: string;
        publishedAt: string;
    };
}
