// src/components/editor/InspectorPanel.tsx
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { ProfileData, SkillCategory, SkillsData } from "@/types/resume";
import { getProfileContacts, withProfileContacts } from "@/lib/profileContacts";
import { getSkillCategories, withSkillCategories } from "@/lib/skills";
import { formatBlockTitle } from "@/lib/blockTitles";
import { escapeHtml, richTextToPlainText, sanitizeInlineRichText, splitInlineRichTextLines } from "@/lib/richText";
import ProjectBulletDocumentEditor from "@/components/editor/ProjectBulletDocumentEditor";
import ProfilePhotoCropDialog from "@/components/editor/ProfilePhotoCropDialog";
import GlobalStylePanel, { DEFAULT_GLOBAL_STYLE } from "@/components/editor/GlobalStylePanel";
import RichTextEditable from "@/components/editor/RichTextEditable";
import { Kbd, KbdGroup } from "@/components/ui/Kbd";
import {
    Trash2,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Eye,
    EyeOff,
    GripVertical,
    ImagePlus,
    Crop,
    Link2,
    MoreHorizontal,
} from "lucide-react";

const BLOCK_TYPE_LABELS: Record<string, string> = {
    profile: "프로필",
    skills: "스킬",
    experience: "경력",
    project: "프로젝트",
    education: "학력",
    certification: "기타 경험",
    custom_text: "자유 텍스트",
};

type ContentStyle = "bullets" | "paragraph";

// 불렛/줄글 표시 방식을 스위치 대신 두 칸짜리 선택지로 보여준다.
function ContentStyleToggle({ value, onChange, label }: { value: ContentStyle; onChange: (value: ContentStyle) => void; label: string }) {
    return (
        <div className="block-settings__segmented" role="radiogroup" aria-label={label}>
            {(["bullets", "paragraph"] as const).map((option) => (
                <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={value === option}
                    onClick={() => onChange(option)}
                >
                    {option === "bullets" ? "불렛" : "줄글"}
                </button>
            ))}
        </div>
    );
}

