// 6: Zustand의 persist 기능을 추가해 스토어의 상태가 브라우저 localStorage에 실시간으로 동기화되도록 수정
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

    // Actions
    setSelectedBlockId: (id: string | null) => void;
    addBlock: (type: BlockType) => void;
    removeBlock: (blockId: string) => void;
    updateBlockStyle: (blockId: string, style: Partial<BlockStyle>) => void;
    updateBlockData: (blockId: string, data: any) => void;
    reorderBlocks: (startIndex: number, endIndex: number) => void;
    loadResume: (newResume: ResumeDocument) => void;
}

const initialResume: ResumeDocument = {
    id: "resume-default",
    versionName: "프론트엔드 개발자 기본 이력서",
    updatedAt: new Date().toISOString(),
    globalStyle: {
        fontFamily: "Pretendard Variable",
        primaryColor: "#3b82f6",
        contentWidth: 800,
        basePadding: 32,
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
                    techStack: ["Next.js", "TypeScript", "Tailwind CSS", "Zustand"],
                },
            ],
        },
    ],
};

export const useResumeStore = create<ResumeState>()(
    persist(
        (set) => ({
            resume: initialResume,
            selectedBlockId: "block-profile",

            setSelectedBlockId: (id) => set({ selectedBlockId: id }),

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

                    return {
                        resume: {
                            ...state.resume,
                            blocks: [...state.resume.blocks, defaultBlock],
                            updatedAt: new Date().toISOString(),
                        },
                        selectedBlockId: newBlockId,
                    };
                }),

            removeBlock: (blockId) =>
                set((state) => ({
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
                        resume: {
                            ...state.resume,
                            blocks: updatedBlocks.map((b, idx) => ({ ...b, order: idx })),
                            updatedAt: new Date().toISOString(),
                        },
                    };
                }),

            loadResume: (newResume) =>
                set({
                    resume: newResume,
                    selectedBlockId: null,
                }),
        }),
        {
            name: "bripick-resume-storage", // 로컬 스토리지 키 이름
        }
    )
);