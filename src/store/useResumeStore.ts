// src/store/useResumeStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    ResumeDocument,
    ResumeBlock,
    BlockStyle,
    BlockType,
} from "@/types/resume";
import { createSampleResume } from "@/lib/sampleResume";

interface ResumeState {
    resume: ResumeDocument;
    resumeList: ResumeDocument[]; // 저장된 전체 이력서 목록
    selectedBlockId: string | null;
    selectedBlockItemId: string | null;
    selectedBlockSubItemId: string | null;

    // Undo / Redo 스택
    past: ResumeDocument[];
    future: ResumeDocument[];

    // Actions
    setSelectedBlockId: (id: string | null) => void;
    setSelectedBlockSelection: (blockId: string | null, itemId?: string | null, subItemId?: string | null) => void;
    setSelectedBlockItemId: (id: string | null) => void;
    setSelectedBlockSubItemId: (
        value: string | null | ((current: string | null) => string | null)
    ) => void;
    addBlock: (type: BlockType) => void;
    removeBlock: (blockId: string) => void;
    updateBlockTitle: (blockId: string, title: string) => void;
    updateBlockStyle: (blockId: string, style: Partial<BlockStyle>) => void;
    updateBlockData: (blockId: string, data: any) => void;
    reorderBlocks: (startIndex: number, endIndex: number) => void;
    loadResume: (newResume: ResumeDocument) => void;
    replaceWorkspace: (resumes: ResumeDocument[], activeResumeId?: string | null) => void;
    updateGlobalStyle: (style: Partial<ResumeDocument["globalStyle"]>) => void;

    // Version Management Actions
    switchResume: (id: string) => void;
    createNewResume: (title?: string) => void;
    duplicateCurrentResume: () => void;
    duplicateResume: (id: string) => void;
    deleteResume: (id: string) => void;
    updateVersionName: (name: string) => void;
    updatePublication: (publication?: ResumeDocument["publication"]) => void;

    // History Actions
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;

    toggleBlockVisibility: (blockId: string) => void;

}

const defaultResume: ResumeDocument = {
    id: "resume-default",
    versionName: "기본 이력서",
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
            id: "block-profile",
            type: "profile",
            title: "기본 정보",
            isVisible: true,
            order: 0,
            style: { paddingY: 16, paddingX: 0, columns: 1, showDivider: true },
            data: {
                name: "",
                role: "",
                email: "",
                phone: "",
                bio: "",
                photo: "/profile_default.png",
                showPhoto: true,
                blog: "",
                github: "",
                contacts: [],
                highlights: [""],
                introductionStyle: "bullets",
            },
        },
        {
            id: "block-experience",
            type: "experience",
            title: "Work Experience",
            isVisible: true,
            order: 1,
            style: { paddingY: 20, paddingX: 0, columns: 1, showDivider: true },
            data: [
                {
                    id: "exp-empty",
                    company: "",
                    role: "",
                    startDate: "",
                    endDate: "",
                    description: [""],
                    projects: [],
                },
            ],
        },
    ],
};

const MAX_HISTORY_LIMIT = 25;

// 동기화 헬퍼: 현재 편집 중인 이력서를 resumeList 배열 내에도 함께 갱신
const syncList = (list: ResumeDocument[], updated: ResumeDocument) => {
    const index = list.findIndex((item) => item.id === updated.id);
    if (index === -1) {
        return [...list, updated];
    }
    const nextList = [...list];
    nextList[index] = updated;
    return nextList;
};

const initialSampleResume = createSampleResume();

const migrateTypographyDefaults = (document: ResumeDocument): ResumeDocument => ({
    ...document,
    globalStyle: {
        ...document.globalStyle,
        sectionTitleFontSize: document.globalStyle.sectionTitleFontSize === 25
            ? 24
            : document.globalStyle.sectionTitleFontSize,
        bodyFontSize: Math.max(14, document.globalStyle.bodyFontSize ?? 14),
        captionFontSize: Math.max(14, document.globalStyle.captionFontSize ?? 14),
        itemTitleFontSize: document.globalStyle.itemTitleFontSize === 15
            ? 19
            : document.globalStyle.itemTitleFontSize,
    },
});

