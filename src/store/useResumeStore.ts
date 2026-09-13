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
    selectedBlockId: string | null;

    // Undo / Redo 스택
    past: ResumeDocument[];
    future: ResumeDocument[];

    // Actions
    setSelectedBlockId: (id: string | null) => void;
    addBlock: (type: BlockType) => void;
    removeBlock: (blockId: string) => void;
    updateBlockStyle: (blockId: string, style: Partial<BlockStyle>) => void;
    updateBlockData: (blockId: string, data: any) => void;
    reorderBlocks: (startIndex: number, endIndex: number) => void;
    loadResume: (newResume: ResumeDocument) => void;
    updateGlobalStyle: (style: Partial<ResumeDocument["globalStyle"]>) => void;

    // History Actions
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

const initialResume: ResumeDocument = {
    id: "resume-default",
    versionName: "프론트엔드 개발자 기본 이력서",
    updatedAt: new Date().toISOString(),
    globalStyle: {
        fontFamily: "Pretendard Variable",
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

// 최대 히스토리 보관 개수
const MAX_HISTORY_LIMIT = 25;

export const useResumeStore = create<ResumeState>()(
    persist(
        (set, get) => ({
            resume: initialResume,
            selectedBlockId: "block-profile",
            past: [],
            future: [],

            setSelectedBlockId: (id) => set({ selectedBlockId: id }),

            // 히스토리를 기록하며 상태를 업데이트하는 헬퍼 함수
            addBlock: (type) =>
                set((state) => {
                    const newBlockId = `block-${Date.now()}`;
                    const defaultBlock: ResumeBlock = {
                        id: newBlockId,
                        type,
                        title: type.toUpperCase(),
                        isVisible: true,
                        order: state.resume.blocks.length,
                        style: { paddingY: 16, paddingX: 0, columns: 1, showDivider: true },
                        data:
                            type === "custom_text"
                                ? { content: "" }
                                : type === "skills"
                                    ? { skills: ["TypeScript", "React", "Next.js"] }
                                    : ([] as any),
                    } as ResumeBlock;

                    const newResume = {
                        ...state.resume,
                        blocks: [...state.resume.blocks, defaultBlock],
                        updatedAt: new Date().toISOString(),
                    };

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: newResume,
                        selectedBlockId: newBlockId,
                    };
                }),

            removeBlock: (blockId) =>
                set((state) => ({
                    past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                    future: [],
                    resume: {
                        ...state.resume,
                        blocks: state.resume.blocks.filter((block) => block.id !== blockId),
                        updatedAt: new Date().toISOString(),
                    },
                    selectedBlockId:
                        state.selectedBlockId === blockId ? null : state.selectedBlockId,
                })),

            updateBlockStyle: (blockId, newStyle) =>
                set((state) => ({
                    past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                    future: [],
                    resume: {
                        ...state.resume,
                        blocks: state.resume.blocks.map((block) =>
                            block.id === blockId
                                ? { ...block, style: { ...block.style, ...newStyle } }
                                : block
                        ),
                        updatedAt: new Date().toISOString(),
                    },
                })),

            updateBlockData: (blockId, newData) =>
                set((state) => ({
                    past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                    future: [],
                    resume: {
                        ...state.resume,
                        blocks: state.resume.blocks.map((block) =>
                            block.id === blockId ? { ...block, data: newData } : block
                        ),
                        updatedAt: new Date().toISOString(),
                    },
                })),

            reorderBlocks: (startIndex, endIndex) =>
                set((state) => {
                    const updatedBlocks = Array.from(state.resume.blocks);
                    const [movedBlock] = updatedBlocks.splice(startIndex, 1);
                    updatedBlocks.splice(endIndex, 0, movedBlock);

                    return {
                        past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                        future: [],
                        resume: {
                            ...state.resume,
                            blocks: updatedBlocks.map((b, idx) => ({ ...b, order: idx })),
                            updatedAt: new Date().toISOString(),
                        },
                    };
                }),

            loadResume: (newResume) =>
                set((state) => ({
                    past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                    future: [],
                    resume: newResume,
                    selectedBlockId: null,
                })),

            updateGlobalStyle: (newStyle) =>
                set((state) => ({
                    past: [...state.past.slice(-MAX_HISTORY_LIMIT), state.resume],
                    future: [],
                    resume: {
                        ...state.resume,
                        globalStyle: { ...state.resume.globalStyle, ...newStyle },
                        updatedAt: new Date().toISOString(),
                    },
                })),

            // 실행 취소 (Undo)
            undo: () => {
                const { past, resume, future } = get();
                if (past.length === 0) return;

                const previous = past[past.length - 1];
                const newPast = past.slice(0, past.length - 1);

                set({
                    resume: previous,
                    past: newPast,
                    future: [resume, ...future],
                    selectedBlockId: null,
                });
            },

            // 다시 실행 (Redo)
            redo: () => {
                const { past, resume, future } = get();
                if (future.length === 0) return;

                const next = future[0];
                const newFuture = future.slice(1);

                set({
                    resume: next,
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
            // past와 future는 로컬스토리지 용량을 아끼기 위해 저장 대상에서 제외
            partialize: (state) => ({
                resume: state.resume,
                selectedBlockId: state.selectedBlockId,
            }) as any,
        }
    )
);