// src/components/editor/EditorHeader.tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import AtsCheckerModal from "@/components/editor/AtsCheckerModal";
import ServiceDialog, { ServiceDialogVariant } from "@/components/ui/ServiceDialog";
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
        { label: "자격/수상", type: "certification" },
        { label: "자유 텍스트", type: "custom_text" },
    ];

    const contentBlocks = resume.blocks.filter((block) => block.type !== "page_break");
    const customContentCount = contentBlocks
        .flatMap((block) => collectContentStrings(block.data))
        .filter((value) => !STARTER_CONTENT.has(value)).length;
    const shouldShowSample = contentBlocks.length <= 2 && customContentCount < 3;

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
            versionName: "시니어 프론트엔드 엔지니어 이력서",
            updatedAt: new Date().toISOString(),
            globalStyle: {
                fontFamily: "'Pretendard', sans-serif",
                primaryColor: "#2f80c3",
                contentWidth: 800,
                basePadding: 36,
                blockGap: 18,
                displayTitleFontSize: 24,
                sectionTitleFontSize: 24,
                itemTitleFontSize: 15,
                bodyFontSize: 14,
                captionFontSize: 12,
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
                        role: "Frontend Architect",
                        email: "bripick.dev@gmail.com",
                        phone: "010-1234-5678",
                        bio: "사용자 경험과 비즈니스 성과를 연결하는",
                        photo: "/profile_default.png",
                        showPhoto: true,
                        blog: "https://blog.coreluma.kr",
                        github: "https://github.coreluma.kr",
                        contacts: [
                            { id: "contact-email", label: "Email", value: "bripick.dev@gmail.com" },
                            { id: "contact-phone", label: "Phone", value: "010-1234-5678" },
                            { id: "contact-blog", label: "Blog", value: "https://blog.coreluma.kr" },
                            { id: "contact-github", label: "GitHub", value: "https://github.coreluma.kr", inlineWithPrevious: true },
                        ],
                        highlights: [
                            "기획부터 디자인·개발·QA까지 제품의 전 과정을 경험한 프론트엔드 개발자입니다.",
                            "사용자 흐름과 비즈니스 목표를 연결해 서비스 아이디어를 실제 기능으로 구현합니다.",
                            "실시간 통신과 결제 기능을 포함한 글로벌 웹 서비스 개발 및 운영 경험이 있습니다.",
                            "로그와 데이터를 기반으로 문제를 분석하고 사용자 경험과 서비스 품질을 개선합니다.",
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
                            { id: "skills-frontend", name: "Frontend", skills: ["React", "Next.js", "Tailwind CSS", "TypeScript"] },
                            { id: "skills-collaboration", name: "Collaboration", skills: ["GitHub", "Figma", "Notion", "Slack"] },
                            { id: "skills-language", name: "Language", skills: ["JavaScript (ES6+)", "HTML5", "Python"] },
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
                            company: "Bripick Labs",
                            role: "Lead Frontend Engineer",
                            startDate: "2024.03",
                            endDate: "재직 중",
                            description: [
                                "모듈식 이력서 빌더 웹 서비스 코어 에디터 엔진 아키텍처 설계",
                                "Zustand 양방향 바인딩을 통해 블록 조작 시 불필요한 리렌더링 60% 절감",
                                "A4 프린트 전용 미디어 쿼리 최적화로 다이렉트 PDF 내보내기 파이프라인 완성",
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
                            title: "Bripick Core Resume Builder",
                            role: "개인 프로젝트 (1인 개발)",
                            startDate: "2026.01",
                            endDate: "진행 중",
                            link: "https://github.com/bripick",
                            description: [
                                "Tailwind CSS v4 & Turbopack 기반 초고속 개발 환경 구성",
                                "로컬 스토리지 자동 영속화(persist)로 새로고침 없는 안정적인 데이터 경험 제공",
                            ],
                        },
                    ],
                },
            ],
        };

        setDialog({
            title: "샘플 이력서를 불러올까요?",
            message: "현재 작성 중인 내용이 Bripick 샘플 이력서로 대체됩니다.",
            variant: "warning",
            confirmLabel: "샘플 불러오기",
            cancelLabel: "취소",
            action: () => loadResume(samplePreset),
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
                            title="현재 이력서 이름 수정"
                        />
                        <button
                            type="button"
                            onClick={() => setOpenMenu(openMenu === "document" ? null : "document")}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                            aria-label="이력서 관리 메뉴"
                            aria-expanded={openMenu === "document"}
                        >
                            <ChevronDown size={15} />
                        </button>

                        {openMenu === "document" && (
                            <div className="header-menu absolute left-3 top-11 w-64 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 p-1.5 shadow-2xl">
                                <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium text-neutral-500">내 이력서</p>
                                {(resumeList || []).map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            switchResume(item.id);
                                            setOpenMenu(null);
                                        }}
                                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs text-neutral-200 transition hover:bg-neutral-800"
                                    >
                                        <span className="truncate">{item.versionName}</span>
                                        {item.id === resume.id && <Check size={14} className="shrink-0 text-blue-400" />}
                                    </button>
                                ))}
                                <div className="my-1 border-t border-neutral-800" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        createNewResume("새 이력서");
                                        setOpenMenu(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                                >
                                    <Plus size={14} /> 새 이력서
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        duplicateCurrentResume();
                                        setOpenMenu(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                                >
                                    <Copy size={14} /> 현재 이력서 복제
                                </button>
                                <button
                                    type="button"
                                    disabled={(resumeList || []).length <= 1}
                                    onClick={() => {
                                        setOpenMenu(null);
                                        setDialog({
                                            title: "이력서를 삭제할까요?",
                                            message: `'${resume.versionName}' 이력서는 삭제 후 복구할 수 없습니다.`,
                                            variant: "danger",
                                            confirmLabel: "삭제",
                                            cancelLabel: "취소",
                                            action: () => deleteResume(resume.id),
                                        });
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-neutral-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30"
                                >
                                    <Trash2 size={14} /> 현재 이력서 삭제
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="header-history flex shrink-0 items-center gap-0.5 border-l border-neutral-800 pl-3">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className="header-icon-button rounded-md p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                            title="실행 취소 (Ctrl+Z)"
                        >
                            <Undo2 size={15} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className="header-icon-button rounded-md p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                            title="다시 실행 (Ctrl+Y)"
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
                    {shouldShowSample && (
                        <button
                            type="button"
                            onClick={handleLoadPreset}
                            className="header-button header-button--secondary hidden h-8 items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 text-xs font-medium text-blue-300 transition hover:border-blue-500/50 hover:bg-blue-500/20 sm:flex"
                            title="Bripick 샘플 이력서로 시작하기"
                        >
                            <Sparkles size={14} /> 샘플로 시작
                        </button>
                    )}
                    <button
                        onClick={() => setIsAtsModalOpen(true)}
                        className="header-button header-button--ats flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition active:scale-[0.98]"
                        title="ATS 이력서 완성도 진단"
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
                        title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
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