const migrateOtherExperience = (document: ResumeDocument): ResumeDocument => ({
    ...document,
    blocks: document.blocks.map((block) => {
        if (block.type !== "certification") return block;
        return {
            ...block,
            title: block.title === "CERTIFICATIONS & AWARDS" ? "Other Experience" : block.title,
            data: Array.isArray(block.data)
                ? block.data.map((item: any) => {
                    const description = Array.isArray(item.description)
                        ? item.description
                        : item.description
                            ? [item.description]
                            : item.issuer
                                ? [item.issuer]
                                : [];
                    const descriptionHtml = Array.isArray(item.descriptionHtml)
                        ? item.descriptionHtml
                        : undefined;
                    const legacyInlineLink = descriptionHtml
                        ?.map((value: string) => value.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1])
                        .find(Boolean);
                    const legacyDateParts = String(item.date || "").split(/\s*~\s*/);
                    return {
                        ...item,
                        link: item.link || legacyInlineLink || "",
                        startDate: item.startDate ?? legacyDateParts[0] ?? "",
                        endDate: item.endDate ?? legacyDateParts[1] ?? "",
                        description,
                        descriptionLevels: Array.isArray(item.descriptionLevels)
                            ? item.descriptionLevels
                            : description.map(() => 1),
                        descriptionHtml: descriptionHtml?.map((value: string) => (
                            value.replace(/<a\b[^>]*>/gi, "").replace(/<\/a>/gi, "")
                        )),
                    };
                })
                : block.data,
        };
    }),
});

const migrateResumeDocument = (document: ResumeDocument) => (
    migrateOtherExperience(migrateTypographyDefaults(document))
);

