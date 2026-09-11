export type TemplateStyle = "modern" | "minimal" | "creative";

// 1. 지원할 블록 종류 정의
export type BlockType =
    | 'profile'       // 기본 인적사항 & 한줄소개
    | 'experience'    // 경력 사항
    | 'project'       // 프로젝트 경험
    | 'skills'        // 기술 스택 (태그/카테고리)
    | 'education'     // 학력
    | 'custom_text';  // 자유 텍스트/마크다운

// 2. 다단 그리드 컬럼 수 (1단, 2단, 3단)
export type LayoutColumns = 1 | 2 | 3;

// 3. 블록별 여백 및 그리드 스타일 설정
export interface BlockStyle {
    paddingY: number;       // 상하 여백 (px 단위)
    paddingX: number;       // 좌우 여백 (px 단위)
    columns: LayoutColumns; // 그리드 컬럼 수
    showDivider: boolean;   // 하단 구분선 표시 여부
}

// 4. 모든 블록이 공통으로 가지는 기본 구조
export interface BaseBlock {
    id: string;             // 블록 고유 식별자 (UUID)
    type: BlockType;        // 블록 종류
    title: string;          // 섹션 타이틀 (예: Work Experience)
    isVisible: boolean;     // 화면 표시 여부
    order: number;          // 정렬 순서
    style: BlockStyle;      // 블록별 개별 스타일
}

// 5. 각 블록에 들어갈 세부 데이터 구조 정의
export interface ProfileData {
    name: string;
    role: string;           // 직무 (예: 프론트엔드 엔지니어)
    email: string;
    phone?: string;         // '?'는 필수가 아닌 선택값(Optional)을 의미합니다.
    location?: string;
    bio: string;
}

export interface ExperienceItem {
    id: string;
    company: string;
    role: string;
    startDate: string;      // 시작일 (YYYY-MM)
    endDate?: string;       // 종료일 (YYYY-MM 또는 '현재 재직 중')
    description: string[];  // 주요 성과 (불릿 포인트 목록)
    techStack?: string[];   // 사용 기술 스택
}

export interface ProjectItem {
    id: string;
    name: string;
    summary: string;
    startDate: string;
    endDate?: string;
    role: string;
    achievements: string[];
    techStack: string[];
    linkUrl?: string;
}

export interface SkillGroup {
    category: string;       // 카테고리 (예: Frontend, Backend, DevOps)
    items: string[];        // 세부 기술 목록 (예: ['React', 'Next.js', 'TypeScript'])
}

// 6. 개별 블록 타입 결합 (타입 안전성 보장)
export type ResumeBlock =
    | (BaseBlock & { type: 'profile'; data: ProfileData })
    | (BaseBlock & { type: 'experience'; data: ExperienceItem[] })
    | (BaseBlock & { type: 'project'; data: ProjectItem[] })
    | (BaseBlock & { type: 'skills'; data: SkillGroup[] })
    | (BaseBlock & { type: 'custom_text'; data: { content: string } });

// 7. 이력서 전체 문서 데이터 구조
export interface ResumeDocument {
    id: string;
    versionName: string;    // 버전명 (예: "프론트엔드 지원용 v1")
    updatedAt: string;
    globalStyle: {
        fontFamily: string;
        primaryColor: string;
        contentWidth: number; // 캔버스 너비 (px)
        basePadding: number;
        template?: TemplateStyle;
    };
    blocks: ResumeBlock[];  // 조립된 블록들의 목록
}


