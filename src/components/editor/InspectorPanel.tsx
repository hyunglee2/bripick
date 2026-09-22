// src/components/editor/InspectorPanel.tsx
"use client";

import { useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { ProfileData } from "@/types/resume";
import { getProfileContacts, withProfileContacts } from "@/lib/profileContacts";
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
    Eye,
    EyeOff,
    Check,
    RotateCcw,
} from "lucide-react";

const DEFAULT_GLOBAL_STYLE = {
    fontFamily: "'Pretendard', sans-serif",
    primaryColor: "#2f80c3",
    contentWidth: 800,
    basePadding: 36,
    displayTitleFontSize: 24,
    sectionTitleFontSize: 24,
    itemTitleFontSize: 15,
    bodyFontSize: 14,
    captionFontSize: 12,
    template: "modern" as const,
};

export default function InspectorPanel() {
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const blocks = useResumeStore((state) => state.resume.blocks);
    const globalStyle = useResumeStore((state) => state.resume.globalStyle);
    const updateGlobalStyle = useResumeStore((state) => state.updateGlobalStyle);
    const updateBlockTitle = useResumeStore((state) => state.updateBlockTitle);
    const updateBlockStyle = useResumeStore((state) => state.updateBlockStyle);
    const updateBlockData = useResumeStore((state) => state.updateBlockData);
    const removeBlock = useResumeStore((state) => state.removeBlock);
    const reorderBlocks = useResumeStore((state) => state.reorderBlocks);
    const toggleBlockVisibility = useResumeStore((state) => state.toggleBlockVisibility);

    const [newSkillInput, setNewSkillInput] = useState("");

    const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);
    const currentBlock = blocks[currentIndex];
    const profileContacts = currentBlock?.type === "profile"
        ? getProfileContacts(currentBlock.data as ProfileData)
        : [];

    const fontOptions = [
        { label: "Pretendard (기본 / 깔끔한 고딕)", value: "'Pretendard', -apple-system, sans-serif" },
        { label: "Noto Sans KR (안정적인 본문용)", value: "'Noto Sans KR', sans-serif" },
        { label: "Nanum Myeongjo (우아한 명조체)", value: "'Nanum Myeongjo', serif" },
        { label: "System UI (애플/윈도우 기본)", value: "system-ui, sans-serif" },
    ];

    const typographyControls = [
        { key: "displayTitleFontSize", label: "프로필 대표 제목", min: 20, max: 38, fallback: 24 },
        { key: "sectionTitleFontSize", label: "섹션 제목", min: 16, max: 32, fallback: 24 },
        { key: "itemTitleFontSize", label: "항목 제목", min: 12, max: 20, fallback: 15 },
        { key: "bodyFontSize", label: "본문", min: 10, max: 20, fallback: 14 },
        { key: "captionFontSize", label: "설명 · 보조 정보", min: 9, max: 15, fallback: 12 },
    ] as const;

    const accentColorPresets = [
        { value: "#ac1c1c", label: "딥 레드" },
        { value: "#fcc02c", label: "골든 옐로" },
        { value: "#057e0e", label: "포레스트 그린" },
        { value: "#1ca7ac", label: "아쿠아 틸" },
        { value: "#2f80c3", label: "클래식 블루" },
        { value: "#9c47b2", label: "오키드 퍼플" },
        { value: "#f25f8c", label: "비비드 핑크" },
        { value: "#334155", label: "슬레이트" },
    ] as const;

    // 1. 블록 미선택 시: 문서 전역 설정 패널
    if (!currentBlock) {
        return (
            <aside className="inspector-panel inspector-panel--global w-[clamp(380px,30vw,480px)] shrink-0 border-l border-neutral-800 bg-[#12131a] p-6 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div className="flex items-center gap-2">
                            <Sliders size={15} className="text-blue-500" />
                            <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                                문서 전역 설정
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => updateGlobalStyle(DEFAULT_GLOBAL_STYLE)}
                            className="inspector-reset-button"
                            title="문서 전역 설정을 기본값으로 복원"
                        >
                            <RotateCcw size={12} aria-hidden="true" />
                            기본값 복원
                        </button>
                    </div>

                    <div className="inspector-context-banner" role="note">
                        <Sparkles size={15} aria-hidden="true" />
                        <p>캔버스의 빈 영역을 클릭하면 언제든 전역 설정으로 돌아올 수 있어요.</p>
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

                    {/* 문서 타이포그래피 크기 */}
                    <details className="group border-t border-neutral-800 pt-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between rounded px-1 py-1.5 text-neutral-300 transition hover:bg-neutral-800/60 [&::-webkit-details-marker]:hidden">
                            <span className="flex items-center gap-1.5 text-xs font-medium">
                                <Type size={13} /> 글자 크기
                            </span>
                            <ChevronDown size={15} className="text-neutral-500 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-3 space-y-3 px-1">
                            <p className="text-[10px] text-neutral-500">문서 종류별 크기를 개별 조정합니다.</p>
                            {typographyControls.map(({ key, label, min, max, fallback }) => {
                                const value = globalStyle?.[key] ?? fallback;
                                return (
                                    <div key={key} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-neutral-300">{label}</span>
                                            <span className="font-mono text-neutral-400">{value}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={min}
                                            max={max}
                                            step="1"
                                            value={value}
                                            onChange={(e) => updateGlobalStyle({ [key]: Number(e.target.value) })}
                                            className="w-full accent-blue-500 cursor-pointer"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </details>

                    {/* 포인트 컬러 지정 */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                            <Palette size={13} /> 테마 포인트 컬러
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="color"
                                value={globalStyle?.primaryColor || "#2f80c3"}
                                onChange={(e) => updateGlobalStyle({ primaryColor: e.target.value })}
                                className="h-8 w-8 shrink-0 cursor-pointer rounded border border-neutral-700 bg-transparent"
                                aria-label="사용자 지정 포인트 컬러"
                            />
                            <span className="text-xs text-neutral-400 font-mono">
                                {globalStyle?.primaryColor || "#2f80c3"}
                            </span>
                            <div className="ml-auto flex items-center gap-1.5" aria-label="추천 포인트 컬러">
                                {accentColorPresets.map((color) => {
                                    const isSelected = (globalStyle?.primaryColor || "#2f80c3").toLowerCase() === color.value;
                                    return (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => updateGlobalStyle({ primaryColor: color.value })}
                                            title={`${color.label} ${color.value}`}
                                            aria-label={`${color.label} ${color.value}`}
                                            aria-pressed={isSelected}
                                        className={`inspector-color-swatch h-5 w-5 rounded-full border-2 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#2f80c3]/70 ${isSelected
                                                    ? "border-white shadow-[0_0_0_2px_rgba(47,128,195,0.55)]"
                                                    : "border-neutral-700 hover:border-neutral-400"
                                                }`}
                                            style={{ backgroundColor: color.value }}
                                        />
                                    );
                                })}
                            </div>
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
                                aria-pressed={(globalStyle?.template || "modern") === "modern"}
                                className="inspector-template-card"
                            >
                                <span className="inspector-template-card__copy">
                                    <span className="inspector-template-card__title">Modern</span>
                                    <span className="inspector-template-card__description">Bripick 시그니처 디자인</span>
                                </span>
                                <Check className="inspector-template-card__check" aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => updateGlobalStyle({ template: "minimal" })}
                                aria-pressed={globalStyle?.template === "minimal"}
                                className="inspector-template-card"
                            >
                                <span className="inspector-template-card__copy">
                                    <span className="inspector-template-card__title">Minimal</span>
                                    <span className="inspector-template-card__description">군더더기 없는 선형</span>
                                </span>
                                <Check className="inspector-template-card__check" aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                </div>
            </aside>
        );
    }

    // --- 공통 블록 조작 ---
    const handleProfilePhotoUpload = (file?: File) => {
        if (!file || currentBlock.type !== "profile") return;

        const reader = new FileReader();
        reader.onload = () => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement("canvas");
                const size = 640;
                const scale = Math.max(size / image.width, size / image.height);
                const width = image.width * scale;
                const height = image.height * scale;
                canvas.width = size;
                canvas.height = size;
                const context = canvas.getContext("2d");
                if (!context) return;
                context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
                updateBlockData(currentBlock.id, {
                    ...currentBlock.data,
                    photo: canvas.toDataURL("image/jpeg", 0.86),
                    showPhoto: true,
                });
            };
            image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    };

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
        <aside className="inspector-panel inspector-panel--block w-[clamp(380px,30vw,480px)] shrink-0 border-l border-neutral-800 bg-[#12131a] p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
                {/* 상단 블록 타이틀 및 액션 버튼들 (눈 모양 토글 버튼 포함) */}
                <div className="inspector-heading flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        <Layers size={14} className="text-blue-500" />
                        <span>{currentBlock.type} 설정</span>
                        {currentBlock.isVisible === false && (
                            <span className="text-[10px] bg-red-950/60 text-red-400 px-1.5 py-0.5 rounded border border-red-900/60 lowercase font-normal">
                                숨김
                            </span>
                        )}
                    </div>
                    <div className="inspector-actions flex items-center gap-1">
                        {/* 눈 모양 숨기기/보이기 토글 버튼 */}
                        <button
                            onClick={() => toggleBlockVisibility(currentBlock.id)}
                            className={`p-1 rounded transition ${currentBlock.isVisible === false
                                    ? "text-red-400 hover:text-red-300 hover:bg-red-950/40"
                                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                }`}
                            title={currentBlock.isVisible === false ? "블록 표시하기" : "블록 숨기기"}
                        >
                            {currentBlock.isVisible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>

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

                <div className="inspector-field space-y-1.5">
                    <label className="text-xs font-medium text-neutral-300 block">블록 제목</label>
                    <input
                        type="text"
                        value={currentBlock.title || ""}
                        placeholder="블록 제목을 입력하세요"
                        onChange={(e) => updateBlockTitle(currentBlock.id, e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-neutral-500">캔버스와 PDF의 섹션 제목에 바로 반영됩니다.</p>
                </div>

                {/* 1. 스타일 설정 섹션 */}
                <div className="inspector-card space-y-4">
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

                    <div className="flex items-center justify-between pt-2">
                        <div>
                            <span className="text-xs text-neutral-300 block">한 페이지에 묶기</span>
                            <span className="text-[10px] text-neutral-500">끄면 긴 내용을 다음 장에 이어서 표시합니다.</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={currentBlock.style.keepTogether === true}
                            onChange={(e) => updateBlockStyle(currentBlock.id, { keepTogether: e.target.checked })}
                            className="accent-blue-500 w-4 h-4 cursor-pointer"
                        />
                    </div>
                </div>

                {/* 2. 블록별 데이터 입력 폼 */}

                {/* [프로필 폼] */}
                {currentBlock.type === "profile" && (
                    <div className="inspector-section space-y-4 border-t border-neutral-800 pt-4">
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-xs text-neutral-400">프로필 사진</label>
                                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-400">
                                    <input
                                        type="checkbox"
                                        checked={currentBlock.data.showPhoto !== false}
                                        onChange={(event) => updateBlockData(currentBlock.id, {
                                            ...currentBlock.data,
                                            showPhoto: event.target.checked,
                                        })}
                                        className="h-3.5 w-3.5 accent-[#2f80c3]"
                                    />
                                    사진 표시
                                </label>
                            </div>
                            <div className={`inspector-photo-row flex items-center gap-3${currentBlock.data.showPhoto === false ? " opacity-45" : ""}`}>
                                {currentBlock.data.photo && (
                                    <img src={currentBlock.data.photo} alt="프로필 미리보기" className="w-12 h-12 rounded-lg object-cover" />
                                )}
                                <label className="inspector-upload-button cursor-pointer rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:border-blue-500">
                                    사진 선택
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(e) => handleProfilePhotoUpload(e.target.files?.[0])}
                                    />
                                </label>
                                {currentBlock.data.photo && (
                                    <button
                                        onClick={() => updateBlockData(currentBlock.id, { ...currentBlock.data, photo: "" })}
                                        className="text-[11px] text-neutral-500 hover:text-red-400"
                                    >
                                        제거
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="mb-1 flex items-baseline justify-between gap-2">
                                <label className="text-xs text-neutral-400">한 줄 소개</label>
                                <span className="text-[10px] text-neutral-500">이름·직무 앞에 표시</span>
                            </div>
                            <textarea
                                rows={2}
                                value={currentBlock.data.bio || ""}
                                placeholder="예: 사용자 중심의 서비스를 만드는"
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { ...currentBlock.data, bio: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none"
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
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-neutral-400">CONTACTS</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextContacts = [
                                            ...profileContacts,
                                            { id: `contact-${Date.now()}`, label: "", value: "" },
                                        ];
                                        updateBlockData(
                                            currentBlock.id,
                                            withProfileContacts(currentBlock.data as ProfileData, nextContacts),
                                        );
                                    }}
                                    className="flex items-center gap-1 text-[11px] text-blue-400 transition hover:text-blue-300"
                                >
                                    <Plus size={12} /> 항목 추가
                                </button>
                            </div>
                            {profileContacts.length === 0 && (
                                <p className="inspector-empty-state rounded-lg border border-dashed border-neutral-700 px-3 py-3 text-center text-[11px] text-neutral-500">
                                    표시할 연락처 항목을 추가해 주세요.
                                </p>
                            )}
                            {profileContacts.map((contact, contactIndex) => (
                                <div key={contact.id} className="inspector-repeat-card inspector-contact-row">
                                    <div className="flex items-center gap-1.5">
                                        <input
                                        type="text"
                                        value={contact.label}
                                        placeholder="항목명"
                                        aria-label="연락처 항목명"
                                        onChange={(event) => {
                                            const nextContacts = profileContacts.map((item) => (
                                                item.id === contact.id ? { ...item, label: event.target.value } : item
                                            ));
                                            updateBlockData(
                                                currentBlock.id,
                                                withProfileContacts(currentBlock.data as ProfileData, nextContacts),
                                            );
                                        }}
                                        className="w-20 shrink-0 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                        />
                                        <input
                                        type="text"
                                        value={contact.value}
                                        placeholder="내용 또는 URL"
                                        aria-label={`${contact.label || "연락처"} 내용`}
                                        onChange={(event) => {
                                            const nextContacts = profileContacts.map((item) => (
                                                item.id === contact.id ? { ...item, value: event.target.value } : item
                                            ));
                                            updateBlockData(
                                                currentBlock.id,
                                                withProfileContacts(currentBlock.data as ProfileData, nextContacts),
                                            );
                                        }}
                                        className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                        />
                                        <div className="inspector-contact-order flex shrink-0 items-center rounded-md border border-neutral-800 bg-neutral-950/70 p-0.5">
                                            <button
                                                type="button"
                                                disabled={contactIndex === 0}
                                                onClick={() => {
                                                    const nextContacts = [...profileContacts];
                                                    [nextContacts[contactIndex - 1], nextContacts[contactIndex]] = [
                                                        nextContacts[contactIndex],
                                                        nextContacts[contactIndex - 1],
                                                    ];
                                                    nextContacts[0] = { ...nextContacts[0], inlineWithPrevious: false };
                                                    updateBlockData(
                                                        currentBlock.id,
                                                        withProfileContacts(currentBlock.data as ProfileData, nextContacts),
                                                    );
                                                }}
                                                className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200 disabled:pointer-events-none disabled:opacity-25"
                                                title={`${contact.label || "연락처"} 항목 위로 이동`}
                                                aria-label={`${contact.label || "연락처"} 항목 위로 이동`}
                                            >
                                                <ChevronUp size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={contactIndex === profileContacts.length - 1}
                                                onClick={() => {
                                                    const nextContacts = [...profileContacts];
                                                    [nextContacts[contactIndex], nextContacts[contactIndex + 1]] = [
                                                        nextContacts[contactIndex + 1],
                                                        nextContacts[contactIndex],
                                                    ];
                                                    nextContacts[0] = { ...nextContacts[0], inlineWithPrevious: false };
                                                    updateBlockData(
                                                        currentBlock.id,
                                                        withProfileContacts(currentBlock.data as ProfileData, nextContacts),
                                                    );
                                                }}
                                                className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200 disabled:pointer-events-none disabled:opacity-25"
                                                title={`${contact.label || "연락처"} 항목 아래로 이동`}
                                                aria-label={`${contact.label || "연락처"} 항목 아래로 이동`}
                                            >
                                                <ChevronDown size={13} />
                                            </button>
                                        </div>
                                        <button
                                        type="button"
                                        onClick={() => {
                                            const nextContacts = profileContacts.filter((item) => item.id !== contact.id);
                                            updateBlockData(
                                                currentBlock.id,
                                                withProfileContacts(currentBlock.data as ProfileData, nextContacts),
                                            );
                                        }}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"
                                        title={`${contact.label || "연락처"} 항목 삭제`}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                    {contactIndex > 0 && (
                                        <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 px-1 text-[11px] text-neutral-400">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(contact.inlineWithPrevious)}
                                                onChange={(event) => {
                                                    const nextContacts = profileContacts.map((item) => (
                                                        item.id === contact.id
                                                            ? { ...item, inlineWithPrevious: event.target.checked }
                                                            : item
                                                    ));
                                                    updateBlockData(
                                                        currentBlock.id,
                                                        withProfileContacts(currentBlock.data as ProfileData, nextContacts),
                                                    );
                                                }}
                                                className="accent-[#2f80c3]"
                                            />
                                            앞 항목과 같은 줄에 표시
                                        </label>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <label className="text-xs text-neutral-400">자기소개</label>
                                <div className="inspector-toggle-group flex rounded-lg border border-neutral-800 bg-neutral-950/70 p-0.5" aria-label="자기소개 표시 방식">
                                    <button
                                        type="button"
                                        onClick={() => updateBlockData(currentBlock.id, {
                                            ...currentBlock.data,
                                            introductionStyle: "bullets",
                                        })}
                                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                                            (currentBlock.data.introductionStyle || "bullets") === "bullets"
                                                ? "bg-[#2f80c3] text-white shadow-sm"
                                                : "text-neutral-500 hover:text-neutral-300"
                                        }`}
                                        aria-pressed={(currentBlock.data.introductionStyle || "bullets") === "bullets"}
                                    >
                                        불렛형
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateBlockData(currentBlock.id, {
                                            ...currentBlock.data,
                                            introductionStyle: "paragraph",
                                        })}
                                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                                            currentBlock.data.introductionStyle === "paragraph"
                                                ? "bg-[#2f80c3] text-white shadow-sm"
                                                : "text-neutral-500 hover:text-neutral-300"
                                        }`}
                                        aria-pressed={currentBlock.data.introductionStyle === "paragraph"}
                                    >
                                        줄글형
                                    </button>
                                </div>
                            </div>
                            <textarea
                                rows={5}
                                value={(currentBlock.data.highlights || []).join("\n")}
                                onChange={(e) => updateBlockData(currentBlock.id, {
                                    ...currentBlock.data,
                                    highlights: e.target.value.split("\n"),
                                })}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-y"
                            />
                            <p className="text-[10px] text-neutral-500">
                                문장별로 줄을 나눠 입력하세요. 줄글형에서는 자연스럽게 이어서 표시됩니다.
                            </p>
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
                                    className="inspector-repeat-card bg-neutral-900/90 border border-neutral-800 rounded p-3 space-y-3 relative"
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

                                    {/* 성과 불릿 목록 & STAR 칩 */}
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
                                                className="inspector-suggestion-chip text-[10px] bg-blue-950/60 border border-blue-800/60 text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-blue-900/60 transition"
                                            >
                                                <Sparkles size={10} /> 성능 개선형
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleAddExpBullet(exp.id, "디자인 시스템 공통 컴포넌트 구축으로 개발 리드타임 30% 개선")
                                                }
                                                className="inspector-suggestion-chip text-[10px] bg-neutral-800 border border-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-neutral-700 transition"
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
                                    className="inspector-repeat-card bg-neutral-900/90 border border-neutral-800 rounded p-3 space-y-3 relative"
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
                                    className="inspector-badge inline-flex items-center gap-1 text-xs bg-neutral-800 border border-neutral-700 text-neutral-200 px-2 py-1 rounded"
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
                                    className="inspector-repeat-card bg-neutral-900/90 border border-neutral-800 rounded p-3 space-y-2.5 relative"
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
                                    className="inspector-repeat-card bg-neutral-900/90 border border-neutral-800 rounded p-3 space-y-2.5 relative"
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