export const useResumeStore = create<ResumeState>()(
    persist(
        (set, get) => ({
            resume: initialSampleResume,
            resumeList: [initialSampleResume],
            selectedBlockId: "block-p-1",
            selectedBlockItemId: null,
            selectedBlockSubItemId: null,
            past: [],
            future: [],

            setSelectedBlockId: (id) => set({
                selectedBlockId: id,
                selectedBlockItemId: null,
                selectedBlockSubItemId: null,
            }),
            setSelectedBlockSelection: (blockId, itemId = null, subItemId = null) => set({
                selectedBlockId: blockId,
                selectedBlockItemId: itemId,
                selectedBlockSubItemId: subItemId,
            }),
            setSelectedBlockItemId: (id) => set({
                selectedBlockItemId: id,
                selectedBlockSubItemId: null,
            }),
            setSelectedBlockSubItemId: (value) => set((state) => ({
                selectedBlockSubItemId: typeof value === "function"
                    ? value(state.selectedBlockSubItemId)
                    : value,
            })),

            addBlock: (type) =>
                set((state) => {
                    const newBlockId = `block-${Date.now()}`;

                    let defaultData: any = [];
                    if (type === "profile") {
                        defaultData = {
                            name: "",
                            role: "",
                            email: "",
                            phone: "",
                            bio: "",
                            photo: "/profile_default.png",
                            showPhoto: true,
                            blog: "",
                            github: "",
                            contacts: [],
                            highlights: [""],
                            introductionStyle: "bullets",
                        };
                    } else if (type === "custom_text") {
                        defaultData = { content: "", contentStyle: "bullets" };
                    } else if (type === "experience") {
                        defaultData = [
                            {
                                id: `exp-${Date.now()}`,
                                company: "",
                                role: "",
                                startDate: "",
                                endDate: "",
                                description: [""],
                                projects: [],
                            },
                        ];
                    } else if (type === "project") {
                        defaultData = [
                            {
                                id: `proj-${Date.now()}`,
                                title: "",
                                role: "",
                                startDate: "",
                                endDate: "",
                                link: "",
                                description: [""],
                                descriptionLevels: [1],
                                descriptionHtml: [""],
                            },
                        ];
                    } else if (type === "skills") {
                        defaultData = {
                            categories: [
                                {
                                    id: `skill-category-${Date.now()}`,
                                    name: "",
                                    skills: [],
                                },
                            ],
                        };
                    } else if (type === "education") {
                        defaultData = [
                            {
                                id: `edu-${Date.now()}`,
                                school: "",
                                major: "",
                                startDate: "",
                                endDate: "",
                                status: "",
                                score: "",
                            },
                        ];
                    } else if (type === "certification") {
                        defaultData = [
                            {
                                id: `cert-${Date.now()}`,
                                title: "",
                                startDate: "",
                                endDate: "",
                                link: "",
                                description: [""],
                                descriptionLevels: [1],
                                descriptionHtml: [""],
                            },
                        ];
                    } else if (type === "page_break") {
                        // [추가된 부분 1] 페이지 나눔 블록 데이터
                        defaultData = {};
                    }

                    const defaultBlock: ResumeBlock = {
                        id: newBlockId,
                        type,
                        // [추가된 부분 2] 타이틀 분기
                        title:
                            type === "page_break"
                                ? "PAGE BREAK"
                                : type === "profile"
                                    ? "기본 정보"
                                : type === "education"
                                    ? "EDUCATION"
                                    : type === "certification"
                                        ? "Other Experience"
                                        : type.toUpperCase(),
                        isVisible: true,
                        order: state.resume.blocks.length,
                        style: {
                            paddingY: type === "page_break" ? 8 : 16,
                            paddingX: 0,
                            columns: 1,
                            showDivider: type !== "page_break",
                        },
                        data: defaultData,
                    };

                    const newResume = {
                        ...state.resume,
                        blocks: [...state.resume.blocks, defaultBlock],
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                        selectedBlockId: newBlockId,
                        selectedBlockItemId: null,
                        selectedBlockSubItemId: null,
                    };
                }),
            removeBlock: (blockId) =>
                set((state) => {
                    const newResume = {
                        ...state.resume,
                        blocks: state.resume.blocks.filter((block) => block.id !== blockId),
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                        selectedBlockId:
                            state.selectedBlockId === blockId ? null : state.selectedBlockId,
                        selectedBlockItemId:
                            state.selectedBlockId === blockId ? null : state.selectedBlockItemId,
                        selectedBlockSubItemId:
                            state.selectedBlockId === blockId ? null : state.selectedBlockSubItemId,
                    };
                }),

            // 블록 보이기 / 숨기기 토글 액션
            toggleBlockVisibility: (blockId) =>
                set((state) => {
                    const newResume = {
                        ...state.resume,
                        blocks: state.resume.blocks.map((block) =>
                            block.id === blockId
                                ? { ...block, isVisible: !block.isVisible }
                                : block
                        ),
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                    };
                }),

            updateBlockTitle: (blockId, title) =>
                set((state) => {
                    const newResume = {
                        ...state.resume,
                        blocks: state.resume.blocks.map((block) =>
                            block.id === blockId ? { ...block, title } : block
                        ),
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                    };
                }),

            updateBlockStyle: (blockId, newStyle) =>
                set((state) => {
                    const newResume = {
                        ...state.resume,
                        blocks: state.resume.blocks.map((block) =>
                            block.id === blockId
                                ? { ...block, style: { ...block.style, ...newStyle } }
                                : block
                        ),
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                    };
                }),

            updateBlockData: (blockId, newData) =>
                set((state) => {
                    const newResume = {
                        ...state.resume,
                        blocks: state.resume.blocks.map((block) =>
                            block.id === blockId ? { ...block, data: newData } : block
                        ),
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                    };
                }),

            reorderBlocks: (startIndex, endIndex) =>
                set((state) => {
                    const updatedBlocks = Array.from(state.resume.blocks);
                    const [movedBlock] = updatedBlocks.splice(startIndex, 1);
                    updatedBlocks.splice(endIndex, 0, movedBlock);

                    const newResume = {
                        ...state.resume,
                        blocks: updatedBlocks.map((b, idx) => ({ ...b, order: idx })),
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                    };
                }),

            loadResume: (newResume) =>
                set((state) => {
                    const migratedResume = migrateResumeDocument(newResume);
                    return ({
                    past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                    future: [],
                    resume: migratedResume,
                    resumeList: syncList(state.resumeList, migratedResume),
                    selectedBlockId: null,
                    selectedBlockItemId: null,
                    selectedBlockSubItemId: null,
                    });
                }),

            updateGlobalStyle: (newStyle) =>
                set((state) => {
                    const newResume = {
                        ...state.resume,
                        globalStyle: { ...state.resume.globalStyle, ...newStyle },
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                    };
                }),

            // --- 버전 관리 액션 ---
            updateVersionName: (name) =>
                set((state) => {
                    const newResume = { ...state.resume, versionName: name };
                    return {
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                    };
                }),

            updatePublication: (publication) =>
                set((state) => {
                    const newResume = { ...state.resume, publication };
                    return {
                        resume: newResume,
                        resumeList: syncList(state.resumeList, newResume),
                    };
                }),

            replaceWorkspace: (resumes, activeResumeId = null) => {
                const migrated = resumes.length
                    ? resumes.map(migrateResumeDocument)
                    : [createSampleResume()];
                const active = migrated.find((item) => item.id === activeResumeId) ?? migrated[0];
                set({
                    resume: active,
                    resumeList: migrated,
                    past: [],
                    future: [],
                    selectedBlockId: null,
                    selectedBlockItemId: null,
                    selectedBlockSubItemId: null,
                });
            },

            switchResume: (id) => {
                const target = get().resumeList.find((r) => r.id === id);
                if (target) {
                    set({
                        resume: target,
                        past: [],
                        future: [],
                        selectedBlockId: null,
                        selectedBlockItemId: null,
                        selectedBlockSubItemId: null,
                    });
                }
            },

            createNewResume: (title = "새 이력서") => {
                const newId = `resume-${Date.now()}`;
                const freshResume: ResumeDocument = {
                    ...defaultResume,
                    id: newId,
                    versionName: title,
                    updatedAt: new Date().toISOString(),
                };

                set((state) => ({
                    resume: freshResume,
                    resumeList: [...state.resumeList, freshResume],
                    past: [],
                    future: [],
                    selectedBlockId: null,
                    selectedBlockItemId: null,
                    selectedBlockSubItemId: null,
                }));
            },

            duplicateCurrentResume: () => {
                const current = get().resume;
                const newId = `resume-${Date.now()}`;
                const duplicated: ResumeDocument = {
                    ...JSON.parse(JSON.stringify(current)),
                    id: newId,
                    versionName: `${current.versionName} (사본)`,
                    updatedAt: new Date().toISOString(),
                    publication: undefined,
                };

                set((state) => ({
                    resume: duplicated,
                    resumeList: [...state.resumeList, duplicated],
                    past: [],
                    future: [],
                    selectedBlockId: null,
                    selectedBlockItemId: null,
                    selectedBlockSubItemId: null,
                }));
            },

            duplicateResume: (id) => {
                const source = get().resumeList.find((item) => item.id === id);
                if (!source) return;
                const duplicated: ResumeDocument = {
                    ...JSON.parse(JSON.stringify(source)),
                    id: `resume-${Date.now()}`,
                    versionName: `${source.versionName} (사본)`,
                    updatedAt: new Date().toISOString(),
                    publication: undefined,
                };

                set((state) => ({
                    resumeList: [...state.resumeList, duplicated],
                }));
            },

            deleteResume: (id) => {
                set((state) => {
                    if (state.resumeList.length <= 1) return state;
                    const filtered = state.resumeList.filter((item) => item.id !== id);
                    const deletingCurrentResume = state.resume.id === id;
                    return {
                        resume: deletingCurrentResume ? filtered[0] : state.resume,
                        resumeList: filtered,
                        past: deletingCurrentResume ? [] : state.past,
                        future: deletingCurrentResume ? [] : state.future,
                        selectedBlockId: deletingCurrentResume ? null : state.selectedBlockId,
                        selectedBlockItemId: deletingCurrentResume ? null : state.selectedBlockItemId,
                        selectedBlockSubItemId: deletingCurrentResume ? null : state.selectedBlockSubItemId,
                    };
                });
            },

            // Undo / Redo
            undo: () => {
                const { past, resume, future, resumeList } = get();
                if (past.length === 0) return;

                const previous = past[past.length - 1];
                const newPast = past.slice(0, past.length - 1);

                set({
                    resume: previous,
                    resumeList: syncList(resumeList, previous),
                    past: newPast,
                    future: [resume, ...future],
                    selectedBlockId: null,
                    selectedBlockItemId: null,
                    selectedBlockSubItemId: null,
                });
            },

            redo: () => {
                const { past, resume, future, resumeList } = get();
                if (future.length === 0) return;

                const next = future[0];
                const newFuture = future.slice(1);

                set({
                    resume: next,
                    resumeList: syncList(resumeList, next),
                    past: [...past, resume],
                    future: newFuture,
                    selectedBlockId: null,
                    selectedBlockItemId: null,
                    selectedBlockSubItemId: null,
                });
            },

            canUndo: () => get().past.length > 0,
            canRedo: () => get().future.length > 0,
        }),
        {
            name: "bripick-resume-storage:guest",
            version: 7,
            migrate: (persistedState) => {
                const state = persistedState as Partial<ResumeState>;
                return {
                    ...state,
                    resume: state.resume ? migrateResumeDocument(state.resume) : initialSampleResume,
                    resumeList: state.resumeList?.length
                        ? state.resumeList.map(migrateResumeDocument)
                        : [initialSampleResume],
                } as ResumeState;
            },
            partialize: (state) =>
            ({
                resume: state.resume,
                resumeList: state.resumeList,
                selectedBlockId: state.selectedBlockId,
                selectedBlockItemId: state.selectedBlockItemId,
                selectedBlockSubItemId: state.selectedBlockSubItemId,
            } as any),
        }
    )
);
