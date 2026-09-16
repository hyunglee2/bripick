// src/components/editor/EditorHeader.tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import AtsCheckerModal from "@/components/editor/AtsCheckerModal";
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
} from "lucide-react";
import { BlockType, ResumeDocument } from "@/types/resume";

export default function EditorHeader() {
    const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);

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

    const blockButtons: { label: string; type: BlockType }[] = [
        { label: "+ 경력", type: "experience" },
        { label: "+ 프로젝트", type: "project" },
        { label: "+ 기술 스택", type: "skills" },
        { label: "+ 학력", type: "education" },
        { label: "+ 자격/수상", type: "certification" },
        { label: "+ 자유 텍스트", type: "custom_text" },
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
                        alert("이력서 데이터를 성공적으로 불러왔습니다!");
                    } else {
                        alert("올바르지 않은 이력서 JSON 파일 형식입니다.");
                    }
                } catch {
                    alert("JSON 파일을 파싱하는 중 오류가 발생했습니다.");
                }
            };
        }
    };

    const handleLoadPreset = () => {
        if (!confirm("현재 작성 중인 내용이 샘플 이력서로 대체됩니다. 계속하시겠습니까?"))
            return;

        const samplePreset: ResumeDocument = {
            id: `preset-${Date.now()}`,
            versionName: "시니어 프론트엔드 엔지니어 이력서",
            updatedAt: new Date().toISOString(),
            globalStyle: {
                fontFamily: "'Pretendard', sans-serif",
                primaryColor: "#2563eb",
                contentWidth: 800,
                basePadding: 36,
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
                        role: "Frontend Architect / Team Lead",
                        email: "bripick.dev@gmail.com",
                        phone: "010-9876-5432",
                        location: "Seoul, Korea",
                        bio: "대규모 트래픽 환경에서의 렌더링 최적화와 모듈러 웹 시스템 설계를 지향합니다.\n복잡한 상태 관리를 단순화하고 프로덕트의 비즈니스 임팩트를 코드로 증명합니다.",
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
                        skills: [
                            "TypeScript",
                            "Next.js",
                            "React",
                            "Zustand",
                            "Tailwind CSS",
                            "Web Performance",
                            "Design System",
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

        loadResume(samplePreset);
    };

    return (
        <>
            <header className="h-14 border-b border-neutral-800 bg-[#12131a] px-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-black text-xs text-white shadow-sm">
                            B
                        </div>
                        <span className="font-bold tracking-tight text-white hidden sm:inline">Bripick</span>
                    </div>

                    {/* 버전 관리 */}
                    <div className="flex items-center gap-1.5 border-l border-neutral-800 pl-3">
                        <FileText size={14} className="text-neutral-500" />
                        <input
                            type="text"
                            value={resume.versionName || ""}
                            onChange={(e) => updateVersionName(e.target.value)}
                            className="w-36 bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 font-medium"
                            title="현재 이력서 이름 수정"
                        />

                        <select
                            value={resume.id}
                            onChange={(e) => switchResume(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-300 focus:outline-none cursor-pointer max-w-[120px] truncate"
                        >
                            {(resumeList || []).map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.versionName}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={duplicateCurrentResume}
                            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition"
                            title="현재 이력서 복제 (사본 생성)"
                        >
                            <Copy size={14} />
                        </button>

                        <button
                            onClick={() => createNewResume("새 이력서")}
                            className="p-1 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded transition"
                            title="새 빈 이력서 생성"
                        >
                            <Plus size={15} />
                        </button>

                        <button
                            onClick={() => {
                                if (confirm(`'${resume.versionName}' 이력서를 정말 삭제하시겠습니까?`)) {
                                    deleteResume(resume.id);
                                }
                            }}
                            disabled={(resumeList || []).length <= 1}
                            className="p-1 text-neutral-500 hover:text-red-400 disabled:opacity-20 hover:bg-neutral-800 rounded transition"
                            title="현재 이력서 삭제"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    {/* Undo / Redo */}
                    <div className="flex items-center gap-0.5 border-l border-neutral-800 pl-3">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition"
                            title="실행 취소 (Ctrl+Z)"
                        >
                            <Undo2 size={15} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition"
                            title="다시 실행 (Ctrl+Y)"
                        >
                            <Redo2 size={15} />
                        </button>
                    </div>

                    {/* 블록 추가 버튼 */}
                    <div className="hidden lg:flex items-center gap-1.5 border-l border-neutral-800 pl-4">
                        <span className="text-xs text-neutral-400 mr-1 flex items-center gap-1">
                            <Plus size={14} /> 블록:
                        </span>
                        {blockButtons.map((btn) => (
                            <button
                                key={btn.type}
                                onClick={() => addBlock(btn.type)}
                                className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition active:scale-95"
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 우측 유틸리티 버튼들 */}
                <div className="flex items-center gap-2">
                    {/* ATS 완성도 진단기 버튼 */}
                    <button
                        onClick={() => setIsAtsModalOpen(true)}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 font-medium transition active:scale-95"
                        title="ATS 이력서 완성도 진단"
                    >
                        <ShieldCheck size={14} className="text-emerald-400" /> ATS 검사
                    </button>

                    <button
                        onClick={handleLoadPreset}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 transition"
                        title="완성형 개발자 샘플 불러오기"
                    >
                        <Sparkles size={13} className="text-purple-400" /> 샘플
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleUploadJSON}
                        accept=".json"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition"
                        title="JSON 파일로 불러오기"
                    >
                        <Upload size={13} /> 불러오기
                    </button>
                    <button
                        onClick={handleDownloadJSON}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition"
                        title="JSON 파일로 백업"
                    >
                        <FileCode size={13} /> 백업
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 font-medium text-white transition shadow-sm active:scale-95"
                    >
                        <Download size={13} /> PDF 저장
                    </button>
                </div>
            </header>

            {/* ATS 진단 모달 */}
            <AtsCheckerModal
                isOpen={isAtsModalOpen}
                onClose={() => setIsAtsModalOpen(false)}
            />
        </>
    );
}