export default function InspectorPanel() {
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const selectedBlockItemId = useResumeStore((state) => state.selectedBlockItemId);
    const selectedBlockSubItemId = useResumeStore((state) => state.selectedBlockSubItemId);
    const setSelectedBlockItemId = useResumeStore((state) => state.setSelectedBlockItemId);
    const setSelectedBlockSubItemId = useResumeStore((state) => state.setSelectedBlockSubItemId);
    const blocks = useResumeStore((state) => state.resume.blocks);
    const globalStyle = useResumeStore((state) => state.resume.globalStyle);
    const updateBlockTitle = useResumeStore((state) => state.updateBlockTitle);
    const updateBlockStyle = useResumeStore((state) => state.updateBlockStyle);
    const updateBlockData = useResumeStore((state) => state.updateBlockData);
    const removeBlock = useResumeStore((state) => state.removeBlock);
    const reorderBlocks = useResumeStore((state) => state.reorderBlocks);
    const toggleBlockVisibility = useResumeStore((state) => state.toggleBlockVisibility);
    const inspectorAccentStyle = {
        "--inspector-accent": globalStyle?.primaryColor || DEFAULT_GLOBAL_STYLE.primaryColor,
    } as CSSProperties;

    const [newSkillInputs, setNewSkillInputs] = useState<Record<string, string>>({});
    const [expandedSkillCategoryId, setExpandedSkillCategoryId] = useState<string | null>(null);
    const [draggedContactIndex, setDraggedContactIndex] = useState<number | null>(null);
    const [editingEducationId, setEditingEducationId] = useState<string | null>(null);
    const [editingCertificationId, setEditingCertificationId] = useState<string | null>(null);
    const [pendingProfilePhoto, setPendingProfilePhoto] = useState<{
        blockId: string;
        file?: File;
        source?: string;
        crop?: NonNullable<ProfileData["photoCrop"]>;
    } | null>(null);
    const blockPanelRef = useRef<HTMLElement>(null);

    useEffect(() => {
        blockPanelRef.current?.scrollTo({ top: 0 });
        setEditingEducationId(null);
        setEditingCertificationId(null);
    }, [selectedBlockId]);

    const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);
    const currentBlock = blocks[currentIndex];
    const editingExperienceId = currentBlock?.type === "experience" ? selectedBlockItemId : null;
    const setEditingExperienceId = setSelectedBlockItemId;
    const editingProjectId = currentBlock?.type === "project" ? selectedBlockItemId : null;
    const setEditingProjectId = setSelectedBlockItemId;
    const expandedExperienceProjectId = currentBlock?.type === "experience"
        ? selectedBlockSubItemId
        : null;
    const setExpandedExperienceProjectId = setSelectedBlockSubItemId;
    const profileContacts = currentBlock?.type === "profile"
        ? getProfileContacts(currentBlock.data as ProfileData)
        : [];
    const editingExperience = currentBlock?.type === "experience" && Array.isArray(currentBlock.data)
        ? currentBlock.data.find((experience: any) => experience.id === editingExperienceId)
        : undefined;
    const editingExperienceProject = editingExperience && Array.isArray(editingExperience.projects)
        ? editingExperience.projects.find((project: any) => project.id === expandedExperienceProjectId)
        : undefined;
    const editingProject = currentBlock?.type === "project" && Array.isArray(currentBlock.data)
        ? currentBlock.data.find((project: any) => project.id === editingProjectId)
        : undefined;
    const editingEducation = currentBlock?.type === "education" && Array.isArray(currentBlock.data)
        ? currentBlock.data.find((education: any) => education.id === editingEducationId)
        : undefined;
    const editingCertification = currentBlock?.type === "certification" && Array.isArray(currentBlock.data)
        ? currentBlock.data.find((certification: any) => certification.id === editingCertificationId)
        : undefined;

    // 1. 블록 미선택 시: 문서 전역 설정 패널
    if (!currentBlock) return <GlobalStylePanel />;

    // --- 공통 블록 조작 ---
    const handleProfilePhotoUpload = (file?: File) => {
        if (!file || currentBlock.type !== "profile") return;
        setPendingProfilePhoto({ file, blockId: currentBlock.id });
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

    const handleUpdateExpFields = (expId: string, patch: Record<string, unknown>) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.map((item: any) => (item.id === expId ? { ...item, ...patch } : item)),
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
        setEditingProjectId(newItem.id);
        blockPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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
        if (editingProjectId === projId) {
            setEditingProjectId(null);
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
        <aside ref={blockPanelRef} style={inspectorAccentStyle} className="inspector-panel inspector-panel--block block-settings h-full w-full overflow-y-auto">
            {editingExperience || editingProject || editingEducation || editingCertification ? (
                <header className="block-settings__header block-settings__header--detail">
                    <button
                        type="button"
                        className="block-settings__back"
                        onClick={() => {
                            if (editingExperienceProject) {
                                setExpandedExperienceProjectId(null);
                                blockPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                                return;
                            }
                            setEditingExperienceId(null);
                            setEditingEducationId(null);
                            setEditingCertificationId(null);
                            setEditingProjectId(null);
                            setExpandedExperienceProjectId(null);
                            blockPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        aria-label={editingExperienceProject
                            ? "회사 설정으로 돌아가기"
                            : editingExperience
                            ? "경력(회사) 목록으로 돌아가기"
                            : editingProject
                                ? "프로젝트 목록으로 돌아가기"
                            : editingEducation
                                ? "학력 목록으로 돌아가기"
                                : "기타 경험 목록으로 돌아가기"}
                    >
                        <ChevronLeft size={16} aria-hidden="true" />
                    </button>
                    <div className="block-settings__heading">
                        <p className="block-settings__eyebrow">
                            {editingExperienceProject
                                ? `${editingExperience?.company || "회사명 없음"} · 프로젝트`
                                : editingExperience
                                ? "경력 · 회사"
                                : editingProject
                                    ? "프로젝트"
                                : editingEducation
                                    ? "학력"
                                    : "기타 경험"}
                        </p>
                        <h2 className="doc-settings__title block-settings__title">
                            {editingExperienceProject
                                ? (editingExperienceProject.title || "제목 없는 프로젝트")
                                : editingExperience
                                ? (editingExperience.company || "회사명 없음")
                                : editingProject
                                    ? (editingProject.title || "제목 없는 프로젝트")
                                : editingEducation
                                    ? (editingEducation.school || "학교명 없음")
                                    : (editingCertification?.title || "활동명 없음")}
                        </h2>
                    </div>
                </header>
            ) : (
                <header className="block-settings__header">
                    <div className="block-settings__heading">
                        <h2 className="doc-settings__title block-settings__title">
                            {BLOCK_TYPE_LABELS[currentBlock.type] ?? "블록"}
                            {currentBlock.isVisible === false && <span className="block-settings__badge">숨김</span>}
                        </h2>
                        <p className="doc-settings__subtitle">
                            {currentBlock.isVisible === false
                                ? "이력서에 표시되지 않아요"
                                : `${blocks.length}개 블록 중 ${currentIndex + 1}번째`}
                        </p>
                    </div>
                    <div className="block-settings__actions">
                        <button
                            type="button"
                            onClick={() => toggleBlockVisibility(currentBlock.id)}
                            aria-pressed={currentBlock.isVisible === false}
                            data-tooltip={currentBlock.isVisible === false ? "블록 표시하기" : "블록 숨기기"}
                            aria-label={currentBlock.isVisible === false ? "블록 표시하기" : "블록 숨기기"}
                        >
                            {currentBlock.isVisible === false ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                            type="button"
                            onClick={handleMoveUp}
                            disabled={currentIndex === 0}
                            data-tooltip="위로 이동"
                            aria-label="블록 위로 이동"
                        >
                            <ChevronUp size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={handleMoveDown}
                            disabled={currentIndex === blocks.length - 1}
                            data-tooltip="아래로 이동"
                            aria-label="블록 아래로 이동"
                        >
                            <ChevronDown size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => removeBlock(currentBlock.id)}
                            className="is-danger"
                            data-tooltip="블록 삭제"
                            aria-label="블록 삭제"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </header>
            )}

            <div className="inspector-panel-stack block-settings__body">
                {!editingExperience && !editingProject && !editingEducation && !editingCertification && (
                    <section className="block-settings__section">
                        <h3 className="doc-settings__section-title">섹션 제목</h3>
                        <input
                            type="text"
                            value={formatBlockTitle(currentBlock.type === "certification" && currentBlock.title === "CERTIFICATIONS & AWARDS"
                                ? "Other Experience"
                                : currentBlock.title || "")}
                            placeholder="이력서에 보일 섹션 제목"
                            aria-label="섹션 제목"
                            onChange={(e) => updateBlockTitle(currentBlock.id, formatBlockTitle(e.target.value))}
                            className="w-full border"
                        />
                    </section>
                )}

                {/* 블록별 데이터 입력 폼 */}

                {/* [프로필 폼] */}
                {currentBlock.type === "profile" && (
                    <>
                    <div className="inspector-form-stack">
                        <h3 className="doc-settings__section-title">기본 정보</h3>
                        <div className="inspector-field">
                            <div className="block-settings__field-head">
                                <label className="inspector-field-label">프로필 사진</label>
                                <label className="block-settings__inline-switch">
                                    <input
                                        type="checkbox"
                                        checked={currentBlock.data.showPhoto !== false}
                                        onChange={(event) => updateBlockData(currentBlock.id, {
                                            ...currentBlock.data,
                                            showPhoto: event.target.checked,
                                        })}
                                        aria-label="프로필 사진 표시"
                                    />
                                    표시
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
                                            handleProfilePhotoUpload(event.target.files?.[0]);
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
                                                handleProfilePhotoUpload(event.target.files?.[0]);
                                                event.currentTarget.value = "";
                                            }}
                                        />
                                    </label>
                                    {currentBlock.data.photo && (
                                        <button
                                            type="button"
                                            className="inspector-photo-action inspector-photo-action--edit"
                                            onClick={() => setPendingProfilePhoto({
                                                blockId: currentBlock.id,
                                                source: currentBlock.data.photoSource || currentBlock.data.photo,
                                                crop: currentBlock.data.photoSource
                                                    ? currentBlock.data.photoCrop
                                                    : { focusX: 0.5, focusY: 0.5, zoom: 1 },
                                            })}
                                        >
                                            <Crop size={14} aria-hidden="true" />
                                            사진 편집
                                        </button>
                                    )}
                                    {currentBlock.data.photo && (
                                        <button
                                            type="button"
                                            className="inspector-photo-action inspector-photo-action--remove"
                                            onClick={() => updateBlockData(currentBlock.id, {
                                                ...currentBlock.data,
                                                photo: "",
                                                photoSource: "",
                                                photoCrop: undefined,
                                            })}
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
                            <div className="block-settings__field-head">
                                <label className="inspector-field-label">한 줄 소개</label>
                                <span className="block-settings__field-hint">이름 위에 표시</span>
                            </div>
                            <RichTextEditable
                                html={currentBlock.data.bioHtml || escapeHtml(currentBlock.data.bio || "")}
                                placeholder="예: 사용자 중심의 서비스를 만드는"
                                onChange={(bioHtml) => updateBlockData(currentBlock.id, {
                                    ...currentBlock.data,
                                    bio: richTextToPlainText(bioHtml),
                                    bioHtml,
                                })}
                                className="inspector-rich-text-editor min-h-14"
                            />
                        </div>
                        <div className="inspector-field">
                            <label className="inspector-field-label">직무</label>
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
                            <label className="inspector-field-label">이름</label>
                            <input
                                type="text"
                                value={currentBlock.data.name || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { ...currentBlock.data, name: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="inspector-form-stack">
                        <div className="inspector-field inspector-contact-list">
                            <h3 className="doc-settings__section-title">
                                연락처 <span className="block-settings__count">{profileContacts.length}</span>
                            </h3>
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
                    </div>
                    <div className="inspector-form-stack">
                        <div className="inspector-field">
                            <div className="block-settings__field-head">
                                <h3 className="doc-settings__section-title">자기소개</h3>
                                <ContentStyleToggle
                                    value={currentBlock.data.introductionStyle || "bullets"}
                                    onChange={(value) => updateBlockData(currentBlock.id, {
                                        ...currentBlock.data,
                                        introductionStyle: value,
                                    })}
                                    label="자기소개 표시 방식"
                                />
                            </div>
                            {(currentBlock.data.introductionStyle || "bullets") === "bullets" ? (
                                <>
                                    <ProjectBulletDocumentEditor
                                        descriptions={currentBlock.data.highlights || []}
                                        levels={(currentBlock.data.highlights || []).map(() => 1)}
                                        html={currentBlock.data.highlightsHtml || []}
                                        onChange={(highlights, _levels, highlightsHtml) => updateBlockData(currentBlock.id, {
                                            ...currentBlock.data,
                                            highlights,
                                            highlightsHtml,
                                        })}
                                        maxLevel={1}
                                        placeholder="핵심 경험이나 강점을 입력하세요"
                                        ariaLabel="자기소개 불렛 목록"
                                    />
                                </>
                            ) : (
                                <>
                                    <RichTextEditable
                                        html={(currentBlock.data.highlightsHtml || currentBlock.data.highlights?.map(escapeHtml) || []).join("<br>")}
                                        placeholder="자기소개를 입력하세요"
                                        onChange={(html) => {
                                            const highlightsHtml = splitInlineRichTextLines(html);
                                            updateBlockData(currentBlock.id, {
                                            ...currentBlock.data,
                                                highlights: highlightsHtml.map(richTextToPlainText),
                                                highlightsHtml,
                                            });
                                        }}
                                        className="inspector-rich-text-editor"
                                    />
                                    <p className="text-[10px] text-neutral-500">
                                        문장별로 줄을 나눠 입력하면 미리보기에서는 자연스럽게 이어서 표시됩니다.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                    </>
                )}

                {/* [경력 폼] */}
                {currentBlock.type === "experience" && (
                    <div className={`inspector-list-section${editingExperience ? " inspector-list-section--experience-detail" : ""}`}>
                        {!editingExperience && (
                            <h3 className="doc-settings__section-title">
                                회사 <span className="block-settings__count">{Array.isArray(currentBlock.data) ? currentBlock.data.length : 0}</span>
                            </h3>
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
                                                    <ChevronRight className="inspector-project-card__edit-action" size={15} aria-hidden="true" />
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

                                        {editingExperience?.id === exp.id && editingExperienceProject && (
                                            <div className="inspector-project-card__body">
                                                <label className="block-settings__option block-settings__option--page">
                                                    <span className="block-settings__option-copy">
<span className="block-settings__option-label">새 페이지에서 시작</span>
<span className="block-settings__option-hint">이 프로젝트 앞에서 페이지를 나눠요.</span>
</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={editingExperienceProject.startOnNewPage === true}
                                                        onChange={(event) => handleUpdateExperienceProject(
                                                            exp.id,
                                                            editingExperienceProject.id,
                                                            { startOnNewPage: event.target.checked },
                                                        )}
                                                        aria-label="프로젝트를 새 페이지에서 시작"
                                                        
                                                    />
                                                </label>
                                                <div className="inspector-field">
                                                    <label className="inspector-label-inset inspector-field-label block">프로젝트명</label>
                                                    <input
                                                        value={editingExperienceProject.title || ""}
                                                        placeholder="프로젝트명"
                                                        onChange={(event) => handleUpdateExperienceProject(exp.id, editingExperienceProject.id, { title: event.target.value })}
                                                        className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="inspector-field">
                                                    <label className="inspector-label-inset inspector-field-label block">역할 / 프로젝트 소개</label>
                                                    <input
                                                        value={editingExperienceProject.role || ""}
                                                        placeholder="담당 역할 또는 프로젝트 소개"
                                                        onChange={(event) => handleUpdateExperienceProject(exp.id, editingExperienceProject.id, { role: event.target.value })}
                                                        className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="inspector-project-card__dates">
                                                    <div className="inspector-field">
                                                        <label className="inspector-label-inset inspector-optional-label text-xs text-neutral-400">시작일 <span className="font-normal text-neutral-600">선택</span></label>
                                                        <input
                                                            value={editingExperienceProject.startDate || ""}
                                                            placeholder="예: 2024.01"
                                                            onChange={(event) => handleUpdateExperienceProject(exp.id, editingExperienceProject.id, { startDate: event.target.value })}
                                                            className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <div className="inspector-field">
                                                        <label className="inspector-label-inset inspector-optional-label text-xs text-neutral-400">종료일 <span className="font-normal text-neutral-600">선택</span></label>
                                                        <input
                                                            value={editingExperienceProject.endDate || ""}
                                                            placeholder="예: 진행 중"
                                                            onChange={(event) => handleUpdateExperienceProject(exp.id, editingExperienceProject.id, { endDate: event.target.value })}
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
                                                        descriptions={editingExperienceProject.description || []}
                                                        levels={editingExperienceProject.descriptionLevels || []}
                                                        html={editingExperienceProject.descriptionHtml || []}
                                                        onChange={(description, descriptionLevels, descriptionHtml) => (
                                                            handleUpdateExperienceProject(exp.id, editingExperienceProject.id, {
                                                                description,
                                                                descriptionLevels,
                                                                descriptionHtml,
                                                            })
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {editingExperience?.id === exp.id && !editingExperienceProject && (
                                            <div className="inspector-project-card__body">

                                                <label className="block-settings__option block-settings__option--page">
                                                    <span className="block-settings__option-copy">
<span className="block-settings__option-label">새 페이지에서 시작</span>
<span className="block-settings__option-hint">이 회사 경력 앞에서 페이지를 나눠요.</span>
</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={exp.startOnNewPage === true}
                                                        onChange={(event) => handleUpdateExpField(
                                                            exp.id,
                                                            "startOnNewPage",
                                                            event.target.checked,
                                                        )}
                                                        aria-label="회사 경력을 새 페이지에서 시작"
                                                        
                                                    />
                                                </label>

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
                                                        <div className="inspector-period-input">
                                                            <input
                                                                type="text"
                                                                placeholder="예: 재직 중"
                                                                value={exp.endDate || ""}
                                                                onChange={(e) => handleUpdateExpField(exp.id, "endDate", e.target.value)}
                                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                                            />
                                                            {exp.secondStartDate === undefined && exp.secondEndDate === undefined && (
                                                                <button
                                                                    type="button"
                                                                    className="inspector-period-secret-trigger"
                                                                    title="근무 기간 하나 더 추가"
                                                                    aria-label="근무 기간 하나 더 추가"
                                                                    onClick={() => handleUpdateExpFields(exp.id, {
                                                                        secondStartDate: "",
                                                                        secondEndDate: "",
                                                                    })}
                                                                >
                                                                    <Plus size={13} aria-hidden="true" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {(exp.secondStartDate !== undefined || exp.secondEndDate !== undefined) && (
                                                    <div className="inspector-project-card__dates inspector-secondary-period">
                                                        <div className="inspector-field">
                                                            <label className="inspector-label-inset inspector-field-label block">추가 시작일</label>
                                                            <input
                                                                type="text"
                                                                placeholder="예: 2023.10"
                                                                value={exp.secondStartDate || ""}
                                                                onChange={(event) => handleUpdateExpField(exp.id, "secondStartDate", event.target.value)}
                                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="inspector-field">
                                                            <label className="inspector-label-inset inspector-field-label block">추가 종료일</label>
                                                            <div className="inspector-period-input">
                                                                <input
                                                                    type="text"
                                                                    placeholder="예: 2024.09"
                                                                    value={exp.secondEndDate || ""}
                                                                    onChange={(event) => handleUpdateExpField(exp.id, "secondEndDate", event.target.value)}
                                                                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="inspector-period-remove"
                                                                    title="추가 기간 삭제"
                                                                    aria-label="추가 근무 기간 삭제"
                                                                    onClick={() => handleUpdateExpFields(exp.id, {
                                                                        secondStartDate: undefined,
                                                                        secondEndDate: undefined,
                                                                    })}
                                                                >
                                                                    <X size={12} aria-hidden="true" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="inspector-field block-settings__divided">
                                                    <div className="block-settings__field-head">
                                                        <label className="inspector-field-label">회사 소개 및 주요 성과</label>
                                                        <ContentStyleToggle
                                                            value={exp.descriptionStyle || "bullets"}
                                                            onChange={(value) => handleUpdateExpField(exp.id, "descriptionStyle", value)}
                                                            label="회사 소개와 주요 성과 표시 방식"
                                                        />
                                                    </div>
                                                    {(exp.descriptionStyle || "bullets") === "bullets" ? (
                                                        <ProjectBulletDocumentEditor
                                                            descriptions={exp.description || []}
                                                            levels={(exp.description || []).map(() => 1)}
                                                            html={exp.descriptionHtml || []}
                                                            onChange={(description, _levels, descriptionHtml) => updateBlockData(
                                                                currentBlock.id,
                                                                currentBlock.data.map((item: any) => item.id === exp.id
                                                                    ? { ...item, description, descriptionHtml }
                                                                    : item),
                                                            )}
                                                            maxLevel={1}
                                                            placeholder="주요 업무와 성과를 입력하세요"
                                                            ariaLabel="회사 소개 및 주요 성과 불렛 목록"
                                                        />
                                                    ) : (
                                                        <RichTextEditable
                                                            placeholder="주요 업무와 성과를 문장별로 입력하세요"
                                                            html={(exp.descriptionHtml || exp.description?.map(escapeHtml) || []).join("<br>")}
                                                            onChange={(html) => {
                                                                const descriptionHtml = splitInlineRichTextLines(html);
                                                                updateBlockData(
                                                                    currentBlock.id,
                                                                    currentBlock.data.map((item: any) => item.id === exp.id
                                                                        ? {
                                                                            ...item,
                                                                            description: descriptionHtml.map(richTextToPlainText),
                                                                            descriptionHtml,
                                                                        }
                                                                        : item),
                                                                );
                                                            }}
                                                            className="inspector-rich-text-editor"
                                                        />
                                                    )}
                                                </div>

                                                <div className="inspector-list-section block-settings__divided">
                                                    <h3 className="doc-settings__section-title">
                                                        회사 내 프로젝트 <span className="block-settings__count">{(exp.projects || []).length}</span>
                                                    </h3>
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
                                                                    onClick={() => {
                                                                        setExpandedExperienceProjectId(project.id);
                                                                        blockPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                                                                    }}
                                                                >
                                                                    <span className="inspector-project-card__summary-copy">
                                                                        <strong>{project.title || "제목 없는 프로젝트"}</strong>
                                                                    </span>
                                                                    <ChevronRight className="inspector-project-card__edit-action" size={15} aria-hidden="true" />
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
                    <div className={`inspector-list-section${editingProject ? " inspector-list-section--experience-detail" : ""}`}>
                        {!editingProject && (
                            <h3 className="doc-settings__section-title">
                                프로젝트 <span className="block-settings__count">{Array.isArray(currentBlock.data) ? currentBlock.data.length : 0}</span>
                            </h3>
                        )}
                        {(!Array.isArray(currentBlock.data) || currentBlock.data.length === 0) && (
                            <p className="inspector-empty-state rounded-lg border border-dashed border-neutral-700 text-center text-[11px] text-neutral-500">
                                프로젝트 항목을 추가해 주세요.
                            </p>
                        )}

                        {Array.isArray(currentBlock.data) &&
                            currentBlock.data
                                .filter((proj: any) => !editingProject || proj.id === editingProject.id)
                                .map((proj: any, projectIndex: number) => (
                                <div
                                    key={proj.id}
                                    className={editingProject?.id === proj.id
                                        ? "inspector-experience-editor__card"
                                        : "inspector-repeat-card inspector-project-card"}
                                >
                                    {!editingProject && <div className="inspector-project-card__summary">
                                        <button
                                            type="button"
                                            className="inspector-project-card__toggle"
                                            onClick={() => {
                                                setEditingProjectId(proj.id);
                                                blockPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                                            }}
                                            aria-label={`${proj.title || "제목 없는 프로젝트"} 편집`}
                                        >
                                            <span className="inspector-project-card__summary-copy">
                                                <strong>{proj.title || "제목 없는 프로젝트"}</strong>
                                            </span>
                                            <ChevronRight className="inspector-project-card__edit-action" size={15} aria-hidden="true" />
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
                                                    <span>페이지 경계에서 자동 이동</span>
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
                                    </div>}

                                    {editingProject?.id === proj.id && (
                                        <div className="inspector-project-card__body">
                                            <label className="block-settings__option block-settings__option--page">
                                                <span className="block-settings__option-copy">
<span className="block-settings__option-label">새 페이지에서 시작</span>
<span className="block-settings__option-hint">이 프로젝트 앞에서 페이지를 나눠요.</span>
</span>
                                                <input
                                                    type="checkbox"
                                                    checked={proj.startOnNewPage === true}
                                                    onChange={(event) => handleUpdateProjectField(
                                                        proj.id,
                                                        "startOnNewPage",
                                                        event.target.checked,
                                                    )}
                                                    aria-label="프로젝트를 새 페이지에서 시작"
                                                    
                                                />
                                            </label>
                                            <div className="inspector-field">
                                                <label className="inspector-label-inset inspector-field-label block">프로젝트명</label>
                                                <input
                                                    type="text"
                                                    placeholder="프로젝트명"
                                                    value={proj.title || ""}
                                                    onChange={(e) => handleUpdateProjectField(proj.id, "title", e.target.value)}
                                                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-blue-500"
                                                />
                                            </div>

                                            <div className="inspector-field">
                                                <label className="inspector-label-inset inspector-field-label block">역할 / 기여도</label>
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
                        {!editingProject && (
                            <button type="button" onClick={handleAddProjectItem} className="inspector-list-add">
                                <Plus size={14} /> 프로젝트 추가
                            </button>
                        )}
                    </div>
                )}

                {/* [스킬 폼] */}
                {currentBlock.type === "skills" && (
                    <div className="inspector-list-section">
                        <h3 className="doc-settings__section-title">
                            스킬 카테고리 <span className="block-settings__count">{skillCategories.length}</span>
                        </h3>

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
                                updateSkillCategories([...skillCategories, { id, name: "", skills: [] }]);
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
                    <div className={`inspector-list-section${editingEducation ? " inspector-list-section--experience-detail" : ""}`}>
                        {!editingEducation && (
                            <h3 className="doc-settings__section-title">
                                학력 <span className="block-settings__count">{Array.isArray(currentBlock.data) ? currentBlock.data.length : 0}</span>
                            </h3>
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
                                                <ChevronRight className="inspector-project-card__edit-action" size={15} aria-hidden="true" />
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
                                    <label className="block-settings__option block-settings__option--page">
                                        <span className="block-settings__option-copy">
<span className="block-settings__option-label">새 페이지에서 시작</span>
<span className="block-settings__option-hint">이 학력 항목 앞에서 페이지를 나눠요.</span>
</span>
                                        <input
                                            type="checkbox"
                                            checked={edu.startOnNewPage === true}
                                            onChange={(event) => handleUpdateEduField(
                                                edu.id,
                                                "startOnNewPage",
                                                event.target.checked,
                                            )}
                                            aria-label="학력 항목을 새 페이지에서 시작"
                                            
                                        />
                                    </label>
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
                    <div className={`inspector-list-section${editingCertification ? " inspector-list-section--experience-detail" : ""}`}>
                        {!editingCertification && (
                            <h3 className="doc-settings__section-title">
                                기타 경험 <span className="block-settings__count">{Array.isArray(currentBlock.data) ? currentBlock.data.length : 0}</span>
                            </h3>
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
                                                <ChevronRight className="inspector-project-card__edit-action" size={15} aria-hidden="true" />
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
                                    <label className="block-settings__option block-settings__option--page">
                                        <span className="block-settings__option-copy">
<span className="block-settings__option-label">새 페이지에서 시작</span>
<span className="block-settings__option-hint">이 기타 경험 항목 앞에서 페이지를 나눠요.</span>
</span>
                                        <input
                                            type="checkbox"
                                            checked={cert.startOnNewPage === true}
                                            onChange={(event) => handleUpdateCertField(
                                                cert.id,
                                                "startOnNewPage",
                                                event.target.checked,
                                            )}
                                            aria-label="기타 경험 항목을 새 페이지에서 시작"
                                            
                                        />
                                    </label>
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
                    <div className="inspector-form-stack">
                        <div className="inspector-field">
                            <div className="block-settings__field-head">
                                <h3 className="doc-settings__section-title">내용</h3>
                                <ContentStyleToggle
                                    value={currentBlock.data?.contentStyle || "bullets"}
                                    onChange={(value) => updateBlockData(currentBlock.id, {
                                        ...currentBlock.data,
                                        contentStyle: value,
                                    })}
                                    label="내용 표시 방식"
                                />
                            </div>
                            {(currentBlock.data?.contentStyle || "bullets") === "bullets" ? (
                                <ProjectBulletDocumentEditor
                                    descriptions={String(currentBlock.data?.content || "")
                                        .split("\n")
                                        .filter((line) => line.trim())}
                                    levels={String(currentBlock.data?.content || "")
                                        .split("\n")
                                        .filter((line) => line.trim())
                                        .map(() => 1)}
                                    html={currentBlock.data?.contentHtml || []}
                                    onChange={(content, _levels, contentHtml) => updateBlockData(currentBlock.id, {
                                        ...currentBlock.data,
                                        content: content.join("\n"),
                                        contentHtml,
                                    })}
                                    maxLevel={1}
                                    placeholder="추가 정보를 입력하세요"
                                    ariaLabel="추가 정보 불렛 목록"
                                />
                            ) : (
                                <RichTextEditable
                                    html={(currentBlock.data?.contentHtml || String(currentBlock.data?.content || "").split("\n").map(escapeHtml)).join("<br>")}
                                    onChange={(html) => {
                                        const contentHtml = splitInlineRichTextLines(html);
                                        updateBlockData(currentBlock.id, {
                                            ...currentBlock.data,
                                            content: contentHtml.map(richTextToPlainText).join("\n"),
                                            contentHtml,
                                        });
                                    }}
                                    className="inspector-rich-text-editor"
                                    placeholder="내용을 입력하세요."
                                />
                            )}
                        </div>
                    </div>
                )}

                {!editingExperience && !editingProject && !editingEducation && !editingCertification && (
                    <section className="block-settings__section">
                        <h3 className="doc-settings__section-title">페이지와 간격</h3>
                        <div className="block-settings__options">
                            <label className="block-settings__option">
                                <span className="block-settings__option-copy">
                                    <span className="block-settings__option-label">새 페이지에서 시작</span>
                                    <span className="block-settings__option-hint">이 블록 앞에서 페이지를 나눠요.</span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={currentBlock.style.startOnNewPage === true}
                                    onChange={(event) => updateBlockStyle(currentBlock.id, {
                                        startOnNewPage: event.target.checked,
                                    })}
                                    aria-label="블록을 새 페이지에서 시작"
                                />
                            </label>
                            <label className="block-settings__option">
                                <span className="block-settings__option-copy">
                                    <span className="block-settings__option-label">항목을 쪼개지 않기</span>
                                    <span className="block-settings__option-hint">
                                        {currentBlock.type === "project"
                                            ? "페이지 끝에 걸린 프로젝트를 통째로 다음 페이지로 옮겨요."
                                            : "페이지 끝에 걸린 항목을 통째로 다음 페이지로 옮겨요."}
                                    </span>
                                </span>
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
                                    aria-label="페이지 경계에서 항목 자동 이동"
                                />
                            </label>
                            <label className="block-settings__option">
                                <span className="block-settings__option-copy">
                                    <span className="block-settings__option-label">하단 구분선 표시</span>
                                    <span className="block-settings__option-hint">다음 블록과의 사이에 얇은 선을 그어요.</span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={currentBlock.style.showBottomDivider === true}
                                    onChange={(e) => updateBlockStyle(currentBlock.id, { showBottomDivider: e.target.checked })}
                                    aria-label="하단 구분선 표시"
                                />
                            </label>
                            <div className="block-settings__option-group">
                                <label className="block-settings__option">
                                    <span className="block-settings__option-copy">
                                        <span className="block-settings__option-label">위아래 여백 직접 지정</span>
                                        <span className="block-settings__option-hint">전역 섹션 간격에 이 블록만 여백을 더해요.</span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={currentBlock.style.useCustomPadding === true}
                                        onChange={(e) => updateBlockStyle(currentBlock.id, { useCustomPadding: e.target.checked })}
                                        aria-label="개별 간격 사용"
                                    />
                                </label>
                                {currentBlock.style.useCustomPadding === true && (
                                    <label className="doc-settings__slider block-settings__option-slider">
                                        <span className="doc-settings__slider-head">
                                            <span>위아래 여백</span>
                                            <output>{currentBlock.style.paddingY}px</output>
                                        </span>
                                        <input
                                            type="range"
                                            min="4"
                                            max="48"
                                            step="4"
                                            value={currentBlock.style.paddingY}
                                            onChange={(e) => updateBlockStyle(currentBlock.id, { paddingY: Number(e.target.value) })}
                                            style={{ "--doc-settings-fill": `${((currentBlock.style.paddingY - 4) / 44) * 100}%` } as CSSProperties}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {currentBlock.type === "certification" && (
                            <label className="doc-settings__slider block-settings__slider">
                                <span className="doc-settings__slider-head">
                                    <span>왼쪽 영역 비율</span>
                                    <output>{currentBlock.style.otherExperienceLeftColumnRatio ?? 34}%</output>
                                </span>
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
                                    style={{ "--doc-settings-fill": `${(((currentBlock.style.otherExperienceLeftColumnRatio ?? 34) - 24) / 24) * 100}%` } as CSSProperties}
                                />
                            </label>
                        )}
                    </section>
                )}
            </div>
            <ProfilePhotoCropDialog
                file={pendingProfilePhoto?.file ?? null}
                source={pendingProfilePhoto?.source}
                initialCrop={pendingProfilePhoto?.crop}
                onCancel={() => setPendingProfilePhoto(null)}
                onApply={({ photo, source, crop }) => {
                    const block = blocks.find((item) => item.id === pendingProfilePhoto?.blockId);
                    if (block?.type === "profile") {
                        updateBlockData(block.id, {
                            ...block.data,
                            photo,
                            photoSource: source,
                            photoCrop: crop,
                            showPhoto: true,
                        });
                    }
                    setPendingProfilePhoto(null);
                }}
            />
        </aside>
    );
}
