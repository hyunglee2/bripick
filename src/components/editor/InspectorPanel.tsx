// src/components/editor/InspectorPanel.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { ProfileData, SkillCategory, SkillsData } from "@/types/resume";
import { getProfileContacts, withProfileContacts } from "@/lib/profileContacts";
import { getSkillCategories, withSkillCategories } from "@/lib/skills";
import { escapeHtml, richTextToPlainText, sanitizeInlineRichText } from "@/lib/richText";
import { createProfilePhotoDataUrl } from "@/lib/profilePhoto";
import ProjectBulletDocumentEditor from "@/components/editor/ProjectBulletDocumentEditor";
import { Kbd, KbdGroup } from "@/components/ui/Kbd";
import {
    Trash2,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
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
    GripVertical,
    ImagePlus,
    Link2,
    MoreHorizontal,
} from "lucide-react";

const DEFAULT_GLOBAL_STYLE = {
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

    const [newSkillInputs, setNewSkillInputs] = useState<Record<string, string>>({});
    const [expandedSkillCategoryId, setExpandedSkillCategoryId] = useState<string | null>(null);
    const [draggedContactIndex, setDraggedContactIndex] = useState<number | null>(null);
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
    const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
    const [editingEducationId, setEditingEducationId] = useState<string | null>(null);
    const [editingCertificationId, setEditingCertificationId] = useState<string | null>(null);
    const [expandedExperienceProjectId, setExpandedExperienceProjectId] = useState<string | null>(null);
    const blockPanelRef = useRef<HTMLElement>(null);

    useEffect(() => {
        blockPanelRef.current?.scrollTo({ top: 0 });
        setEditingExperienceId(null);
        setEditingEducationId(null);
        setEditingCertificationId(null);
        setExpandedExperienceProjectId(null);
    }, [selectedBlockId]);

    const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);
    const currentBlock = blocks[currentIndex];
    const profileContacts = currentBlock?.type === "profile"
        ? getProfileContacts(currentBlock.data as ProfileData)
        : [];
    const editingExperience = currentBlock?.type === "experience" && Array.isArray(currentBlock.data)
        ? currentBlock.data.find((experience: any) => experience.id === editingExperienceId)
        : undefined;
    const editingEducation = currentBlock?.type === "education" && Array.isArray(currentBlock.data)
        ? currentBlock.data.find((education: any) => education.id === editingEducationId)
        : undefined;
    const editingCertification = currentBlock?.type === "certification" && Array.isArray(currentBlock.data)
        ? currentBlock.data.find((certification: any) => certification.id === editingCertificationId)
        : undefined;

    useEffect(() => {
        if (currentBlock?.type !== "project" || !Array.isArray(currentBlock.data)) {
            setExpandedProjectId(null);
            return;
        }

        setExpandedProjectId((current) => (
            current && currentBlock.data.some((project: any) => project.id === current)
                ? current
                : currentBlock.data[0]?.id ?? null
        ));
    }, [currentBlock]);

    const fontOptions = [
        { label: "Pretendard (기본 / 깔끔한 고딕)", value: "'Pretendard', -apple-system, sans-serif" },
        { label: "Noto Sans KR (안정적인 본문용)", value: "'Noto Sans KR', sans-serif" },
        { label: "Nanum Myeongjo (우아한 명조체)", value: "'Nanum Myeongjo', serif" },
        { label: "System UI (애플/윈도우 기본)", value: "system-ui, sans-serif" },
    ];

    const typographyControls = [
        { key: "displayTitleFontSize", label: "프로필 대표 제목", min: 20, max: 38, fallback: 24 },
        { key: "sectionTitleFontSize", label: "섹션 제목", min: 16, max: 32, fallback: 24 },
        { key: "itemTitleFontSize", label: "항목 제목", min: 14, max: 22, fallback: 19 },
        { key: "bodyFontSize", label: "본문", min: 14, max: 20, fallback: 14 },
        { key: "captionFontSize", label: "설명 · 보조 정보", min: 14, max: 18, fallback: 14 },
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
                <div className="inspector-panel-stack">
                    <div className="inspector-heading flex items-center justify-between gap-3 border-b border-neutral-800">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                            <Sliders size={14} className="text-blue-500" />
                            <span>
                                문서 전역 설정
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => updateGlobalStyle(DEFAULT_GLOBAL_STYLE)}
                            className="inspector-reset-button"
                            data-tooltip="문서 전역 설정을 기본값으로 복원"
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
                                            data-tooltip={`${color.label} ${color.value}`}
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

                    {/* 블록 사이 간격 */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-neutral-300">블록 사이 간격</span>
                            <span className="text-neutral-400 font-mono">{globalStyle?.blockGap ?? 18}px</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="40"
                            step="2"
                            value={globalStyle?.blockGap ?? 18}
                            onChange={(e) => updateGlobalStyle({ blockGap: Number(e.target.value) })}
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
    const handleProfilePhotoUpload = async (file?: File) => {
        if (!file || currentBlock.type !== "profile") return;
        const photo = await createProfilePhotoDataUrl(file);
        updateBlockData(currentBlock.id, {
            ...currentBlock.data,
            photo,
            showPhoto: true,
        });
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
            company: "",
            role: "",
            startDate: "",
            endDate: "",
            description: [],
            projects: [],
        };
        updateBlockData(currentBlock.id, [...prevData, newItem]);
        setEditingExperienceId(newItem.id);
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
        const nextData = prevData.filter((item: any) => item.id !== expId);
        updateBlockData(currentBlock.id, nextData);
        if (editingExperienceId === expId) {
            setEditingExperienceId(null);
            setExpandedExperienceProjectId(null);
        }
    };

    const handleReorderExperience = (fromIndex: number, toIndex: number) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        if (toIndex < 0 || toIndex >= prevData.length || fromIndex === toIndex) return;
        const nextData = [...prevData];
        const [movedExperience] = nextData.splice(fromIndex, 1);
        if (!movedExperience) return;
        nextData.splice(toIndex, 0, movedExperience);
        updateBlockData(currentBlock.id, nextData);
    };

    const handleAddExperienceProject = (expId: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const projectId = `exp-project-${Date.now()}`;
        updateBlockData(currentBlock.id, prevData.map((item: any) => item.id === expId ? {
            ...item,
            projects: [...(item.projects || []), {
                id: projectId,
                title: "",
                role: "",
                startDate: "",
                endDate: "",
                description: [],
                descriptionLevels: [],
                descriptionHtml: [],
            }],
        } : item));
        setExpandedExperienceProjectId(projectId);
    };

    const handleUpdateExperienceProject = (expId: string, projectId: string, patch: Record<string, unknown>) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(currentBlock.id, prevData.map((item: any) => item.id === expId ? {
            ...item,
            projects: (item.projects || []).map((project: any) => project.id === projectId
                ? { ...project, ...patch }
                : project),
        } : item));
    };

    const handleReorderExperienceProject = (expId: string, fromIndex: number, toIndex: number) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(currentBlock.id, prevData.map((item: any) => {
            if (item.id !== expId) return item;
            const projects = [...(item.projects || [])];
            if (toIndex < 0 || toIndex >= projects.length || fromIndex === toIndex) return item;
            const [movedProject] = projects.splice(fromIndex, 1);
            if (!movedProject) return item;
            projects.splice(toIndex, 0, movedProject);
            return { ...item, projects };
        }));
    };

    const handleRemoveExperienceProject = (expId: string, projectId: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(currentBlock.id, prevData.map((item: any) => item.id === expId ? {
            ...item,
            projects: (item.projects || []).filter((project: any) => project.id !== projectId),
        } : item));
        if (expandedExperienceProjectId === projectId) setExpandedExperienceProjectId(null);
    };

    // --- 프로젝트(Project) 핸들러 ---
    const handleAddProjectItem = () => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const newItem = {
            id: `proj-${Date.now()}`,
            title: "",
            role: "",
            startDate: "",
            endDate: "",
            link: "",
            description: [],
            descriptionLevels: [],
            descriptionHtml: [],
        };
        updateBlockData(currentBlock.id, [...prevData, newItem]);
        setExpandedProjectId(newItem.id);
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
        const nextData = prevData.filter((item: any) => item.id !== projId);
        updateBlockData(currentBlock.id, nextData);
        if (expandedProjectId === projId) {
            setExpandedProjectId(nextData[0]?.id ?? null);
        }
    };

    const handleReorderProject = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const nextData = [...prevData];
        const [movedProject] = nextData.splice(fromIndex, 1);
        if (!movedProject) return;
        nextData.splice(toIndex, 0, movedProject);
        updateBlockData(currentBlock.id, nextData);
    };

    const handleAddProjBullet = (projId: string, text = "") => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => {
                if (item.id !== projId) return item;
                const currentDesc = Array.isArray(item.description) ? item.description : [];
                const currentLevels = Array.isArray(item.descriptionLevels) ? item.descriptionLevels : [];
                const currentHtml = Array.isArray(item.descriptionHtml)
                    ? item.descriptionHtml
                    : currentDesc.map((description: string) => escapeHtml(description));
                return {
                    ...item,
                    description: [...currentDesc, text],
                    descriptionLevels: [...currentLevels, 1],
                    descriptionHtml: [...currentHtml, escapeHtml(text)],
                };
            })
        );
    };

    const handleUpdateProjBulletRichText = (projId: string, index: number, html: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => {
                if (item.id !== projId) return item;
                const sanitizedHtml = sanitizeInlineRichText(html);
                const newDesc = [...item.description];
                const newHtml = Array.isArray(item.descriptionHtml)
                    ? [...item.descriptionHtml]
                    : item.description.map((description: string) => escapeHtml(description));
                newDesc[index] = richTextToPlainText(sanitizedHtml);
                newHtml[index] = sanitizedHtml;
                return { ...item, description: newDesc, descriptionHtml: newHtml };
            })
        );
    };

    const focusProjectBullet = (projId: string, index: number) => {
        requestAnimationFrame(() => {
            document.querySelector<HTMLElement>(`[data-project-bullet-editor="${projId}-${index}"]`)?.focus();
        });
    };

    const handleInsertProjBullet = (projId: string, index: number) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(currentBlock.id, prevData.map((item: any) => {
            if (item.id !== projId) return item;
            const description = [...item.description];
            const descriptionLevels = item.description.map((_: string, bulletIndex: number) => (
                Number(item.descriptionLevels?.[bulletIndex]) || 1
            ));
            const descriptionHtml = Array.isArray(item.descriptionHtml)
                ? [...item.descriptionHtml]
                : item.description.map((text: string) => escapeHtml(text));
            description.splice(index + 1, 0, "");
            descriptionLevels.splice(index + 1, 0, descriptionLevels[index] || 1);
            descriptionHtml.splice(index + 1, 0, "");
            return { ...item, description, descriptionLevels, descriptionHtml };
        }));
        focusProjectBullet(projId, index + 1);
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
                    descriptionLevels: (Array.isArray(item.descriptionLevels)
                        ? item.descriptionLevels
                        : item.description.map(() => 1)
                    ).filter((_: number, i: number) => i !== index),
                    descriptionHtml: (Array.isArray(item.descriptionHtml)
                        ? item.descriptionHtml
                        : item.description.map((description: string) => escapeHtml(description))
                    ).filter((_: string, i: number) => i !== index),
                };
            })
        );
    };

    const handleSetProjBulletLevel = (projId: string, index: number, requestedLevel: number) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => {
                if (item.id !== projId) return item;
                const levels = item.description.map((_: string, bulletIndex: number) => (
                    Number(item.descriptionLevels?.[bulletIndex]) || 1
                ));
                const previousLevel = index > 0 ? levels[index - 1] : 1;
                const maxLevel = index === 0 ? 1 : Math.min(3, previousLevel + 1);
                levels[index] = Math.max(1, Math.min(maxLevel, requestedLevel));
                return { ...item, descriptionLevels: levels };
            }),
        );
    };

    const handleProjectBulletKeyDown = (
        event: React.KeyboardEvent<HTMLDivElement>,
        proj: any,
        index: number,
    ) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
            event.preventDefault();
            document.execCommand("bold");
            handleUpdateProjBulletRichText(proj.id, index, event.currentTarget.innerHTML);
            return;
        }
        if (event.key === "Tab" || event.code === "Tab") {
            event.preventDefault();
            event.stopPropagation();
            const renderedLevel = Number(event.currentTarget.closest<HTMLElement>("[data-level]")?.dataset.level) || 1;
            handleSetProjBulletLevel(proj.id, index, renderedLevel + (event.shiftKey ? -1 : 1));
            focusProjectBullet(proj.id, index);
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            handleInsertProjBullet(proj.id, index);
            return;
        }
        if (event.key === "Backspace" && !event.currentTarget.textContent) {
            event.preventDefault();
            event.stopPropagation();
            const renderedLevel = Number(event.currentTarget.closest<HTMLElement>("[data-level]")?.dataset.level) || 1;
            if (renderedLevel > 1) {
                handleSetProjBulletLevel(proj.id, index, renderedLevel - 1);
                focusProjectBullet(proj.id, index);
                return;
            }
            if (proj.description.length > 1) {
                handleRemoveProjBullet(proj.id, index);
                focusProjectBullet(proj.id, Math.max(0, index - 1));
            }
        }
    };

    const handleUpdateProjBulletDocument = (
        projId: string,
        description: string[],
        descriptionLevels: number[],
        descriptionHtml: string[],
    ) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(currentBlock.id, prevData.map((item: any) => (
            item.id === projId
                ? { ...item, description, descriptionLevels, descriptionHtml }
                : item
        )));
    };

    // --- 학력(Education) 핸들러 ---
    const handleAddEducationItem = () => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const newItem = {
            id: `edu-${Date.now()}`,
            school: "",
            major: "",
            startDate: "",
            endDate: "",
            status: "",
            score: "",
        };
        updateBlockData(currentBlock.id, [...prevData, newItem]);
        setEditingEducationId(newItem.id);
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
        if (editingEducationId === eduId) setEditingEducationId(null);
    };

    const handleReorderEducation = (fromIndex: number, toIndex: number) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        if (toIndex < 0 || toIndex >= prevData.length || fromIndex === toIndex) return;
        const nextData = [...prevData];
        const [movedEducation] = nextData.splice(fromIndex, 1);
        if (!movedEducation) return;
        nextData.splice(toIndex, 0, movedEducation);
        updateBlockData(currentBlock.id, nextData);
    };

    // --- 자격/수상(Certification) 핸들러 ---
    const handleAddCertItem = () => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const newItem = {
            id: `cert-${Date.now()}`,
            title: "",
            startDate: "",
            endDate: "",
            link: "",
            description: [],
        };
        updateBlockData(currentBlock.id, [...prevData, newItem]);
        setEditingCertificationId(newItem.id);
    };

    const handleUpdateCertField = (certId: string, field: string, value: any) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => (item.id === certId ? { ...item, [field]: value } : item))
        );
    };

    const handleUpdateCertDescription = (
        certId: string,
        description: string[],
        descriptionLevels: number[],
        descriptionHtml: string[],
    ) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(currentBlock.id, prevData.map((item: any) => (
            item.id === certId
                ? { ...item, description, descriptionLevels, descriptionHtml }
                : item
        )));
    };

    const handleRemoveCertItem = (certId: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.filter((item: any) => item.id !== certId)
        );
        if (editingCertificationId === certId) setEditingCertificationId(null);
    };

    const handleReorderCertification = (fromIndex: number, toIndex: number) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        if (toIndex < 0 || toIndex >= prevData.length || fromIndex === toIndex) return;
        const nextData = [...prevData];
        const [movedCertification] = nextData.splice(fromIndex, 1);
        if (!movedCertification) return;
        nextData.splice(toIndex, 0, movedCertification);
        updateBlockData(currentBlock.id, nextData);
    };

    // --- 스킬(Skills) 핸들러 ---
    const skillCategories = currentBlock?.type === "skills"
        ? getSkillCategories(currentBlock.data as SkillsData)
        : [];

    const updateSkillCategories = (categories: SkillCategory[]) => {
        if (currentBlock.type !== "skills") return;
        updateBlockData(
            currentBlock.id,
            withSkillCategories(currentBlock.data as SkillsData, categories),
        );
    };

    const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>, categoryId: string) => {
        const input = newSkillInputs[categoryId]?.trim() || "";
        if (e.key === "Enter" && input) {
            e.preventDefault();
            updateSkillCategories(skillCategories.map((category) => (
                category.id === categoryId && !category.skills.includes(input)
                    ? { ...category, skills: [...category.skills, input] }
                    : category
            )));
            setNewSkillInputs((current) => ({ ...current, [categoryId]: "" }));
        }
    };

    const handleRemoveSkill = (categoryId: string, skillToRemove: string) => {
        updateSkillCategories(skillCategories.map((category) => (
            category.id === categoryId
                ? { ...category, skills: category.skills.filter((skill) => skill !== skillToRemove) }
                : category
        )));
    };

    return (
        <aside ref={blockPanelRef} className="inspector-panel inspector-panel--block w-[clamp(380px,30vw,480px)] shrink-0 border-l border-neutral-800 bg-[#12131a] p-6 flex flex-col justify-between overflow-y-auto">
            <div className="inspector-panel-stack">
                {/* 상단 블록 타이틀 및 액션 버튼들 (눈 모양 토글 버튼 포함) */}
                {editingExperience || editingEducation || editingCertification ? (
                    <div className="inspector-heading inspector-heading--experience-detail border-b border-neutral-800">
                        <div className="inspector-heading__detail-title">
                            <button
                                type="button"
                                className="inspector-heading__back"
                                onClick={() => {
                                    setEditingExperienceId(null);
                                    setEditingEducationId(null);
                                    setEditingCertificationId(null);
                                    setExpandedExperienceProjectId(null);
                                    blockPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                data-tooltip={editingExperience
                                    ? "경력(회사) 목록으로 돌아가기"
                                    : editingEducation
                                        ? "학력 목록으로 돌아가기"
                                        : "기타 경험 목록으로 돌아가기"}
                                aria-label={editingExperience
                                    ? "경력(회사) 목록으로 돌아가기"
                                    : editingEducation
                                        ? "학력 목록으로 돌아가기"
                                        : "기타 경험 목록으로 돌아가기"}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span>
                                {editingExperience
                                    ? `${editingExperience.company || "회사명 없음"} 편집`
                                    : editingEducation
                                        ? `${editingEducation.school || "학교명 없음"} 편집`
                                        : `${editingCertification?.title || "활동명 없음"} 편집`}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="inspector-heading flex items-center justify-between border-b border-neutral-800 pb-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                            <Layers size={14} className="text-blue-500" />
                            <span>{currentBlock.type === "certification" ? "OTHER EXPERIENCE" : currentBlock.type} 설정</span>
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
                                data-tooltip={currentBlock.isVisible === false ? "블록 표시하기" : "블록 숨기기"}
                            >
                                {currentBlock.isVisible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>

                            <button
                                onClick={handleMoveUp}
                                disabled={currentIndex === 0}
                                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                                data-tooltip="위로 이동"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                onClick={handleMoveDown}
                                disabled={currentIndex === blocks.length - 1}
                                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                                data-tooltip="아래로 이동"
                            >
                                <ChevronDown size={16} />
                            </button>
                            <button
                                onClick={() => removeBlock(currentBlock.id)}
                                className="p-1 text-neutral-500 hover:text-red-400 transition ml-1"
                                data-tooltip="블록 삭제"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {!editingExperience && !editingEducation && !editingCertification && (
                    <>
                        <div className="inspector-field space-y-1.5">
                            <label className="inspector-label-inset block text-xs font-medium text-neutral-300">블록 제목</label>
                            <input
                                type="text"
                                value={currentBlock.type === "certification" && currentBlock.title === "CERTIFICATIONS & AWARDS"
                                    ? "Other Experience"
                                    : currentBlock.title || ""}
                                placeholder="블록 제목을 입력하세요"
                                onChange={(e) => updateBlockTitle(currentBlock.id, e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <section className="inspector-options-section space-y-2">
                            <h3 className="inspector-section-heading">블록 옵션</h3>
                            <div className="inspector-options-card space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-xs text-neutral-300">개별 간격 사용</span>
                                        <span className="mt-0.5 block text-[10px] text-neutral-500">전역 블록 간격에 내부 여백을 추가합니다.</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={currentBlock.style.useCustomPadding === true}
                                        onChange={(e) => updateBlockStyle(currentBlock.id, { useCustomPadding: e.target.checked })}
                                        className="h-4 w-4 cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {currentBlock.style.useCustomPadding === true && (
                                    <div className="space-y-2 rounded-lg bg-neutral-950/40 p-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-neutral-300">내부 상하 여백</span>
                                            <span className="font-mono text-neutral-400">{currentBlock.style.paddingY}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="4"
                                            max="48"
                                            step="4"
                                            value={currentBlock.style.paddingY}
                                            onChange={(e) => updateBlockStyle(currentBlock.id, { paddingY: Number(e.target.value) })}
                                            className="w-full cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-neutral-300">하단 구분선 표시</span>
                                    <input
                                        type="checkbox"
                                        checked={currentBlock.style.showDivider}
                                        onChange={(e) => updateBlockStyle(currentBlock.id, { showDivider: e.target.checked })}
                                        className="h-4 w-4 cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {currentBlock.type === "certification" && (
                                    <div className="space-y-2 rounded-lg bg-neutral-950/40 p-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-neutral-300">왼쪽 영역 비율</span>
                                            <span className="font-mono text-neutral-400">
                                                {currentBlock.style.otherExperienceLeftColumnRatio ?? 34}%
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="24"
                                            max="48"
                                            step="1"
                                            value={currentBlock.style.otherExperienceLeftColumnRatio ?? 34}
                                            onChange={(event) => updateBlockStyle(currentBlock.id, {
                                                otherExperienceLeftColumnRatio: Number(event.target.value),
                                            })}
                                            aria-label="기타 경험 왼쪽 영역 비율"
                                            className="w-full cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-xs text-neutral-300">
                                            {currentBlock.type === "project" ? "블록 자동 페이지 맞춤" : "블록 자동 페이지 맞춤"}
                                        </span>
                                        <span className="mt-1 block text-[10px] leading-[1.45] text-neutral-500">
                                            {currentBlock.type === "project"
                                                ? "블록 내 모든 프로젝트가 페이지 경계에서 잘리지 않도록 한 번에 설정합니다."
                                                : "블록이 페이지 경계에서 잘리지 않도록 다음 페이지 상단부터 깔끔하게 시작합니다."}
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={currentBlock.style.keepTogether === true}
                                        onChange={(e) => {
                                            const keepTogether = e.target.checked;
                                            updateBlockStyle(currentBlock.id, { keepTogether });
                                            if (currentBlock.type === "project" && Array.isArray(currentBlock.data)) {
                                                updateBlockData(
                                                    currentBlock.id,
                                                    currentBlock.data.map((project: any) => ({ ...project, keepTogether })),
                                                );
                                            }
                                        }}
                                        className="h-4 w-4 cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* 블록별 데이터 입력 폼 */}

                {/* [프로필 폼] */}
                {currentBlock.type === "profile" && (
                    <div className="inspector-section inspector-form-stack border-t border-neutral-800 pt-4">
                        <div className="inspector-field">
                            <div className="flex items-center justify-between">
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
                            <div className={`inspector-photo-row${currentBlock.data.showPhoto === false ? " opacity-45" : ""}`}>
                                <label className="inspector-photo-thumbnail" aria-label="프로필 사진 선택">
                                    {currentBlock.data.photo ? (
                                        <img src={currentBlock.data.photo} alt="프로필 미리보기" />
                                    ) : (
                                        <ImagePlus size={18} aria-hidden="true" />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(event) => {
                                            void handleProfilePhotoUpload(event.target.files?.[0]);
                                            event.currentTarget.value = "";
                                        }}
                                    />
                                </label>
                                <div className="inspector-photo-actions">
                                    <label className="inspector-photo-action inspector-photo-action--select">
                                        <ImagePlus size={14} aria-hidden="true" />
                                        {currentBlock.data.photo ? "사진 변경" : "사진 선택"}
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            onChange={(event) => {
                                                void handleProfilePhotoUpload(event.target.files?.[0]);
                                                event.currentTarget.value = "";
                                            }}
                                        />
                                    </label>
                                    {currentBlock.data.photo && (
                                        <button
                                            type="button"
                                            className="inspector-photo-action inspector-photo-action--remove"
                                            onClick={() => updateBlockData(currentBlock.id, { ...currentBlock.data, photo: "" })}
                                            data-tooltip="사진 제거"
                                            aria-label="프로필 사진 제거"
                                        >
                                            <Trash2 size={14} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="inspector-field">
                            <div className="flex items-baseline justify-between gap-2">
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
                        <div className="inspector-field">
                            <label className="text-xs text-neutral-400 block">직무</label>
                            <input
                                type="text"
                                value={currentBlock.data.role || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { ...currentBlock.data, role: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="inspector-field">
                            <label className="text-xs text-neutral-400 block">이름</label>
                            <input
                                type="text"
                                value={currentBlock.data.name || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { ...currentBlock.data, name: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="inspector-field inspector-contact-list">
                            <div>
                                <label className="text-xs text-neutral-400">연락처</label>
                            </div>
                            {profileContacts.length === 0 && (
                                <p className="inspector-empty-state rounded-lg border border-dashed border-neutral-700 px-3 py-3 text-center text-[11px] text-neutral-500">
                                    표시할 연락처 항목을 추가해 주세요.
                                </p>
                            )}
                            {profileContacts.map((contact, contactIndex) => (
                                <div
                                    key={contact.id}
                                    className={`inspector-repeat-card inspector-contact-row${contactIndex === 0 ? " is-first" : ""}${draggedContactIndex === contactIndex ? " is-dragging" : ""}`}
                                    draggable
                                    onDragStart={(event) => {
                                        if (!(event.target as HTMLElement).closest(".inspector-contact-drag")) {
                                            event.preventDefault();
                                            return;
                                        }
                                        setDraggedContactIndex(contactIndex);
                                    }}
                                    onDragEnd={() => setDraggedContactIndex(null)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        if (draggedContactIndex === null || draggedContactIndex === contactIndex) return;
                                        const nextContacts = [...profileContacts];
                                        const [movedContact] = nextContacts.splice(draggedContactIndex, 1);
                                        nextContacts.splice(contactIndex, 0, movedContact);
                                        nextContacts[0] = { ...nextContacts[0], inlineWithPrevious: false };
                                        updateBlockData(
                                            currentBlock.id,
                                            withProfileContacts(currentBlock.data as ProfileData, nextContacts),
                                        );
                                        setDraggedContactIndex(null);
                                    }}
                                >
                                    <div className="inspector-contact-main">
                                        <span
                                            className="inspector-contact-drag tooltip-anchor"
                                            data-tooltip="드래그하여 순서 변경"
                                            aria-label={`${contact.label || "연락처"} 항목 순서 변경`}
                                        >
                                            <GripVertical size={15} />
                                        </span>
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
                                            className="inspector-contact-label w-20 shrink-0 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
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
                                        {contactIndex > 0 ? (
                                            <button
                                                type="button"
                                                aria-pressed={Boolean(contact.inlineWithPrevious)}
                                                onClick={() => {
                                                    const nextContacts = profileContacts.map((item) => (
                                                        item.id === contact.id
                                                            ? { ...item, inlineWithPrevious: !item.inlineWithPrevious }
                                                            : item
                                                    ));
                                                    updateBlockData(
                                                        currentBlock.id,
                                                        withProfileContacts(currentBlock.data as ProfileData, nextContacts),
                                                    );
                                                }}
                                                className="inspector-contact-link"
                                                data-tooltip={contact.inlineWithPrevious ? "앞 항목과 줄 연결 해제" : "앞 항목과 같은 줄에 표시"}
                                                aria-label={contact.inlineWithPrevious ? "앞 항목과 줄 연결 해제" : "앞 항목과 같은 줄에 표시"}
                                            >
                                                <Link2 size={14} />
                                            </button>
                                        ) : (
                                            <span className="inspector-contact-link-spacer" aria-hidden="true" />
                                        )}
                                        <details className="inspector-contact-menu">
                                            <summary
                                                data-tooltip={`${contact.label || "연락처"} 항목 메뉴`}
                                                aria-label={`${contact.label || "연락처"} 항목 메뉴`}
                                            >
                                                <MoreHorizontal size={16} />
                                            </summary>
                                            <div className="inspector-contact-menu__popover">
                                                <button
                                                    type="button"
                                                    disabled={contactIndex === 0}
                                                    onClick={() => {
                                                        const nextContacts = [...profileContacts];
                                                        [nextContacts[contactIndex - 1], nextContacts[contactIndex]] = [nextContacts[contactIndex], nextContacts[contactIndex - 1]];
                                                        nextContacts[0] = { ...nextContacts[0], inlineWithPrevious: false };
                                                        updateBlockData(currentBlock.id, withProfileContacts(currentBlock.data as ProfileData, nextContacts));
                                                    }}
                                                >
                                                    <ChevronUp size={13} /> 위로 이동
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={contactIndex === profileContacts.length - 1}
                                                    onClick={() => {
                                                        const nextContacts = [...profileContacts];
                                                        [nextContacts[contactIndex], nextContacts[contactIndex + 1]] = [nextContacts[contactIndex + 1], nextContacts[contactIndex]];
                                                        nextContacts[0] = { ...nextContacts[0], inlineWithPrevious: false };
                                                        updateBlockData(currentBlock.id, withProfileContacts(currentBlock.data as ProfileData, nextContacts));
                                                    }}
                                                >
                                                    <ChevronDown size={13} /> 아래로 이동
                                                </button>
                                                <button
                                                    type="button"
                                                    className="is-danger"
                                                    onClick={() => {
                                                        const nextContacts = profileContacts.filter((item) => item.id !== contact.id);
                                                        updateBlockData(currentBlock.id, withProfileContacts(currentBlock.data as ProfileData, nextContacts));
                                                    }}
                                                >
                                                    <Trash2 size={13} /> 삭제
                                                </button>
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            ))}
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
                                className="inspector-contact-add"
                            >
                                <Plus size={14} /> 연락처 항목 추가
                            </button>
                        </div>
                        <div className="inspector-field">
                            <div className="flex items-center justify-between gap-3">
                                <label className="text-xs text-neutral-400">자기소개</label>
                                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-400">
                                    <input
                                        type="checkbox"
                                        checked={(currentBlock.data.introductionStyle || "bullets") === "bullets"}
                                        onChange={(event) => updateBlockData(currentBlock.id, {
                                            ...currentBlock.data,
                                            introductionStyle: event.target.checked ? "bullets" : "paragraph",
                                        })}
                                        aria-label="자기소개를 불렛형으로 표시"
                                    />
                                    {(currentBlock.data.introductionStyle || "bullets") === "bullets" ? "불렛형" : "줄글형"}
                                </label>
                            </div>
                            {(currentBlock.data.introductionStyle || "bullets") === "bullets" ? (
                                <>
                                    <ProjectBulletDocumentEditor
                                        descriptions={currentBlock.data.highlights || []}
                                        levels={(currentBlock.data.highlights || []).map(() => 1)}
                                        onChange={(highlights) => updateBlockData(currentBlock.id, {
                                            ...currentBlock.data,
                                            highlights,
                                        })}
                                        maxLevel={1}
                                        allowBold={false}
                                        placeholder="핵심 경험이나 강점을 입력하세요"
                                        ariaLabel="자기소개 불렛 목록"
                                    />
                                </>
                            ) : (
                                <>
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
                                        문장별로 줄을 나눠 입력하면 미리보기에서는 자연스럽게 이어서 표시됩니다.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* [경력 폼] */}
                {currentBlock.type === "experience" && (
                    <div className={`inspector-list-section${editingExperience ? " inspector-list-section--experience-detail" : " border-t border-neutral-800 pt-4"}`}>
                        {!editingExperience && (
                            <div>
                                <span className="text-xs font-semibold text-neutral-300">경력(회사) 목록</span>
                            </div>
                        )}
                        {(!Array.isArray(currentBlock.data) || currentBlock.data.length === 0) && (
                            <p className="inspector-empty-state rounded-lg border border-dashed border-neutral-700 text-center text-[11px] text-neutral-500">
                                경력 항목을 추가해 주세요.
                            </p>
                        )}

                        {Array.isArray(currentBlock.data) &&
                            currentBlock.data
                                .filter((exp: any) => !editingExperience || exp.id === editingExperience.id)
                                .map((exp: any, experienceIndex: number) => (
                                <div
                                    key={exp.id}
                                    className={editingExperience?.id === exp.id
                                        ? "inspector-experience-editor__card"
                                        : "inspector-repeat-card inspector-project-card"}
                                >
                                        {!editingExperience && (
                                            <div className="inspector-project-card__summary">
                                                <button
                                                    type="button"
                                                    className="inspector-project-card__toggle"
                                                    onClick={() => {
                                                        setEditingExperienceId(exp.id);
                                                        setExpandedExperienceProjectId(null);
                                                        blockPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                                                    }}
                                                    aria-label={`${exp.company || "회사명 없음"} 편집`}
                                                >
                                                    <span className="inspector-project-card__summary-copy">
                                                        <strong>{exp.company || "회사명 없음"}</strong>
                                                    </span>
                                                    <span className="inspector-project-card__edit-action" aria-hidden="true">편집</span>
                                                </button>
                                                <details className="inspector-contact-menu inspector-project-menu">
                                                    <summary
                                                        data-tooltip={`${exp.company || "경력"} 항목 메뉴`}
                                                        aria-label={`${exp.company || "경력"} 항목 메뉴`}
                                                    >
                                                        <MoreHorizontal size={16} />
                                                    </summary>
                                                    <div className="inspector-contact-menu__popover">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReorderExperience(experienceIndex, experienceIndex - 1)}
                                                            disabled={experienceIndex === 0}
                                                        >
                                                            <ChevronUp size={13} /> 위로 이동
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReorderExperience(experienceIndex, experienceIndex + 1)}
                                                            disabled={experienceIndex === currentBlock.data.length - 1}
                                                        >
                                                            <ChevronDown size={13} /> 아래로 이동
                                                        </button>
                                                        <button type="button" className="is-danger" onClick={() => handleRemoveExpItem(exp.id)}>
                                                            <Trash2 size={13} /> 삭제
                                                        </button>
                                                    </div>
                                                </details>
                                            </div>
                                        )}

                                        {editingExperience?.id === exp.id && (
                                            <div className="inspector-project-card__body">

                                                <div className="inspector-field">
                                                    <label className="inspector-label-inset inspector-field-label block">회사명</label>
                                                    <input
                                                        type="text"
                                                        placeholder="회사명"
                                                        value={exp.company || ""}
                                                        onChange={(e) => handleUpdateExpField(exp.id, "company", e.target.value)}
                                                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>

                                                <div className="inspector-field">
                                                    <label className="inspector-label-inset inspector-field-label block">직무 / 역할</label>
                                                    <input
                                                        type="text"
                                                        placeholder="직무 또는 역할"
                                                        value={exp.role || ""}
                                                        onChange={(e) => handleUpdateExpField(exp.id, "role", e.target.value)}
                                                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>

                                                <div className="inspector-project-card__dates">
                                                    <div className="inspector-field">
                                                        <label className="inspector-label-inset inspector-field-label block">시작일</label>
                                                        <input
                                                            type="text"
                                                            placeholder="예: 2024.01"
                                                            value={exp.startDate || ""}
                                                            onChange={(e) => handleUpdateExpField(exp.id, "startDate", e.target.value)}
                                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <div className="inspector-field">
                                                        <label className="inspector-label-inset inspector-field-label block">종료일</label>
                                                        <input
                                                            type="text"
                                                            placeholder="예: 재직 중"
                                                            value={exp.endDate || ""}
                                                            onChange={(e) => handleUpdateExpField(exp.id, "endDate", e.target.value)}
                                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="inspector-field border-t border-neutral-800 pt-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <label className="text-xs text-neutral-400">회사 소개 및 주요 성과</label>
                                                        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-400">
                                                            <input
                                                                type="checkbox"
                                                                checked={(exp.descriptionStyle || "bullets") === "bullets"}
                                                                onChange={(event) => handleUpdateExpField(
                                                                    exp.id,
                                                                    "descriptionStyle",
                                                                    event.target.checked ? "bullets" : "paragraph",
                                                                )}
                                                                aria-label="회사 소개와 주요 성과를 불렛형으로 표시"
                                                            />
                                                            {(exp.descriptionStyle || "bullets") === "bullets" ? "불렛형" : "줄글형"}
                                                        </label>
                                                    </div>
                                                    {(exp.descriptionStyle || "bullets") === "bullets" ? (
                                                        <ProjectBulletDocumentEditor
                                                            descriptions={exp.description || []}
                                                            levels={(exp.description || []).map(() => 1)}
                                                            onChange={(description) => handleUpdateExpField(
                                                                exp.id,
                                                                "description",
                                                                description,
                                                            )}
                                                            maxLevel={1}
                                                            allowBold={false}
                                                            placeholder="주요 업무와 성과를 입력하세요"
                                                            ariaLabel="회사 소개 및 주요 성과 불렛 목록"
                                                        />
                                                    ) : (
                                                        <textarea
                                                            rows={5}
                                                            placeholder="주요 업무와 성과를 문장별로 입력하세요"
                                                            value={(exp.description || []).join("\n")}
                                                            onChange={(event) => handleUpdateExpField(
                                                                exp.id,
                                                                "description",
                                                                event.target.value.split("\n"),
                                                            )}
                                                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-y"
                                                        />
                                                    )}
                                                </div>

                                                <div className="space-y-3 border-t border-neutral-800 pt-3">
                                                    <h3 className="inspector-section-heading">회사 내 프로젝트</h3>
                                                    {(!Array.isArray(exp.projects) || exp.projects.length === 0) && (
                                                        <p className="inspector-empty-state rounded-lg border border-dashed border-neutral-700 text-center text-[11px] text-neutral-500">
                                                            프로젝트 항목을 추가해 주세요.
                                                        </p>
                                                    )}
                                                    {(exp.projects || []).map((project: any, experienceProjectIndex: number) => (
                                                        <div key={project.id} className="inspector-repeat-card inspector-project-card">
                                                            <div className="inspector-project-card__summary">
                                                                <button
                                                                    type="button"
                                                                    className="inspector-project-card__toggle"
                                                                    onClick={() => setExpandedExperienceProjectId((current) => (
                                                                        current === project.id ? null : project.id
                                                                    ))}
                                                                    aria-expanded={expandedExperienceProjectId === project.id}
                                                                >
                                                                    <span className="inspector-project-card__summary-copy">
                                                                        <strong>{project.title || "제목 없는 프로젝트"}</strong>
                                                                    </span>
                                                                    <span className="inspector-project-card__edit-action" aria-hidden="true">
                                                                        {expandedExperienceProjectId === project.id ? "접기" : "편집"}
                                                                    </span>
                                                                </button>
                                                                <details className="inspector-contact-menu inspector-project-menu">
                                                                    <summary
                                                                        data-tooltip={`${project.title || "프로젝트"} 항목 메뉴`}
                                                                        aria-label={`${project.title || "프로젝트"} 항목 메뉴`}
                                                                    >
                                                                        <MoreHorizontal size={16} />
                                                                    </summary>
                                                                    <div className="inspector-contact-menu__popover">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleReorderExperienceProject(
                                                                                exp.id,
                                                                                experienceProjectIndex,
                                                                                experienceProjectIndex - 1,
                                                                            )}
                                                                            disabled={experienceProjectIndex === 0}
                                                                        >
                                                                            <ChevronUp size={13} /> 위로 이동
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleReorderExperienceProject(
                                                                                exp.id,
                                                                                experienceProjectIndex,
                                                                                experienceProjectIndex + 1,
                                                                            )}
                                                                            disabled={experienceProjectIndex === (exp.projects || []).length - 1}
                                                                        >
                                                                            <ChevronDown size={13} /> 아래로 이동
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="is-danger"
                                                                            onClick={() => handleRemoveExperienceProject(exp.id, project.id)}
                                                                        >
                                                                            <Trash2 size={13} /> 삭제
                                                                        </button>
                                                                    </div>
                                                                </details>
                                                            </div>
                                                            {expandedExperienceProjectId === project.id && (
                                                                <div className="inspector-project-card__body">
                                                                    <div className="inspector-field">
                                                                        <label className="inspector-label-inset inspector-field-label block">프로젝트명</label>
                                                                        <input
                                                                            value={project.title || ""}
                                                                            placeholder="프로젝트명"
                                                                            onChange={(event) => handleUpdateExperienceProject(exp.id, project.id, { title: event.target.value })}
                                                                            className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                                        />
                                                                    </div>
                                                                    <div className="inspector-field">
                                                                        <label className="inspector-label-inset inspector-field-label block">역할 / 프로젝트 소개</label>
                                                                        <input
                                                                            value={project.role || ""}
                                                                            placeholder="담당 역할 또는 프로젝트 소개"
                                                                            onChange={(event) => handleUpdateExperienceProject(exp.id, project.id, { role: event.target.value })}
                                                                            className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                                        />
                                                                    </div>
                                                                    <div className="inspector-project-card__dates">
                                                                        <div className="inspector-field">
                                                                            <label className="inspector-label-inset inspector-optional-label text-xs text-neutral-400">시작일 <span className="font-normal text-neutral-600">선택</span></label>
                                                                            <input
                                                                                value={project.startDate || ""}
                                                                                placeholder="예: 2024.01"
                                                                                onChange={(event) => handleUpdateExperienceProject(exp.id, project.id, { startDate: event.target.value })}
                                                                                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                                            />
                                                                        </div>
                                                                        <div className="inspector-field">
                                                                            <label className="inspector-label-inset inspector-optional-label text-xs text-neutral-400">종료일 <span className="font-normal text-neutral-600">선택</span></label>
                                                                            <input
                                                                                value={project.endDate || ""}
                                                                                placeholder="예: 진행 중"
                                                                                onChange={(event) => handleUpdateExperienceProject(exp.id, project.id, { endDate: event.target.value })}
                                                                                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="inspector-field inspector-project-card__bullets">
                                                                        <div>
                                                                            <label className="inspector-label-inset inspector-field-label block">기여/성과</label>
                                                                            <div className="inspector-shortcut-guide" aria-label="불릿 편집 단축키">
                                                                                <span><Kbd>Enter</Kbd> 새 불릿</span>
                                                                                <span><Kbd>Tab</Kbd> 들여쓰기</span>
                                                                                <span>
                                                                                    <KbdGroup><Kbd>Ctrl/⌘</Kbd><span>+</span><Kbd>B</Kbd></KbdGroup>
                                                                                    볼드
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <ProjectBulletDocumentEditor
                                                                            descriptions={project.description || []}
                                                                            levels={project.descriptionLevels || []}
                                                                            html={project.descriptionHtml || []}
                                                                            onChange={(description, descriptionLevels, descriptionHtml) => (
                                                                                handleUpdateExperienceProject(exp.id, project.id, {
                                                                                    description,
                                                                                    descriptionLevels,
                                                                                    descriptionHtml,
                                                                                })
                                                                            )}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddExperienceProject(exp.id)}
                                                        className="inspector-list-add"
                                                    >
                                                        <Plus size={14} /> 프로젝트 추가
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        {!editingExperience && (
                            <button type="button" onClick={handleAddExperienceItem} className="inspector-list-add">
                                <Plus size={14} /> 경력(회사) 추가
                            </button>
                        )}
                    </div>
                )}

                {/* [프로젝트 폼] */}
                {currentBlock.type === "project" && (
                    <div className="inspector-list-section border-t border-neutral-800 pt-4">
                        <h3 className="inspector-section-heading">프로젝트 목록</h3>
                        {(!Array.isArray(currentBlock.data) || currentBlock.data.length === 0) && (
                            <p className="inspector-empty-state rounded-lg border border-dashed border-neutral-700 text-center text-[11px] text-neutral-500">
                                프로젝트 항목을 추가해 주세요.
                            </p>
                        )}

                        {Array.isArray(currentBlock.data) &&
                            currentBlock.data.map((proj: any, projectIndex: number) => (
                                <div
                                    key={proj.id}
                                    className="inspector-repeat-card inspector-project-card"
                                >
                                    <div className="inspector-project-card__summary">
                                        <button
                                            type="button"
                                            className="inspector-project-card__toggle"
                                            onClick={() => setExpandedProjectId((current) => current === proj.id ? null : proj.id)}
                                            aria-expanded={expandedProjectId === proj.id}
                                        >
                                            <span className="inspector-project-card__summary-copy">
                                                <strong>{proj.title || "제목 없는 프로젝트"}</strong>
                                            </span>
                                            <ChevronDown className={expandedProjectId === proj.id ? "rotate-180" : ""} size={15} />
                                        </button>
                                        <details className="inspector-contact-menu inspector-project-menu">
                                            <summary
                                                data-tooltip={`${proj.title || "프로젝트"} 항목 메뉴`}
                                                aria-label={`${proj.title || "프로젝트"} 항목 메뉴`}
                                            >
                                                <MoreHorizontal size={16} />
                                            </summary>
                                            <div className="inspector-contact-menu__popover">
                                                <button
                                                    type="button"
                                                    onClick={() => handleReorderProject(projectIndex, projectIndex - 1)}
                                                    disabled={projectIndex === 0}
                                                >
                                                    <ChevronUp size={13} /> 위로 이동
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleReorderProject(projectIndex, projectIndex + 1)}
                                                    disabled={projectIndex === currentBlock.data.length - 1}
                                                >
                                                    <ChevronDown size={13} /> 아래로 이동
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inspector-project-menu__switch-item"
                                                    role="switch"
                                                    aria-checked={proj.keepTogether ?? (currentBlock.style.keepTogether === true)}
                                                    onClick={() => handleUpdateProjectField(
                                                        proj.id,
                                                        "keepTogether",
                                                        !(proj.keepTogether ?? (currentBlock.style.keepTogether === true)),
                                                    )}
                                                >
                                                    <span>자동 페이지 맞춤</span>
                                                    <span className="inspector-project-menu__switch" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="is-danger"
                                                    onClick={() => handleRemoveProjectItem(proj.id)}
                                                >
                                                    <Trash2 size={13} /> 삭제
                                                </button>
                                            </div>
                                        </details>
                                    </div>

                                    {expandedProjectId === proj.id && (
                                        <div className="inspector-project-card__body">
                                            <div className="inspector-field">
                                                <label className="inspector-label-inset block text-xs text-neutral-400">프로젝트명</label>
                                                <input
                                                    type="text"
                                                    placeholder="프로젝트명"
                                                    value={proj.title || ""}
                                                    onChange={(e) => handleUpdateProjectField(proj.id, "title", e.target.value)}
                                                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                />
                                            </div>

                                            <div className="inspector-field">
                                                <label className="inspector-label-inset block text-xs text-neutral-400">역할 / 기여도</label>
                                                <input
                                                    type="text"
                                                    placeholder="담당 역할 또는 기여도"
                                                    value={proj.role || ""}
                                                    onChange={(e) => handleUpdateProjectField(proj.id, "role", e.target.value)}
                                                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                />
                                            </div>

                                            <div className="inspector-field">
                                                <label className="inspector-label-inset inspector-optional-label text-xs text-neutral-400">링크 URL <span className="font-normal text-neutral-600">선택</span></label>
                                                <input
                                                    type="text"
                                                    placeholder="https://github.com/..."
                                                    value={proj.link || ""}
                                                    onChange={(e) => handleUpdateProjectField(proj.id, "link", e.target.value)}
                                                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                />
                                            </div>

                                            <div className="inspector-project-card__dates">
                                                <div className="inspector-field">
                                                    <label className="inspector-label-inset inspector-optional-label text-xs text-neutral-400">시작일 <span className="font-normal text-neutral-600">선택</span></label>
                                                    <input
                                                        type="text"
                                                        placeholder="예: 2025.01"
                                                        value={proj.startDate || ""}
                                                        onChange={(e) => handleUpdateProjectField(proj.id, "startDate", e.target.value)}
                                                        className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="inspector-field">
                                                    <label className="inspector-label-inset inspector-optional-label text-xs text-neutral-400">종료일 <span className="font-normal text-neutral-600">선택</span></label>
                                                    <input
                                                        type="text"
                                                        placeholder="예: 진행 중"
                                                        value={proj.endDate || ""}
                                                        onChange={(e) => handleUpdateProjectField(proj.id, "endDate", e.target.value)}
                                                        className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="inspector-field inspector-project-card__bullets">
                                                <div>
                                                    <label className="inspector-label-inset block text-xs text-neutral-400">기여/성과</label>
                                                    <div className="inspector-shortcut-guide" aria-label="불릿 편집 단축키">
                                                        <span><Kbd>Enter</Kbd> 새 불릿</span>
                                                        <span><Kbd>Tab</Kbd> 들여쓰기</span>
                                                        <span>
                                                            <KbdGroup><Kbd>Ctrl/⌘</Kbd><span>+</span><Kbd>B</Kbd></KbdGroup>
                                                            볼드
                                                        </span>
                                                    </div>
                                                </div>

                                                <ProjectBulletDocumentEditor
                                                    descriptions={proj.description || []}
                                                    levels={proj.descriptionLevels || []}
                                                    html={proj.descriptionHtml || []}
                                                    onChange={(description, descriptionLevels, descriptionHtml) => (
                                                        handleUpdateProjBulletDocument(
                                                            proj.id,
                                                            description,
                                                            descriptionLevels,
                                                            descriptionHtml,
                                                        )
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        <button type="button" onClick={handleAddProjectItem} className="inspector-list-add">
                            <Plus size={14} /> 프로젝트 추가
                        </button>
                    </div>
                )}

                {/* [스킬 폼] */}
                {currentBlock.type === "skills" && (
                    <div className="inspector-list-section border-t border-neutral-800 pt-4">
                        <div>
                            <div>
                                <span className="block text-xs font-semibold text-neutral-300">스킬 카테고리</span>
                                <span className="mt-0.5 block text-[10px] text-neutral-500">직무 영역별로 기술을 묶어 표시합니다.</span>
                            </div>
                        </div>

                        {skillCategories.length === 0 && (
                            <p className="inspector-empty-state rounded-lg border border-dashed border-neutral-700 px-3 py-3 text-center text-[11px] text-neutral-500">
                                카테고리를 추가해 기술 스택을 정리해 주세요.
                            </p>
                        )}

                        <div className="space-y-2">
                            {skillCategories.map((category) => {
                                const isExpanded = expandedSkillCategoryId === category.id;
                                return (
                                    <div key={category.id} className="inspector-skill-category">
                                        <div className="inspector-skill-category__header">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedSkillCategoryId(isExpanded ? null : category.id)}
                                                className="inspector-skill-category__trigger"
                                                aria-expanded={isExpanded}
                                            >
                                                <ChevronDown size={14} aria-hidden="true" />
                                                <span>{category.name || "이름 없는 카테고리"}</span>
                                                <span className="inspector-skill-category__count">{category.skills.length}개</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateSkillCategories(skillCategories.filter((item) => item.id !== category.id));
                                                    if (isExpanded) setExpandedSkillCategoryId(null);
                                                }}
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"
                                                data-tooltip={`${category.name || "스킬"} 카테고리 삭제`}
                                                aria-label={`${category.name || "스킬"} 카테고리 삭제`}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                        {isExpanded && (
                                            <div className="inspector-skill-category__body">
                                                <label className="block text-[10px] font-medium text-neutral-500">카테고리명</label>
                                                <input
                                                    type="text"
                                                    value={category.name}
                                                    placeholder="카테고리명"
                                                    aria-label="스킬 카테고리명"
                                                    onChange={(event) => updateSkillCategories(skillCategories.map((item) => (
                                                        item.id === category.id ? { ...item, name: event.target.value } : item
                                                    )))}
                                                    className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs font-semibold text-neutral-200 outline-none focus:border-blue-500"
                                                />
                                                <label className="mt-3 block text-[10px] font-medium text-neutral-500">기술</label>
                                                <input
                                                    type="text"
                                                    placeholder="기술 입력 후 Enter"
                                                    value={newSkillInputs[category.id] || ""}
                                                    onChange={(event) => setNewSkillInputs((current) => ({ ...current, [category.id]: event.target.value }))}
                                                    onKeyDown={(event) => handleAddSkill(event, category.id)}
                                                    className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                />
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {category.skills.map((skill) => (
                                                        <span key={skill} className="inspector-badge inline-flex items-center gap-1 text-xs">
                                                            {skill}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveSkill(category.id, skill)}
                                                                className="text-neutral-400 transition hover:text-red-400"
                                                                aria-label={`${skill} 삭제`}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const id = `skill-category-${Date.now()}`;
                                updateSkillCategories([...skillCategories, { id, name: "새 카테고리", skills: [] }]);
                                setExpandedSkillCategoryId(id);
                            }}
                            className="inspector-list-add"
                        >
                            <Plus size={14} /> 카테고리 추가
                        </button>
                    </div>
                )}

                {/* [학력(Education) 폼] */}
                {currentBlock.type === "education" && (
                    <div className={`inspector-list-section${editingEducation ? " inspector-list-section--experience-detail" : " border-t border-neutral-800 pt-4"}`}>
                        {!editingEducation && (
                            <div>
                                <span className="text-xs font-semibold text-neutral-300">학력 목록</span>
                            </div>
                        )}
                        {(!Array.isArray(currentBlock.data) || currentBlock.data.length === 0) && (
                            <p className="inspector-empty-state rounded-lg border border-dashed border-neutral-700 text-center text-[11px] text-neutral-500">
                                학력 항목을 추가해 주세요.
                            </p>
                        )}

                        {Array.isArray(currentBlock.data) &&
                            currentBlock.data
                                .filter((edu: any) => !editingEducation || edu.id === editingEducation.id)
                                .map((edu: any, educationIndex: number) => (
                                <div
                                    key={edu.id}
                                    className={editingEducation?.id === edu.id
                                        ? "inspector-experience-editor__card"
                                        : "inspector-repeat-card inspector-project-card"}
                                >
                                    {!editingEducation && (
                                        <div className="inspector-project-card__summary">
                                            <button
                                                type="button"
                                                className="inspector-project-card__toggle"
                                                onClick={() => {
                                                    setEditingEducationId(edu.id);
                                                    blockPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                                                }}
                                                aria-label={`${edu.school || "학교명 없음"} 편집`}
                                            >
                                                <span className="inspector-project-card__summary-copy">
                                                    <strong>{edu.school || "학교명 없음"}</strong>
                                                </span>
                                                <span className="inspector-project-card__edit-action" aria-hidden="true">편집</span>
                                            </button>
                                            <details className="inspector-contact-menu inspector-project-menu">
                                                <summary
                                                    data-tooltip={`${edu.school || "학력"} 항목 메뉴`}
                                                    aria-label={`${edu.school || "학력"} 항목 메뉴`}
                                                >
                                                    <MoreHorizontal size={16} />
                                                </summary>
                                                <div className="inspector-contact-menu__popover">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReorderEducation(educationIndex, educationIndex - 1)}
                                                        disabled={educationIndex === 0}
                                                    >
                                                        <ChevronUp size={13} /> 위로 이동
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReorderEducation(educationIndex, educationIndex + 1)}
                                                        disabled={educationIndex === currentBlock.data.length - 1}
                                                    >
                                                        <ChevronDown size={13} /> 아래로 이동
                                                    </button>
                                                    <button type="button" className="is-danger" onClick={() => handleRemoveEduItem(edu.id)}>
                                                        <Trash2 size={13} /> 삭제
                                                    </button>
                                                </div>
                                            </details>
                                        </div>
                                    )}

                                    {editingEducation?.id === edu.id && (
                                    <div className="inspector-project-card__body">
                                    <div className="inspector-field">
                                        <label className="inspector-label-inset inspector-field-label block">학교명</label>
                                        <input
                                            type="text"
                                            placeholder="학교명"
                                            value={edu.school || ""}
                                            onChange={(e) => handleUpdateEduField(edu.id, "school", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="inspector-field">
                                        <label className="inspector-label-inset inspector-field-label block">전공</label>
                                        <input
                                            type="text"
                                            placeholder="전공명"
                                            value={edu.major || ""}
                                            onChange={(e) => handleUpdateEduField(edu.id, "major", e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="inspector-project-card__dates">
                                        <div className="inspector-field">
                                            <label className="inspector-label-inset inspector-field-label block">입학일</label>
                                            <input
                                                type="text"
                                                placeholder="예: 2019.03"
                                                value={edu.startDate || ""}
                                                onChange={(e) => handleUpdateEduField(edu.id, "startDate", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="inspector-field">
                                            <label className="inspector-label-inset inspector-field-label block">졸업일</label>
                                            <input
                                                type="text"
                                                placeholder="예: 2023.02"
                                                value={edu.endDate || ""}
                                                onChange={(e) => handleUpdateEduField(edu.id, "endDate", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="inspector-project-card__dates">
                                        <div className="inspector-field">
                                            <label className="inspector-label-inset inspector-optional-label">상태 <span className="font-normal text-neutral-600">선택</span></label>
                                            <input
                                                type="text"
                                                placeholder="예: 졸업"
                                                value={edu.status || ""}
                                                onChange={(e) => handleUpdateEduField(edu.id, "status", e.target.value)}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="inspector-field">
                                            <label className="inspector-label-inset inspector-optional-label">학점 <span className="font-normal text-neutral-600">선택</span></label>
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
                                    )}
                                </div>
                            ))}
                        {!editingEducation && (
                            <button type="button" onClick={handleAddEducationItem} className="inspector-list-add">
                                <Plus size={14} /> 학력 추가
                            </button>
                        )}
                    </div>
                )}

                {/* [기타 경험(Other Experience) 폼] */}
                {currentBlock.type === "certification" && (
                    <div className={`inspector-list-section${editingCertification ? " inspector-list-section--experience-detail" : " border-t border-neutral-800 pt-4"}`}>
                        {!editingCertification && (
                            <div>
                                <span className="text-xs font-semibold text-neutral-300">기타 경험 목록</span>
                            </div>
                        )}
                        {(!Array.isArray(currentBlock.data) || currentBlock.data.length === 0) && (
                            <p className="inspector-empty-state rounded-lg border border-dashed border-neutral-700 text-center text-[11px] text-neutral-500">
                                기타 경험을 추가해 주세요.
                            </p>
                        )}

                        {Array.isArray(currentBlock.data) &&
                            currentBlock.data
                                .filter((cert: any) => !editingCertification || cert.id === editingCertification.id)
                                .map((cert: any, certificationIndex: number) => (
                                <div
                                    key={cert.id}
                                    className={editingCertification?.id === cert.id
                                        ? "inspector-experience-editor__card"
                                        : "inspector-repeat-card inspector-project-card"}
                                >
                                    {!editingCertification && (
                                        <div className="inspector-project-card__summary">
                                            <button
                                                type="button"
                                                className="inspector-project-card__toggle"
                                                onClick={() => {
                                                    setEditingCertificationId(cert.id);
                                                    blockPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                                                }}
                                                aria-label={`${cert.title || "활동명 없음"} 편집`}
                                            >
                                                <span className="inspector-project-card__summary-copy">
                                                    <strong>{cert.title || "활동명 없음"}</strong>
                                                </span>
                                                <span className="inspector-project-card__edit-action" aria-hidden="true">편집</span>
                                            </button>
                                            <details className="inspector-contact-menu inspector-project-menu">
                                                <summary
                                                    data-tooltip={`${cert.title || "기타 경험"} 항목 메뉴`}
                                                    aria-label={`${cert.title || "기타 경험"} 항목 메뉴`}
                                                >
                                                    <MoreHorizontal size={16} />
                                                </summary>
                                                <div className="inspector-contact-menu__popover">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReorderCertification(certificationIndex, certificationIndex - 1)}
                                                        disabled={certificationIndex === 0}
                                                    >
                                                        <ChevronUp size={13} /> 위로 이동
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReorderCertification(certificationIndex, certificationIndex + 1)}
                                                        disabled={certificationIndex === currentBlock.data.length - 1}
                                                    >
                                                        <ChevronDown size={13} /> 아래로 이동
                                                    </button>
                                                    <button type="button" className="is-danger" onClick={() => handleRemoveCertItem(cert.id)}>
                                                        <Trash2 size={13} /> 삭제
                                                    </button>
                                                </div>
                                            </details>
                                        </div>
                                    )}

                                    {editingCertification?.id === cert.id && (
                                    <div className="inspector-project-card__body">
                                    <div className="inspector-field">
                                        <label className="inspector-label-inset inspector-field-label block">활동명</label>
                                        <textarea
                                            rows={2}
                                            placeholder="활동, 수상 또는 프로그램명"
                                            value={cert.title || ""}
                                            onChange={(e) => handleUpdateCertField(cert.id, "title", e.target.value)}
                                            className="w-full resize-y bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="inspector-project-card__dates">
                                        <div className="inspector-field">
                                            <label className="inspector-label-inset inspector-optional-label">시작일 <span className="font-normal text-neutral-600">선택</span></label>
                                            <input
                                                type="text"
                                                placeholder="예: 2024.09"
                                                value={cert.startDate || ""}
                                                onChange={(event) => handleUpdateCertField(cert.id, "startDate", event.target.value)}
                                                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="inspector-field">
                                            <label className="inspector-label-inset inspector-optional-label">종료일 <span className="font-normal text-neutral-600">선택</span></label>
                                            <input
                                                type="text"
                                                placeholder="예: 2025.01"
                                                value={cert.endDate || ""}
                                                onChange={(event) => handleUpdateCertField(cert.id, "endDate", event.target.value)}
                                                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="inspector-field">
                                        <label className="inspector-label-inset inspector-optional-label">링크 URL <span className="font-normal text-neutral-600">선택</span></label>
                                        <input
                                            type="text"
                                            placeholder="https://github.com/..."
                                            value={cert.link || ""}
                                            onChange={(event) => handleUpdateCertField(cert.id, "link", event.target.value)}
                                            className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="inspector-field inspector-project-card__bullets">
                                        <div>
                                            <label className="inspector-label-inset inspector-field-label block">활동 내용 및 성과</label>
                                            <div className="inspector-shortcut-guide" aria-label="기타 경험 불렛 편집 단축키">
                                                <span><Kbd>Enter</Kbd> 새 불렛</span>
                                                <span><Kbd>Ctrl/⌘ + B</Kbd> 볼드</span>
                                            </div>
                                        </div>
                                        <ProjectBulletDocumentEditor
                                            descriptions={Array.isArray(cert.description)
                                                ? cert.description
                                                : cert.description
                                                    ? [cert.description]
                                                    : cert.issuer
                                                        ? [cert.issuer]
                                                        : []}
                                            levels={(Array.isArray(cert.description) ? cert.description : []).map(() => 1)}
                                            html={cert.descriptionHtml || []}
                                            onChange={(description, descriptionLevels, descriptionHtml) => (
                                                handleUpdateCertDescription(
                                                    cert.id,
                                                    description,
                                                    descriptionLevels,
                                                    descriptionHtml,
                                                )
                                            )}
                                            maxLevel={1}
                                            allowBold
                                            placeholder="활동 내용이나 성과를 입력하세요"
                                            ariaLabel="기타 경험 활동 내용 및 성과"
                                        />
                                    </div>
                                    </div>
                                    )}
                                </div>
                            ))}
                        {!editingCertification && (
                            <button type="button" onClick={handleAddCertItem} className="inspector-list-add">
                                <Plus size={14} /> 기타 경험 추가
                            </button>
                        )}
                    </div>
                )}

                {/* [자유 텍스트 폼] */}
                {currentBlock.type === "custom_text" && (
                    <div className="inspector-form-stack border-t border-neutral-800 pt-4">
                        <div className="inspector-field">
                            <label className="text-xs text-neutral-400 block">섹션 제목</label>
                            <input
                                type="text"
                                value={currentBlock.title}
                                onChange={(e) => updateBlockStyle(currentBlock.id, { ...currentBlock.style })}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="inspector-field">
                            <label className="text-xs text-neutral-400 block">내용</label>
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
