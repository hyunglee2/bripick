// src/components/editor/EditorHeader.tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import AtsCheckerModal from "@/components/editor/AtsCheckerModal";
import ServiceDialog, { ServiceDialogVariant } from "@/components/ui/ServiceDialog";
import PublishResumeButton from "@/components/editor/PublishResumeButton";
import {
    Plus,
    Download,
    Upload,
    FileCode,
    Sparkles,
    Undo2,
    Redo2,
    Copy,
    Trash2,
    FileText,
    ShieldCheck,
    Sun,
    Moon,
    ChevronDown,
    MoreHorizontal,
    Check,
    CheckCircle2,
} from "lucide-react";
import { BlockType, ResumeDocument } from "@/types/resume";

type DialogState = {
    title: string;
    message: string;
    variant: ServiceDialogVariant;
    confirmLabel?: string;
    cancelLabel?: string;
    action?: () => void;
};

const STARTER_CONTENT = new Set([
    "홍길동",
    "Frontend Engineer",
    "dev.gildong@example.com",
    "010-1234-5678",
    "Seoul, Korea",
    "Email",
    "Phone",
    "Blog",
    "GitHub",
    "https://blog.coreluma.kr",
    "https://github.coreluma.kr",
    "/profile_default.png",
    "기획·디자인·개발로 사용자 중심의 서비스를 만드는",
    "제품의 전 과정을 경험하며 사용자 중심의 기능을 구현합니다.",
    "사용자 흐름과 비즈니스 목표를 연결해 서비스 아이디어를 실제 기능으로 만듭니다.",
    "데이터와 피드백을 기반으로 사용자 경험과 서비스 품질을 개선합니다.",
    "테크 스타트업",
    "Frontend Developer",
    "2024-01",
    "현재 재직 중",
    "모듈형 웹 에디터 인터페이스 설계 및 성능 최적화",
    "Next.js App Router 기반 렌더링 파이프라인 구축",
]);

function collectContentStrings(value: unknown): string[] {
    if (typeof value === "string") return value.trim() ? [value.trim()] : [];
    if (Array.isArray(value)) return value.flatMap(collectContentStrings);
    if (value && typeof value === "object") {
        return Object.entries(value)
            .filter(([key]) => key !== "id")
            .flatMap(([, item]) => collectContentStrings(item));
    }
    return [];
}

