// 선택된 블록의 여백, 구분선, 기본 데이터를 실시간으로 제어하는 설정창
"use client";

import { useResumeStore } from "@/store/useResumeStore";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";

export default function InspectorPanel() {
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const blocks = useResumeStore((state) => state.resume.blocks);
    const updateBlockStyle = useResumeStore((state) => state.updateBlockStyle);
    const updateBlockData = useResumeStore((state) => state.updateBlockData);
    const removeBlock = useResumeStore((state) => state.removeBlock);
    const reorderBlocks = useResumeStore((state) => state.reorderBlocks);

    const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);
    const currentBlock = blocks[currentIndex];

    if (!currentBlock) {
        return (
            <aside className="w-80 border-l border-neutral-800 bg-[#12131a] p-6 text-neutral-500 text-xs flex items-center justify-center">
                편집할 블록을 캔버스에서 선택하세요.
            </aside>
        );
    }

    // 순서 이동 핸들러
    const handleMoveUp = () => {
        if (currentIndex > 0) {
            reorderBlocks(currentIndex, currentIndex - 1);
        }
    };

    const handleMoveDown = () => {
        if (currentIndex < blocks.length - 1) {
            reorderBlocks(currentIndex, currentIndex + 1);
        }
    };

    return (
        <aside className="w-80 border-l border-neutral-800 bg-[#12131a] p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
                {/* 블록 타이틀 및 툴바 */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        {currentBlock.type} 설정
                    </span>
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
                        <span className="text-xs text-neutral-300">구분선 표시</span>
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

                {/* 2. 데이터 편집 섹션 */}
                {/* 프로필 폼 */}
                {currentBlock.type === "profile" && (
                    <div className="space-y-3 border-t border-neutral-800 pt-4">
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">이름</label>
                            <input
                                type="text"
                                value={currentBlock.data.name || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, {
                                        ...currentBlock.data,
                                        name: e.target.value,
                                    })
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
                                    updateBlockData(currentBlock.id, {
                                        ...currentBlock.data,
                                        role: e.target.value,
                                    })
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
                                    updateBlockData(currentBlock.id, {
                                        ...currentBlock.data,
                                        bio: e.target.value,
                                    })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* 자유 텍스트 폼 */}
                {currentBlock.type === "custom_text" && (
                    <div className="space-y-3 border-t border-neutral-800 pt-4">
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">섹션 제목</label>
                            <input
                                type="text"
                                value={currentBlock.title}
                                onChange={(e) =>
                                    updateBlockStyle(currentBlock.id, { ...currentBlock.style })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400 block mb-1">내용</label>
                            <textarea
                                rows={6}
                                value={currentBlock.data?.content || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, { content: e.target.value })
                                }
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none"
                                placeholder="마크다운 또는 일반 텍스트를 입력하세요."
                            />
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}