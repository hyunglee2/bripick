// src/store/useResumeStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    ResumeDocument,
    ResumeBlock,
    BlockStyle,
    BlockType,
} from "@/types/resume";

interface ResumeState {
    resume: ResumeDocument;
    resumeList: ResumeDocument[]; // 저장된 전체 이력서 목록
    selectedBlockId: string | null;

    // Undo / Redo 스택
    past: ResumeDocument[];
    future: ResumeDocument[];

    // Actions
    setSelectedBlockId: (id: string | null) => void;
    addBlock: (type: BlockType) => void;
    removeBlock: (blockId: string) => void;
    updateBlockTitle: (blockId: string, title: string) => void;
    updateBlockStyle: (blockId: string, style: Partial<BlockStyle>) => void;
    updateBlockData: (blockId: string, data: any) => void;
    reorderBlocks: (startIndex: number, endIndex: number) => void;
    loadResume: (newResume: ResumeDocument) => void;
    updateGlobalStyle: (style: Partial<ResumeDocument["globalStyle"]>) => void;

    // Version Management Actions
    switchResume: (id: string) => void;
    createNewResume: (title?: string) => void;
    duplicateCurrentResume: () => void;
    deleteResume: (id: string) => void;
    updateVersionName: (name: string) => void;

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
        primaryColor: "#2563eb",
        contentWidth: 800,
        basePadding: 36,
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
                name: "홍길동",
                role: "Frontend Engineer",
                email: "dev.gildong@example.com",
                phone: "010-1234-5678",
                location: "Seoul, Korea",
                bio: "사용자 중심의 가치를 코드로 구현하는 모던 웹 엔지니어입니다.",
                blog: "",
                github: "",
                highlights: [
                    "제품의 전 과정을 경험하며 사용자 중심의 기능을 구현합니다.",
                    "사용자 흐름과 비즈니스 목표를 연결해 서비스 아이디어를 실제 기능으로 만듭니다.",
                    "데이터와 피드백을 기반으로 사용자 경험과 서비스 품질을 개선합니다.",
                ],
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
                    id: "exp-1",
                    company: "테크 스타트업",
                    role: "Frontend Developer",
                    startDate: "2024-01",
                    endDate: "현재 재직 중",
                    description: [
                        "모듈형 웹 에디터 인터페이스 설계 및 성능 최적화",
                        "Next.js App Router 기반 렌더링 파이프라인 구축",
                    ],
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

export const useResumeStore = create<ResumeState>()(
    persist(
        (set, get) => ({
            resume: defaultResume,
            resumeList: [defaultResume],
            selectedBlockId: "block-profile",
            past: [],
            future: [],

            setSelectedBlockId: (id) => set({ selectedBlockId: id }),

            addBlock: (type) =>
                set((state) => {
                    const newBlockId = `block-${Date.now()}`;

                    let defaultData: any = [];
                    if (type === "custom_text") {
                        defaultData = { content: "" };
                    } else if (type === "skills") {
                        defaultData = { skills: ["TypeScript", "React", "Next.js"] };
                    } else if (type === "education") {
                        defaultData = [
                            {
                                id: `edu-${Date.now()}`,
                                school: "한국대학교",
                                major: "컴퓨터공학과",
                                startDate: "2019.03",
                                endDate: "2023.02",
                                status: "졸업",
                                score: "3.8 / 4.5",
                            },
                        ];
                    } else if (type === "certification") {
                        defaultData = [
                            {
                                id: `cert-${Date.now()}`,
                                title: "정보처리기사",
                                issuer: "한국산업인력공단",
                                date: "2023.06",
                                description: "",
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
                                : type === "education"
                                    ? "EDUCATION"
                                    : type === "certification"
                                        ? "CERTIFICATIONS & AWARDS"
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
                set((state) => ({
                    past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                    future: [],
                    resume: newResume,
                    resumeList: syncList(state.resumeList, newResume),
                    selectedBlockId: null,
                })),

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

            switchResume: (id) => {
                const target = get().resumeList.find((r) => r.id === id);
                if (target) {
                    set({
                        resume: target,
                        past: [],
                        future: [],
                        selectedBlockId: null,
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
                };

                set((state) => ({
                    resume: duplicated,
                    resumeList: [...state.resumeList, duplicated],
                    past: [],
                    future: [],
                    selectedBlockId: null,
                }));
            },

            deleteResume: (id) => {
                const list = get().resumeList;
                if (list.length <= 1) {
                    alert("최소 1개의 이력서는 유지되어야 합니다.");
                    return;
                }

                const filtered = list.filter((r) => r.id !== id);
                const fallback = filtered[0];

                set({
                    resume: fallback,
                    resumeList: filtered,
                    past: [],
                    future: [],
                    selectedBlockId: null,
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
                });
            },

            canUndo: () => get().past.length > 0,
            canRedo: () => get().future.length > 0,
        }),
        {
            name: "bripick-resume-storage",
            partialize: (state) =>
            ({
                resume: state.resume,
                resumeList: state.resumeList,
                selectedBlockId: state.selectedBlockId,
            } as any),
        }
    )
);