export default function EditorHeader() {
    const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const [openMenu, setOpenMenu] = useState<"document" | "blocks" | "more" | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const addBlock = useResumeStore((state) => state.addBlock);
    const setSelectedBlockId = useResumeStore((state) => state.setSelectedBlockId);
    const resume = useResumeStore((state) => state.resume);
    const resumeList = useResumeStore((state) => state.resumeList);
    const loadResume = useResumeStore((state) => state.loadResume);

    const switchResume = useResumeStore((state) => state.switchResume);
    const createNewResume = useResumeStore((state) => state.createNewResume);
    const duplicateCurrentResume = useResumeStore((state) => state.duplicateCurrentResume);
    const deleteResume = useResumeStore((state) => state.deleteResume);
    const updateVersionName = useResumeStore((state) => state.updateVersionName);

    const undo = useResumeStore((state) => state.undo);
    const redo = useResumeStore((state) => state.redo);
    const canUndo = useResumeStore((state) => state.past.length > 0);
    const canRedo = useResumeStore((state) => state.future.length > 0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const currentTheme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
        setTheme(currentTheme);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (e.key === "Escape") {
                setOpenMenu(null);
                return;
            }
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                if (e.shiftKey) {
                    e.preventDefault();
                    redo();
                } else {
                    e.preventDefault();
                    undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo]);

    useEffect(() => {
        if (!toastMessage) return;
        const timeoutId = window.setTimeout(() => setToastMessage(null), 2400);
        return () => window.clearTimeout(timeoutId);
    }, [toastMessage]);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        };

        window.addEventListener("pointerdown", handlePointerDown);
        return () => window.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        document.documentElement.dataset.theme = nextTheme;
        document.documentElement.style.colorScheme = nextTheme;
        localStorage.setItem("bripick-theme", nextTheme);
    };

    const closeDialog = () => setDialog(null);
    const confirmDialog = () => {
        const action = dialog?.action;
        setDialog(null);
        action?.();
    };

    const blockButtons: { label: string; type: BlockType }[] = [
        { label: "프로필", type: "profile" },
        { label: "경력", type: "experience" },
        { label: "프로젝트", type: "project" },
        { label: "기술 스택", type: "skills" },
        { label: "학력", type: "education" },
        { label: "기타 경험", type: "certification" },
        { label: "자유 텍스트", type: "custom_text" },
    ];

    const contentBlocks = resume.blocks.filter((block) => block.type !== "page_break");
    const customContentCount = contentBlocks
        .flatMap((block) => collectContentStrings(block.data))
        .filter((value) => !STARTER_CONTENT.has(value)).length;
    const shouldShowSample = contentBlocks.length <= 2 && customContentCount < 3;
    const orderedResumeList = [
        ...(resumeList || []).filter((item) => item.id === resume.id),
        ...(resumeList || []).filter((item) => item.id !== resume.id),
    ];

    const handleExportPDF = () => {
        setSelectedBlockId(null);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const handleDownloadJSON = () => {
        const dataStr =
            "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(resume, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${resume.versionName || "resume"}-${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    const handleUploadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (event) => {
                try {
                    const parsedData = JSON.parse(event.target?.result as string);
                    if (parsedData && parsedData.blocks) {
                        loadResume(parsedData);
                        setDialog({
                            title: "이력서를 불러왔어요",
                            message: "선택한 이력서 데이터가 편집기에 정상적으로 반영되었습니다.",
                            variant: "success",
                        });
                    } else {
                        setDialog({
                            title: "파일을 확인해 주세요",
                            message: "Bripick에서 내보낸 올바른 이력서 JSON 파일이 아닙니다.",
                            variant: "warning",
                        });
                    }
                } catch {
                    setDialog({
                        title: "파일을 읽지 못했어요",
                        message: "JSON 파일이 손상되었거나 지원하지 않는 형식입니다.",
                        variant: "warning",
                    });
                }
            };
        }
    };

    const handleLoadPreset = () => {
        const samplePreset: ResumeDocument = {
            id: `preset-${Date.now()}`,
            versionName: "샘플 이력서",
            updatedAt: new Date().toISOString(),
            globalStyle: {
                fontFamily: "'Pretendard', sans-serif",
                primaryColor: "#2f80c3",
                contentWidth: 800,
                basePadding: 36,
                blockGap: 18,
                displayTitleFontSize: 24,
                sectionTitleFontSize: 24,
                itemTitleFontSize: 19,
                bodyFontSize: 14,
                captionFontSize: 14,
                template: "modern",
            },
            blocks: [
                {
                    id: "block-p-1",
                    type: "profile",
                    title: "PROFILE",
                    isVisible: true,
                    order: 0,
                    style: { paddingY: 16, paddingX: 0, columns: 1, showDivider: true },
                    data: {
                        name: "김브릭",
                        role: "Frontend Engineer",
                        email: "seohyun.lee@example.com",
                        phone: "010-1234-5678",
                        bio: "복잡한 문제를 이해하기 쉬운 화면으로 풀어내는",
                        photo: "/profile_default.png",
                        showPhoto: true,
                        blog: "https://coreluma.kr/blog",
                        github: "https://coreluma.kr/example",
                        contacts: [
                            { id: "contact-email", label: "Email", value: "birpick@coreluma.kr" },
                            { id: "contact-phone", label: "Phone", value: "010-1234-5678" },
                            { id: "contact-blog", label: "Blog", value: "https://coreluma.kr/blog" },
                            { id: "contact-github", label: "GitHub", value: "https://coreluma.kr/example", inlineWithPrevious: true },
                        ],
                        highlights: [
                            "React와 TypeScript를 기반으로 사용자 중심의 웹 제품을 개발합니다.",
                            "디자인 시스템과 테스트 자동화를 통해 팀의 개발 속도와 화면 품질을 함께 높였습니다.",
                            "사용자 행동 데이터와 고객 피드백을 바탕으로 제품의 문제를 정의하고 개선합니다.",
                        ],
                        introductionStyle: "bullets",
                    },
                },
                {
                    id: "block-s-1",
                    type: "skills",
                    title: "CORE SKILLS",
                    isVisible: true,
                    order: 1,
                    style: { paddingY: 16, paddingX: 0, columns: 1, showDivider: true },
                    data: {
                        categories: [
                            { id: "skills-frontend", name: "Frontend", skills: ["React", "Next.js", "TypeScript", "TanStack Query"] },
                            { id: "skills-ui", name: "UI", skills: ["Tailwind CSS", "Storybook", "Figma", "Accessibility"] },
                            { id: "skills-quality", name: "Quality", skills: ["Vitest", "Playwright", "GitHub Actions"] },
                        ],
                    } as any,
                },
                {
                    id: "block-e-1",
                    type: "experience",
                    title: "WORK EXPERIENCE",
                    isVisible: true,
                    order: 2,
                    style: { paddingY: 18, paddingX: 0, columns: 1, showDivider: true },
                    data: [
                        {
                            id: "exp-sample-1",
                            company: "루미노스 커머스",
                            role: "Frontend Engineer",
                            startDate: "2023.04",
                            endDate: "재직 중",
                            description: [
                                "커머스 운영 도구와 고객용 웹 서비스의 프론트엔드 개발 및 운영",
                                "디자이너·백엔드 개발자와 협업해 공통 UI 정책과 배포 프로세스 정립",
                            ],
                            projects: [
                                {
                                    id: "exp-project-sample-1",
                                    title: "파트너 정산 대시보드",
                                    role: "프론트엔드 설계 및 핵심 화면 개발",
                                    startDate: "2024.02",
                                    endDate: "2024.08",
                                    description: [
                                        "담당 업무: 정산 대시보드 화면 구조 설계 및 핵심 사용자 흐름 개발",
                                        "주요 성과 및 의의",
                                        "서버 상태와 필터 상태를 분리해 대용량 정산 내역의 탐색 성능 개선",
                                        "공통 테이블과 폼 컴포넌트를 구축해 신규 운영 화면 개발 시간을 약 35% 단축",
                                        "Playwright 기반 회귀 테스트로 배포 전 정산 오류 감소",
                                        "주요 기술: React, TypeScript, TanStack Query, Playwright",
                                    ],
                                    descriptionLevels: [1, 1, 2, 3, 3, 1],
                                    descriptionHtml: [
                                        "<strong>담당 업무 :</strong> 정산 대시보드 화면 구조 설계 및 핵심 사용자 흐름 개발",
                                        "<strong>주요 성과 및 의의</strong>",
                                        "서버 상태와 필터 상태를 분리해 <strong>대용량 정산 내역의 탐색 성능 개선</strong>",
                                        "공통 테이블과 폼 컴포넌트를 구축해 <strong>신규 운영 화면 개발 시간을 약 35% 단축</strong>",
                                        "Playwright 기반 회귀 테스트로 <strong>배포 전 정산 오류 감소</strong>",
                                        "<strong>주요 기술 :</strong> React, TypeScript, TanStack Query, Playwright",
                                    ],
                                },
                                {
                                    id: "exp-project-sample-2",
                                    title: "모바일 주문 경험 개선",
                                    role: "상품 상세·장바구니 사용자 흐름 개선",
                                    startDate: "2023.07",
                                    endDate: "2023.12",
                                    description: [
                                        "담당 업무: 상품 상세부터 장바구니까지 이어지는 모바일 구매 흐름 개선",
                                        "주요 성과 및 의의",
                                        "이미지 로딩과 렌더링 병목을 개선해 모바일 LCP를 3.1초에서 1.8초로 단축",
                                        "접근성 점검과 키보드 탐색 개선으로 핵심 구매 흐름의 사용성 강화",
                                        "주요 기술: Next.js, TypeScript, Web Vitals",
                                    ],
                                    descriptionLevels: [1, 1, 2, 3, 1],
                                    descriptionHtml: [
                                        "<strong>담당 업무 :</strong> 상품 상세부터 장바구니까지 이어지는 모바일 구매 흐름 개선",
                                        "<strong>주요 성과 및 의의</strong>",
                                        "이미지 로딩과 렌더링 병목을 개선해 <strong>모바일 LCP를 3.1초에서 1.8초로 단축</strong>",
                                        "접근성 점검과 키보드 탐색 개선으로 <strong>핵심 구매 흐름의 사용성 강화</strong>",
                                        "<strong>주요 기술 :</strong> Next.js, TypeScript, Web Vitals",
                                    ],
                                },
                            ],
                        },
                        {
                            id: "exp-sample-2",
                            company: "모노랩스",
                            role: "Frontend Developer",
                            startDate: "2021.07",
                            endDate: "2023.03",
                            description: [
                                "B2B 협업 서비스의 프론트엔드 기능 개발과 디자인 시스템 운영",
                                "제품 지표와 고객 문의를 기반으로 반복되는 사용성 문제를 발굴하고 개선",
                            ],
                            projects: [
                                {
                                    id: "exp-project-sample-3",
                                    title: "팀 협업 워크스페이스 개편",
                                    role: "워크스페이스·권한 관리 화면 개발",
                                    startDate: "2022.05",
                                    endDate: "2023.01",
                                    description: [
                                        "담당 업무: 워크스페이스 멤버와 역할별 권한 관리 화면 개발",
                                        "주요 성과 및 의의",
                                        "복잡한 권한 정책을 역할 기반 UI로 재구성해 설정 과정의 고객 문의를 28% 감소",
                                        "Storybook 기반 공통 컴포넌트를 정비해 화면 간 UI 일관성과 개발 생산성 향상",
                                        "주요 기술: React, Storybook, React Testing Library",
                                    ],
                                    descriptionLevels: [1, 1, 2, 3, 1],
                                    descriptionHtml: [
                                        "<strong>담당 업무 :</strong> 워크스페이스 멤버와 역할별 권한 관리 화면 개발",
                                        "<strong>주요 성과 및 의의</strong>",
                                        "복잡한 권한 정책을 역할 기반 UI로 재구성해 <strong>설정 관련 고객 문의를 28% 감소</strong>",
                                        "Storybook 기반 공통 컴포넌트를 정비해 <strong>UI 일관성과 개발 생산성 향상</strong>",
                                        "<strong>주요 기술 :</strong> React, Storybook, React Testing Library",
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    id: "block-pr-1",
                    type: "project",
                    title: "NOTABLE PROJECTS",
                    isVisible: true,
                    order: 3,
                    style: { paddingY: 18, paddingX: 0, columns: 1, showDivider: true },
                    data: [
                        {
                            id: "proj-sample-1",
                            title: "RouteMate 여행 일정 플래너",
                            role: "사이드 프로젝트 · 프론트엔드 개발",
                            startDate: "2024.09",
                            endDate: "2025.01",
                            link: "https://github.com/example/routemate",
                            description: [
                                "담당 업무: 지도 검색과 일정 편집을 연결하는 사용자 흐름 설계 및 구현",
                                "주요 성과 및 의의",
                                "드래그 앤 드롭으로 장소 순서를 변경하고 지도 마커와 일정 상태를 실시간 동기화",
                                "공유 링크 초기 로딩을 최적화해 첫 화면 표시 시간을 40% 단축",
                                "오프라인 임시 저장을 적용해 네트워크가 불안정한 환경에서도 작성 내용 유지",
                                "주요 기술: Next.js, TypeScript, dnd-kit, IndexedDB",
                            ],
                            descriptionLevels: [1, 1, 2, 3, 3, 1],
                            descriptionHtml: [
                                "<strong>담당 업무 :</strong> 지도 검색과 일정 편집을 연결하는 사용자 흐름 설계 및 구현",
                                "<strong>주요 성과 및 의의</strong>",
                                "드래그 앤 드롭으로 장소 순서를 변경하고 <strong>지도 마커와 일정 상태를 실시간 동기화</strong>",
                                "공유 링크 초기 로딩을 최적화해 <strong>첫 화면 표시 시간을 40% 단축</strong>",
                                "오프라인 임시 저장을 적용해 <strong>네트워크가 불안정한 환경에서도 작성 내용 유지</strong>",
                                "<strong>주요 기술 :</strong> Next.js, TypeScript, dnd-kit, IndexedDB",
                            ],
                        },
                        {
                            id: "proj-sample-2",
                            title: "DevNote 기술 아카이브",
                            role: "개인 프로젝트 · 기획 및 프론트엔드 개발",
                            startDate: "2024.03",
                            endDate: "2024.06",
                            link: "https://github.com/example/devnote",
                            description: [
                                "담당 업무: Markdown 기반 기술 문서 작성·검색 기능 개발",
                                "주요 성과 및 의의",
                                "태그와 전문 검색을 결합해 기록 탐색 시간을 단축",
                                "정적 생성과 이미지 최적화로 Lighthouse 성능 점수 95점 이상 유지",
                                "주요 기술: Next.js, MDX, Fuse.js",
                            ],
                            descriptionLevels: [1, 1, 2, 3, 1],
                            descriptionHtml: [
                                "<strong>담당 업무 :</strong> Markdown 기반 기술 문서 작성·검색 기능 개발",
                                "<strong>주요 성과 및 의의</strong>",
                                "태그와 전문 검색을 결합해 <strong>기록 탐색 시간을 단축</strong>",
                                "정적 생성과 이미지 최적화로 <strong>Lighthouse 성능 점수 95점 이상 유지</strong>",
                                "<strong>주요 기술 :</strong> Next.js, MDX, Fuse.js",
                            ],
                        },
                        {
                            id: "proj-sample-3",
                            title: "Open UI Kit",
                            role: "오픈소스 · 컴포넌트 설계 및 문서화",
                            startDate: "2023.10",
                            endDate: "2024.02",
                            link: "https://github.com/example/open-ui-kit",
                            description: [
                                "담당 업무: 접근성을 고려한 공통 UI 컴포넌트 설계 및 문서화",
                                "주요 성과 및 의의",
                                "폼·모달·메뉴 컴포넌트 12종에 키보드 탐색과 ARIA 속성 적용",
                                "시각 회귀 테스트와 자동 배포로 오픈소스 기여 검증 과정 자동화",
                                "주요 기술: React, Storybook, Playwright, GitHub Actions",
                            ],
                            descriptionLevels: [1, 1, 2, 3, 1],
                            descriptionHtml: [
                                "<strong>담당 업무 :</strong> 접근성을 고려한 공통 UI 컴포넌트 설계 및 문서화",
                                "<strong>주요 성과 및 의의</strong>",
                                "폼·모달·메뉴 컴포넌트 12종에 <strong>키보드 탐색과 ARIA 속성 적용</strong>",
                                "시각 회귀 테스트와 자동 배포로 <strong>오픈소스 기여 검증 과정 자동화</strong>",
                                "<strong>주요 기술 :</strong> React, Storybook, Playwright, GitHub Actions",
                            ],
                        },
                    ],
                },
                {
                    id: "block-edu-1",
                    type: "education",
                    title: "EDUCATION",
                    isVisible: true,
                    order: 4,
                    style: { paddingY: 16, paddingX: 0, columns: 1, showDivider: true },
                    data: [
                        {
                            id: "edu-sample-1",
                            school: "브릭대학교",
                            major: "컴퓨터공학과",
                            startDate: "2019.03",
                            endDate: "2023.02",
                            status: "졸업",
                            score: "3.9 / 4.5",
                        },
                    ],
                },
                {
                    id: "block-cert-1",
                    type: "certification",
                    title: "Other Experience",
                    isVisible: true,
                    order: 5,
                    style: { paddingY: 16, paddingX: 0, columns: 1, showDivider: true },
                    data: [
                        {
                            id: "cert-sample-1",
                            title: "오픈소스 UI 라이브러리 기여",
                            startDate: "2024.03",
                            endDate: "2024.08",
                            link: "https://github.com",
                            description: [
                                "키보드 탐색과 포커스 이동 관련 접근성 오류 개선",
                                "공통 컴포넌트 사용 가이드와 Storybook 예제 보강",
                                "GitHub Issue와 Pull Request 기반 비동기 협업 경험",
                            ],
                            descriptionHtml: [
                                "키보드 탐색과 포커스 이동 관련 <strong>접근성 오류 개선</strong>",
                                "공통 컴포넌트 사용 가이드와 Storybook 예제 보강",
                                "GitHub Issue와 Pull Request 기반 비동기 협업 경험",
                            ],
                        },
                        {
                            id: "cert-sample-2",
                            title: "프론트엔드 스터디 운영",
                            startDate: "2023.09",
                            endDate: "2024.02",
                            description: [
                                "주 1회 기술 발표와 코드 리뷰를 포함한 12주 과정 설계",
                                "React 렌더링과 웹 성능을 주제로 실습 자료 제작",
                                "회고를 바탕으로 다음 기수 완주율을 70%에서 90%로 개선",
                            ],
                            descriptionHtml: [
                                "주 1회 기술 발표와 코드 리뷰를 포함한 <strong>12주 과정 설계</strong>",
                                "React 렌더링과 웹 성능을 주제로 실습 자료 제작",
                                "회고를 바탕으로 다음 기수 <strong>완주율을 70%에서 90%로 개선</strong>",
                            ],
                        },
                        {
                            id: "cert-sample-3",
                            title: "지역 생활 편의 해커톤",
                            startDate: "2023.07",
                            endDate: "",
                            description: [
                                "생활 편의시설 혼잡도를 알려주는 모바일 웹 서비스 기획",
                                "사용자 인터뷰 결과를 반영해 핵심 탐색 단계를 5단계에서 3단계로 단축",
                                "48시간 내 프로토타입을 완성하고 사용자 경험 부문 우수상 수상",
                            ],
                            descriptionHtml: [
                                "생활 편의시설 혼잡도를 알려주는 <strong>모바일 웹 서비스 기획</strong>",
                                "사용자 인터뷰 결과를 반영해 핵심 탐색 단계를 <strong>5단계에서 3단계로 단축</strong>",
                                "48시간 내 프로토타입을 완성하고 <strong>사용자 경험 부문 우수상</strong> 수상",
                            ],
                        },
                    ],
                },
                {
                    id: "block-custom-1",
                    type: "custom_text",
                    title: "ADDITIONAL INFORMATION",
                    isVisible: true,
                    order: 6,
                    style: { paddingY: 16, paddingX: 0, columns: 1, showDivider: true },
                    data: {
                        content: "기술을 쉽게 설명하고 팀의 지식을 문서로 남기는 일을 좋아합니다. 사내 프론트엔드 스터디를 운영하며 학습 내용을 꾸준히 공유하고 있습니다.",
                        contentStyle: "bullets",
                    },
                },
            ],
        };

        setDialog({
            title: "샘플 이력서를 불러올까요?",
            message: "현재 작성 중인 내용이 Bripick 샘플 이력서로 대체됩니다.",
            variant: "warning",
            confirmLabel: "샘플 불러오기",
            cancelLabel: "취소",
            action: () => {
                loadResume(samplePreset);
                setToastMessage("샘플 이력서를 불러왔어요.");
            },
        });
    };

    return (
        <>
            <header
                ref={headerRef}
                className="editor-header editor-header--shadcn sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b border-neutral-800 bg-[#12131a] px-5"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className="header-brand shrink-0 pr-1">
                        <div className="header-brand-logo" role="img" aria-label="Bripick">
                            <img
                                src="/bripick_header_logo_light.svg"
                                alt=""
                                aria-hidden="true"
                                className="header-brand-logo-light"
                            />
                            <img
                                src="/bripick_header_logo_dark.svg"
                                alt=""
                                aria-hidden="true"
                                className="header-brand-logo-dark"
                            />
                        </div>
                    </div>

                    <div className="header-document relative flex min-w-0 items-center border-l border-neutral-800 pl-3">
                        <FileText size={14} className="mr-2 shrink-0 text-neutral-500" />
                        <input
                            type="text"
                            value={resume.versionName || ""}
                            onChange={(e) => updateVersionName(e.target.value)}
                            className="w-36 min-w-0 border-0 bg-transparent px-1 py-1.5 text-sm font-medium text-neutral-200 outline-none placeholder:text-neutral-600 focus:text-white md:w-44"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setOpenMenu(openMenu === "document" ? null : "document");
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                            aria-label="이력서 관리 메뉴"
                            aria-expanded={openMenu === "document"}
                        >
                            <ChevronDown size={15} />
                        </button>

                        {openMenu === "document" && (
                            <div className="header-menu absolute left-0 top-11 w-full overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 p-1.5 shadow-2xl">
                                <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium text-neutral-500">내 이력서</p>
                                <div
                                    className="space-y-1"
                                    onKeyDown={(event) => {
                                        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                                        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-resume-switch]"));
                                        const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
                                        if (currentIndex < 0) return;
                                        event.preventDefault();
                                        const direction = event.key === "ArrowDown" ? 1 : -1;
                                        buttons[(currentIndex + direction + buttons.length) % buttons.length]?.focus();
                                    }}
                                >
                                    {orderedResumeList.map((item) => (
                                        <div key={item.id}>
                                            <div className={`group flex items-center rounded-lg border transition ${item.id === resume.id
                                                ? "border-blue-500/80 bg-blue-500/[0.06] hover:bg-blue-500/10"
                                                : "border-transparent hover:bg-neutral-800"
                                                }`}>
                                                <button
                                                    type="button"
                                                    data-resume-switch
                                                    aria-current={item.id === resume.id ? "page" : undefined}
                                                    onClick={() => {
                                                        const isDifferentResume = item.id !== resume.id;
                                                        switchResume(item.id);
                                                        setOpenMenu(null);
                                                        if (isDifferentResume) {
                                                            setToastMessage(`'${item.versionName}' 이력서를 불러왔어요.`);
                                                        }
                                                    }}
                                                    className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-2 text-left text-xs ${item.id === resume.id
                                                        ? "font-semibold text-neutral-100"
                                                        : "font-normal text-neutral-200"
                                                        }`}
                                                >
                                                    <span className="tooltip-anchor truncate" data-tooltip={item.versionName} title={item.versionName}>{item.versionName}</span>
                                                    {item.id === resume.id && <Check size={15} strokeWidth={2.5} className="shrink-0 text-blue-400" />}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={(resumeList || []).length <= 1}
                                                    onClick={() => {
                                                        setOpenMenu(null);
                                                        setDialog({
                                                            title: "이력서를 삭제할까요?",
                                                            message: `'${item.versionName}' 이력서는 삭제 후 복구할 수 없습니다.`,
                                                            variant: "danger",
                                                            confirmLabel: "삭제",
                                                            cancelLabel: "취소",
                                                            action: () => {
                                                                deleteResume(item.id);
                                                                setToastMessage(`'${item.versionName}' 이력서를 삭제했어요.`);
                                                            },
                                                        });
                                                    }}
                                                    className="tooltip-anchor mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30"
                                                    data-tooltip={`${item.versionName} 삭제`}
                                                    aria-label={`${item.versionName} 삭제`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="my-1 border-t border-neutral-800" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        createNewResume("새 이력서");
                                        setOpenMenu(null);
                                        setToastMessage("'새 이력서'를 만들고 편집 화면으로 이동했어요.");
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                                >
                                    <Plus size={14} /> 새 이력서
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const sourceName = resume.versionName;
                                        duplicateCurrentResume();
                                        setOpenMenu(null);
                                        setToastMessage(`'${sourceName}' 이력서를 복제했어요.`);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                                >
                                    <Copy size={14} /> 현재 이력서 복제
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="header-history flex shrink-0 items-center gap-0.5 border-l border-neutral-800 pl-3">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className="header-icon-button rounded-md p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                            data-tooltip="실행 취소 (Ctrl+Z)"
                        >
                            <Undo2 size={15} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className="header-icon-button rounded-md p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                            data-tooltip="다시 실행 (Ctrl+Y)"
                        >
                            <Redo2 size={15} />
                        </button>
                    </div>

                    <div className="relative hidden shrink-0 sm:block">
                        <button
                            type="button"
                            onClick={() => setOpenMenu(openMenu === "blocks" ? null : "blocks")}
                            className="header-button header-button--outline flex h-8 items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-xs font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800"
                            aria-expanded={openMenu === "blocks"}
                        >
                            <Plus size={14} /> 블록 추가 <ChevronDown size={13} className="ml-0.5 text-neutral-500" />
                        </button>
                        {openMenu === "blocks" && (
                            <div className="header-menu absolute left-0 top-10 grid w-52 grid-cols-2 gap-1 rounded-xl border border-neutral-700 bg-neutral-900 p-1.5 shadow-2xl">
                                {blockButtons.map((button) => (
                                    <button
                                        key={button.type}
                                        type="button"
                                        onClick={() => {
                                            addBlock(button.type);
                                            setOpenMenu(null);
                                        }}
                                        className="rounded-lg px-2.5 py-2 text-left text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                                    >
                                        {button.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <PublishResumeButton />
                    {shouldShowSample && (
                        <button
                            type="button"
                            onClick={handleLoadPreset}
                            className="header-button header-button--secondary hidden h-8 items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 text-xs font-medium text-blue-300 transition hover:border-blue-500/50 hover:bg-blue-500/20 sm:flex"
                            data-tooltip="Bripick 샘플 이력서로 시작하기"
                        >
                            <Sparkles size={14} /> 샘플로 시작
                        </button>
                    )}
                    <button
                        onClick={() => setIsAtsModalOpen(true)}
                        className="header-button header-button--ats flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition active:scale-[0.98]"
                        data-tooltip="ATS 이력서 완성도 진단"
                    >
                        <ShieldCheck size={14} aria-hidden="true" />
                        <span className="hidden sm:inline">ATS 검사</span>
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="header-button header-button--primary flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
                    >
                        <Download size={14} /> <span className="hidden sm:inline">PDF 저장</span>
                    </button>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="header-icon-button flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                        data-tooltip={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
                        aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
                    >
                        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                    </button>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setOpenMenu(openMenu === "more" ? null : "more")}
                            className="header-icon-button flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                            aria-label="더보기"
                            aria-expanded={openMenu === "more"}
                        >
                            <MoreHorizontal size={17} />
                        </button>
                        {openMenu === "more" && (
                            <div className="header-menu absolute right-0 top-10 w-48 rounded-xl border border-neutral-700 bg-neutral-900 p-1.5 shadow-2xl">
                                {!shouldShowSample && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpenMenu(null);
                                            handleLoadPreset();
                                        }}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                                    >
                                        <Sparkles size={14} /> 샘플 불러오기
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenMenu(null);
                                        fileInputRef.current?.click();
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                                >
                                    <Upload size={14} /> JSON 불러오기
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenMenu(null);
                                        handleDownloadJSON();
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                                >
                                    <FileCode size={14} /> JSON 백업
                                </button>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleUploadJSON}
                        accept=".json"
                        className="hidden"
                    />
                </div>
            </header>

            {/* ATS 진단 모달 */}
            <AtsCheckerModal
                isOpen={isAtsModalOpen}
                onClose={() => setIsAtsModalOpen(false)}
            />
            {toastMessage && (
                <div className="pointer-events-none fixed inset-x-0 top-16 z-[80] flex justify-center px-4">
                    <div
                        role="status"
                        aria-live="polite"
                        className="service-toast inline-flex w-fit max-w-full items-center gap-2.5 rounded-xl border border-blue-500/35 bg-[#171c26] px-4 py-3 text-xs font-medium text-neutral-100 shadow-2xl"
                    >
                        <CheckCircle2 size={17} className="shrink-0 text-blue-400" aria-hidden="true" />
                        {toastMessage}
                    </div>
                </div>
            )}
            <ServiceDialog
                isOpen={dialog !== null}
                title={dialog?.title || ""}
                message={dialog?.message || ""}
                variant={dialog?.variant}
                confirmLabel={dialog?.confirmLabel}
                cancelLabel={dialog?.cancelLabel}
                onConfirm={confirmDialog}
                onCancel={dialog?.cancelLabel ? closeDialog : undefined}
            />
        </>
    );
}
