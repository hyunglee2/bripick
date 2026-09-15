// src/components/editor/InspectorPanel.tsx
"use client";

import { useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import {
    Trash2,
    ChevronUp,
    ChevronDown,
    Plus,
    X,
    Sliders,
    Palette,
    Sparkles,
    Layers,
    Type,
} from "lucide-react";

export default function InspectorPanel() {
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const blocks = useResumeStore((state) => state.resume.blocks);
    const globalStyle = useResumeStore((state) => state.resume.globalStyle);
    const updateGlobalStyle = useResumeStore((state) => state.updateGlobalStyle);
    const updateBlockStyle = useResumeStore((state) => state.updateBlockStyle);
    const updateBlockData = useResumeStore((state) => state.updateBlockData);
    const removeBlock = useResumeStore((state) => state.removeBlock);
    const reorderBlocks = useResumeStore((state) => state.reorderBlocks);

    const [newSkillInput, setNewSkillInput] = useState("");

    const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);
    const currentBlock = blocks[currentIndex];

    // 폰트 옵션 목록
    const fontOptions = [
        { label: "Pretendard (기본 / 깔끔한 고딕)", value: "'Pretendard', -apple-system, sans-serif" },
        { label: "Noto Sans KR (안정적인 본문용)", value: "'Noto Sans KR', sans-serif" },
        { label: "Nanum Myeongjo (우아한 명조체)", value: "'Nanum Myeongjo', serif" },
        { label: "System UI (애플/윈도우 기본)", value: "system-ui, sans-serif" },
    ];

    // 1. 블록 미선택 시: 문서 전역 설정 패널
    if (!currentBlock) {
        return (
            <aside className="w-80 border-l border-neutral-800 bg-[#12131a] p-6 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                        <Sliders size={15} className="text-blue-500" />
                        <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                            문서 전역 설정
                        </span>
                    </div>

                    {/* 서체(폰트) 선택 */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                            <Type size={13} /> 국문/영문 서체
                        </label>
                        <select
                            value={globalStyle?.fontFamily || fontOptions[0].value}
                            onChange={(e) => updateGlobalStyle({ fontFamily: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                            {fontOptions.map((f) => (
                                <option key={f.value} value={f.value}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 포인트 컬러 지정 */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                            <Palette size={13} /> 테마 포인트 컬러
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={globalStyle?.primaryColor || "#3b82f6"}
                                onChange={(e) => updateGlobalStyle({ primaryColor: e.target.value })}
                                className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
                            />
                            <span className="text-xs text-neutral-400 font-mono">
                                {globalStyle?.primaryColor || "#3b82f6"}
                            </span>
                        </div>
                    </div>

                    {/* 캔버스 기본 여백 */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-neutral-300">용지 안쪽 여백</span>
                            <span className="text-neutral-400 font-mono">{globalStyle?.basePadding || 36}px</span>
                        </div>
                        <input
                            type="range"
                            min="20"
                            max="64"
                            step="4"
                            value={globalStyle?.basePadding || 36}
                            onChange={(e) => updateGlobalStyle({ basePadding: Number(e.target.value) })}
                            className="w-full accent-blue-500 cursor-pointer"
                        />
                    </div>

                    {/* 캔버스 최대 가로폭 */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-neutral-300">캔버스 가로 너비</span>
                            <span className="text-neutral-400 font-mono">{globalStyle?.contentWidth || 800}px</span>
                        </div>
                        <input
                            type="range"
                            min="720"
                            max="900"
                            step="20"
                            value={globalStyle?.contentWidth || 800}
                            onChange={(e) => updateGlobalStyle({ contentWidth: Number(e.target.value) })}
                            className="w-full accent-blue-500 cursor-pointer"
                        />
                    </div>

                    {/* 템플릿 스타일 선택 */}
                    <div className="space-y-2 border-t border-neutral-800 pt-4">
                        <label className="text-xs font-medium text-neutral-300 block">
                            이력서 레이아웃 템플릿
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => updateGlobalStyle({ template: "modern" })}
                                className={`p-2.5 rounded text-xs font-medium border text-left transition ${(globalStyle?.template || "modern") === "modern"
                                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                                    : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                    }`}
                            >
                                <div className="font-bold">Modern</div>
                                <div className="text-[10px] opacity-75">입체감 있는 카드형</div>
                            </button>
                            <button
                                onClick={() => updateGlobalStyle({ template: "minimal" })}
                                className={`p-2.5 rounded text-xs font-medium border text-left transition ${globalStyle?.template === "minimal"
                                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                                    : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                    }`}
                            >
                                <div className="font-bold">Minimal</div>
                                <div className="text-[10px] opacity-75">군더더기 없는 선형</div>
                            </button>
                        </div>
                    </div>

                    <div className="p-3 bg-neutral-900/60 rounded border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
                        캔버스의 빈 영역을 클릭하면 언제든 이 전역 설정 화면으로 돌아옵니다.
                    </div>
                </div>
            </aside>
        );
    }

    // --- 공통 블록 조작 ---
    const handleMoveUp = () => {
        if (currentIndex > 0) reorderBlocks(currentIndex, currentIndex - 1);
    };

    const handleMoveDown = () => {
        if (currentIndex < blocks.length - 1) reorderBlocks(currentIndex, currentIndex + 1);
    };

    // --- 경력(Experience) 핸들러 ---
    const handleAddExperienceItem = () => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const newItem = {
            id: `exp-${Date.now()}`,
            company: "새로운 회사",
            role: "직무를 입력하세요",
            startDate: "2024.01",
            endDate: "재직 중",
            description: ["주요 업무 및 달성한 성과를 입력하세요."],
        };
        updateBlockData(currentBlock.id, [...prevData, newItem]);
    };

    const handleUpdateExpField = (expId: string, field: string, value: any) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => (item.id === expId ? { ...item, [field]: value } : item))
        );
    };

    const handleRemoveExpItem = (expId: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.filter((item: any) => item.id !== expId)
        );
    };

    const handleAddExpBullet = (expId: string, text = "") => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => {
                if (item.id !== expId) return item;
                const currentDesc = Array.isArray(item.description) ? item.description : [];
                return { ...item, description: [...currentDesc, text || "새로운 성과 불릿 포인트"] };
            })
        );
    };

    const handleUpdateExpBullet = (expId: string, index: number, value: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => {
                if (item.id !== expId) return item;
                const newDesc = [...item.description];
                newDesc[index] = value;
                return { ...item, description: newDesc };
            })
        );
    };

    const handleRemoveExpBullet = (expId: string, index: number) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => {
                if (item.id !== expId) return item;
                return {
                    ...item,
                    description: item.description.filter((_: any, i: number) => i !== index),
                };
            })
        );
    };

    // --- 프로젝트(Project) 핸들러 ---
    const handleAddProjectItem = () => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const newItem = {
            id: `proj-${Date.now()}`,
            title: "프로젝트 명",
            role: "담당 역할",
            startDate: "2025.01",
            endDate: "2025.06",
            link: "",
            description: ["프로젝트 핵심 기여도 및 결과물을 작성하세요."],
        };
        updateBlockData(currentBlock.id, [...prevData, newItem]);
    };

    // --- 학력(Education) 핸들러 ---
    const handleAddEducationItem = () => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const newItem = {
            id: `edu-${Date.now()}`,
            school: "대학교",
            major: "전공명",
            startDate: "2019.03",
            endDate: "2023.02",
            status: "졸업",
            score: "",
        };
        updateBlockData(currentBlock.id, [...prevData, newItem]);
    };

    const handleUpdateEduField = (eduId: string, field: string, value: any) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => (item.id === eduId ? { ...item, [field]: value } : item))
        );
    };

    const handleRemoveEduItem = (eduId: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.filter((item: any) => item.id !== eduId)
        );
    };

    // --- 자격/수상(Certification) 핸들러 ---
    const handleAddCertItem = () => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const newItem = {
            id: `cert-${Date.now()}`,
            title: "자격증 / 수상명",
            issuer: "발행 기관",
            date: "2024.01",
            description: "",
        };
        updateBlockData(currentBlock.id, [...prevData, newItem]);
    };

    const handleUpdateCertField = (certId: string, field: string, value: any) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => (item.id === certId ? { ...item, [field]: value } : item))
        );
    };

    const handleRemoveCertItem = (certId: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.filter((item: any) => item.id !== certId)
        );
    };

    const handleUpdateProjectField = (projId: string, field: string, value: any) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => (item.id === projId ? { ...item, [field]: value } : item))
        );
    };

    const handleRemoveProjectItem = (projId: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.filter((item: any) => item.id !== projId)
        );
    };

    const handleAddProjBullet = (projId: string, text = "") => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => {
                if (item.id !== projId) return item;
                const currentDesc = Array.isArray(item.description) ? item.description : [];
                return { ...item, description: [...currentDesc, text || "새로운 기여 항목"] };
            })
        );
    };

    const handleUpdateProjBullet = (projId: string, index: number, value: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => {
                if (item.id !== projId) return item;
                const newDesc = [...item.description];
                newDesc[index] = value;
                return { ...item, description: newDesc };
            })
        );
    };

    const handleRemoveProjBullet = (projId: string, index: number) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => {
                if (item.id !== projId) return item;
                return {
                    ...item,
                    description: item.description.filter((_: any, i: number) => i !== index),
                };
            })
        );
    };

    // --- 스킬(Skills) 핸들러 ---
    const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && newSkillInput.trim()) {
            e.preventDefault();
            const currentSkills = (currentBlock.data as any)?.skills || [];
            if (!currentSkills.includes(newSkillInput.trim())) {
                updateBlockData(currentBlock.id, {
                    skills: [...currentSkills, newSkillInput.trim()],
                });
            }
            setNewSkillInput("");
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        const currentSkills = (currentBlock.data as any)?.skills || [];
        updateBlockData(currentBlock.id, {
            skills: currentSkills.filter((s: string) => s !== skillToRemove),
        });
    };

    return (
        <aside className="w-80 border-l border-neutral-800 bg-[#12131a] p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
                {/* 상단 블록 타이틀 및 액션 버튼들 */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        <Layers size={14} className="text-blue-500" />
                        <span>{currentBlock.type} 설정</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleMoveUp}
                            disabled={currentIndex === 0}
                            className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                            title="위로 이동"
                        >
                            <ChevronUp size={16} />
                        </button>
                        <button
                            onClick={handleMoveDown}
                            disabled={currentIndex === blocks.length - 1}
                            className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                            title="아래로 이동"
                        >
                            <ChevronDown size={16} />
                        </button>
                        <button
                            onClick={() => removeBlock(currentBlock.id)}
                            className="p-1 text-neutral-500 hover:text-red-400 transition ml-1"
                            title="블록 삭제"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>

                {/* 1. 스타일 설정 섹션 */}
                <div className="space-y-3">
                    <label className="text-xs font-medium text-neutral-300 block">
                        상하 여백 (padding: {currentBlock.style.paddingY}px)
                    </label>
                    <input
                        type="range"
                        min="4"
                        max="48"
                        step="4"
                        value={currentBlock.style.paddingY}
                        onChange={(e) =>
                            updateBlockStyle(currentBlock.id, {
                                paddingY: Number(e.target.value),
                            })
                        }
                        className="w-full accent-blue-500 cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-neutral-300">하단 구분선 표시</span>
                        <input
                            type="checkbox"
                            checked={currentBlock.style.showDivider}
                            onChange={(e) =>
                                updateBlockStyle(currentBlock.id, {
                                    showDivider: e.target.checked,
                                })
                            }
                            className="accent-blue-500 w-4 h-4 cursor-pointer"
                        />
                    </div>
                </div>

                {/* 2. 블록별 데이터 입력 폼 */}

                {/* [프로필 폼] */}
                {currentBlock.type === "profile" && (
                    <div className="space-y-3 border-t border-neutral-800 pt-4">
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">이름</label>
                            <input
                                type="text"
                                value={currentBlock.data.name || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { ...currentBlock.data, name: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">직무(Role)</label>
                            <input
                                type="text"
                                value={currentBlock.data.role || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { ...currentBlock.data, role: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">이메일</label>
                            <input
                                type="text"
                                value={currentBlock.data.email || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { ...currentBlock.data, email: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">연락처</label>
                            <input
                                type="text"
                                value={currentBlock.data.phone || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { ...currentBlock.data, phone: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">한줄 소개</label>
                            <textarea
                                rows={3}
                                value={currentBlock.data.bio || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { ...currentBlock.data, bio: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* [경력 폼] */}
                {currentBlock.type === "experience" && (
                    <div className="space-y-4 border-t border-neutral-800 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-300">경력 목록</span>
                            <button
                                onClick={handleAddExperienceItem}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                            >
                                <Plus size={13} /> 회사 추가
                            </button>
                        </div>

                        {Array.isArray(currentBlock.data) &&
                            currentBlock.data.map((exp: any) => (
                                <div
                                    key={exp.id}
                                    className="bg-neutral-900/90 border border-neutral-800 rounded p-3 space-y-3 relative"
                                >
                                    <button
                                        onClick={() => handleRemoveExpItem(exp.id)}
                                        className="absolute top-2.5 right-2.5 text-neutral-500 hover:text-red-400 transition"
                                        title="경력 삭제"
                                    >
                                        <Trash2 size={13} />
                                    </button>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">회사명</label>
                                        <input
                                            type="text"
                                            value={exp.company || ""}
                                            onChange={(e) => handleUpdateExpField(exp.id, "company", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">직무 / 역할</label>
                                        <input
                                            type="text"
                                            value={exp.role || ""}
                                            onChange={(e) => handleUpdateExpField(exp.id, "role", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">시작일</label>
                                            <input
                                                type="text"
                                                value={exp.startDate || ""}
                                                onChange={(e) => handleUpdateExpField(exp.id, "startDate", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">종료일</label>
                                            <input
                                                type="text"
                                                value={exp.endDate || ""}
                                                onChange={(e) => handleUpdateExpField(exp.id, "endDate", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* 개별 불릿 리스트 & STAR 가이드 */}
                                    <div className="space-y-2 pt-1 border-t border-neutral-800">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] text-neutral-300 font-medium">성과 불릿 목록</label>
                                            <button
                                                onClick={() => handleAddExpBullet(exp.id)}
                                                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                                            >
                                                <Plus size={12} /> 불릿 추가
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            <button
                                                onClick={() =>
                                                    handleAddExpBullet(exp.id, "Next.js 마이그레이션을 통해 초기 로딩 속도 40% 단축")
                                                }
                                                className="text-[10px] bg-blue-950/60 border border-blue-800/60 text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-blue-900/60 transition"
                                            >
                                                <Sparkles size={10} /> 성능 개선형
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleAddExpBullet(exp.id, "디자인 시스템 공통 컴포넌트 구축으로 개발 리드타임 30% 개선")
                                                }
                                                className="text-[10px] bg-neutral-800 border border-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-neutral-700 transition"
                                            >
                                                <Sparkles size={10} /> 생산성 향상형
                                            </button>
                                        </div>

                                        <div className="space-y-1.5">
                                            {(exp.description || []).map((bullet: string, bIdx: number) => (
                                                <div key={bIdx} className="flex items-start gap-1.5">
                                                    <textarea
                                                        rows={2}
                                                        value={bullet}
                                                        onChange={(e) => handleUpdateExpBullet(exp.id, bIdx, e.target.value)}
                                                        className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none leading-snug"
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveExpBullet(exp.id, bIdx)}
                                                        className="text-neutral-500 hover:text-red-400 p-1 transition"
                                                        title="불릿 삭제"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* [프로젝트 폼] */}
                {currentBlock.type === "project" && (
                    <div className="space-y-4 border-t border-neutral-800 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-300">프로젝트 목록</span>
                            <button
                                onClick={handleAddProjectItem}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                            >
                                <Plus size={13} /> 프로젝트 추가
                            </button>
                        </div>

                        {Array.isArray(currentBlock.data) &&
                            currentBlock.data.map((proj: any) => (
                                <div
                                    key={proj.id}
                                    className="bg-neutral-900/90 border border-neutral-800 rounded p-3 space-y-3 relative"
                                >
                                    <button
                                        onClick={() => handleRemoveProjectItem(proj.id)}
                                        className="absolute top-2.5 right-2.5 text-neutral-500 hover:text-red-400 transition"
                                        title="프로젝트 삭제"
                                    >
                                        <Trash2 size={13} />
                                    </button>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">프로젝트명</label>
                                        <input
                                            type="text"
                                            value={proj.title || ""}
                                            onChange={(e) => handleUpdateProjectField(proj.id, "title", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">역할 / 기여도</label>
                                        <input
                                            type="text"
                                            value={proj.role || ""}
                                            onChange={(e) => handleUpdateProjectField(proj.id, "role", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">링크 URL (선택)</label>
                                        <input
                                            type="text"
                                            placeholder="https://github.com/..."
                                            value={proj.link || ""}
                                            onChange={(e) => handleUpdateProjectField(proj.id, "link", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">시작일</label>
                                            <input
                                                type="text"
                                                value={proj.startDate || ""}
                                                onChange={(e) => handleUpdateProjectField(proj.id, "startDate", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">종료일</label>
                                            <input
                                                type="text"
                                                value={proj.endDate || ""}
                                                onChange={(e) => handleUpdateProjectField(proj.id, "endDate", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* 프로젝트 불릿 목록 */}
                                    <div className="space-y-2 pt-1 border-t border-neutral-800">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] text-neutral-300 font-medium">기여/성과 불릿 목록</label>
                                            <button
                                                onClick={() => handleAddProjBullet(proj.id)}
                                                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                                            >
                                                <Plus size={12} /> 불릿 추가
                                            </button>
                                        </div>

                                        <div className="space-y-1.5">
                                            {(proj.description || []).map((bullet: string, bIdx: number) => (
                                                <div key={bIdx} className="flex items-start gap-1.5">
                                                    <textarea
                                                        rows={2}
                                                        value={bullet}
                                                        onChange={(e) => handleUpdateProjBullet(proj.id, bIdx, e.target.value)}
                                                        className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none leading-snug"
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveProjBullet(proj.id, bIdx)}
                                                        className="text-neutral-500 hover:text-red-400 p-1 transition"
                                                        title="불릿 삭제"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* [스킬 폼] */}
                {currentBlock.type === "skills" && (
                    <div className="space-y-3 border-t border-neutral-800 pt-4">
                        <label className="text-xs font-semibold text-neutral-300 block">
                            스킬 태그 입력 (Enter로 추가)
                        </label>
                        <input
                            type="text"
                            placeholder="예: TypeScript, Next.js"
                            value={newSkillInput}
                            onChange={(e) => setNewSkillInput(e.target.value)}
                            onKeyDown={handleAddSkill}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                        />

                        <div className="flex flex-wrap gap-1.5 pt-2">
                            {(((currentBlock.data as any)?.skills || []) as string[]).map((skill: string) => (
                                <span
                                    key={skill}
                                    className="inline-flex items-center gap-1 text-xs bg-neutral-800 border border-neutral-700 text-neutral-200 px-2 py-1 rounded"
                                >
                                    {skill}
                                    <button
                                        onClick={() => handleRemoveSkill(skill)}
                                        className="hover:text-red-400 text-neutral-400 transition"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* [학력(Education) 폼] */}
                {currentBlock.type === "education" && (
                    <div className="space-y-4 border-t border-neutral-800 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-300">학력 목록</span>
                            <button
                                onClick={handleAddEducationItem}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                            >
                                <Plus size={13} /> 학교 추가
                            </button>
                        </div>

                        {Array.isArray(currentBlock.data) &&
                            currentBlock.data.map((edu: any) => (
                                <div
                                    key={edu.id}
                                    className="bg-neutral-900/90 border border-neutral-800 rounded p-3 space-y-2.5 relative"
                                >
                                    <button
                                        onClick={() => handleRemoveEduItem(edu.id)}
                                        className="absolute top-2.5 right-2.5 text-neutral-500 hover:text-red-400 transition"
                                        title="학력 삭제"
                                    >
                                        <Trash2 size={13} />
                                    </button>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">학교명</label>
                                        <input
                                            type="text"
                                            value={edu.school || ""}
                                            onChange={(e) => handleUpdateEduField(edu.id, "school", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">전공</label>
                                        <input
                                            type="text"
                                            value={edu.major || ""}
                                            onChange={(e) => handleUpdateEduField(edu.id, "major", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">입학일</label>
                                            <input
                                                type="text"
                                                value={edu.startDate || ""}
                                                onChange={(e) => handleUpdateEduField(edu.id, "startDate", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">졸업일</label>
                                            <input
                                                type="text"
                                                value={edu.endDate || ""}
                                                onChange={(e) => handleUpdateEduField(edu.id, "endDate", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">상태 (졸업/재학)</label>
                                            <input
                                                type="text"
                                                value={edu.status || ""}
                                                onChange={(e) => handleUpdateEduField(edu.id, "status", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">학점 (선택)</label>
                                            <input
                                                type="text"
                                                placeholder="예: 3.8 / 4.5"
                                                value={edu.score || ""}
                                                onChange={(e) => handleUpdateEduField(edu.id, "score", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* [자격/수상(Certification) 폼] */}
                {currentBlock.type === "certification" && (
                    <div className="space-y-4 border-t border-neutral-800 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-300">자격 및 수상 목록</span>
                            <button
                                onClick={handleAddCertItem}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                            >
                                <Plus size={13} /> 항목 추가
                            </button>
                        </div>

                        {Array.isArray(currentBlock.data) &&
                            currentBlock.data.map((cert: any) => (
                                <div
                                    key={cert.id}
                                    className="bg-neutral-900/90 border border-neutral-800 rounded p-3 space-y-2.5 relative"
                                >
                                    <button
                                        onClick={() => handleRemoveCertItem(cert.id)}
                                        className="absolute top-2.5 right-2.5 text-neutral-500 hover:text-red-400 transition"
                                        title="항목 삭제"
                                    >
                                        <Trash2 size={13} />
                                    </button>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">자격/수상/시험명</label>
                                        <input
                                            type="text"
                                            value={cert.title || ""}
                                            onChange={(e) => handleUpdateCertField(cert.id, "title", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">발행/주관 기관</label>
                                            <input
                                                type="text"
                                                value={cert.issuer || ""}
                                                onChange={(e) => handleUpdateCertField(cert.id, "issuer", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">취득/수상 일자</label>
                                            <input
                                                type="text"
                                                value={cert.date || ""}
                                                onChange={(e) => handleUpdateCertField(cert.id, "date", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}


                {/* [자유 텍스트 폼] */}
                {currentBlock.type === "custom_text" && (
                    <div className="space-y-3 border-t border-neutral-800 pt-4">
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">섹션 제목</label>
                            <input
                                type="text"
                                value={currentBlock.title}
                                onChange={(e) => updateBlockStyle(currentBlock.id, { ...currentBlock.style })}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">내용</label>
                            <textarea
                                rows={6}
                                value={currentBlock.data?.content || ""}
                                onChange={(e) => updateBlockData(currentBlock.id, { content: e.target.value })}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none"
                                placeholder="내용을 입력하세요."
                            />
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}