// 선택된 블록의 여백, 구분선, 기본 데이터를 실시간으로 제어하는 설정창
// src/components/editor/InspectorPanel.tsx
"use client";

import { useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { Trash2, ChevronUp, ChevronDown, Plus, X } from "lucide-react";

export default function InspectorPanel() {
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const blocks = useResumeStore((state) => state.resume.blocks);
    const updateBlockStyle = useResumeStore((state) => state.updateBlockStyle);
    const updateBlockData = useResumeStore((state) => state.updateBlockData);
    const removeBlock = useResumeStore((state) => state.removeBlock);
    const reorderBlocks = useResumeStore((state) => state.reorderBlocks);

    const [newSkillInput, setNewSkillInput] = useState("");

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
        if (currentIndex > 0) reorderBlocks(currentIndex, currentIndex - 1);
    };

    const handleMoveDown = () => {
        if (currentIndex < blocks.length - 1) reorderBlocks(currentIndex, currentIndex + 1);
    };

    // --- 경력(Experience) 편집 핸들러 ---
    const handleAddExperienceItem = () => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const newItem = {
            id: `exp-${Date.now()}`,
            company: "새로운 회사",
            role: "직무를 입력하세요",
            startDate: "2024.01",
            endDate: "재직 중",
            description: ["담당 업무 및 주요 성과를 입력하세요."],
            techStack: [],
        };
        updateBlockData(currentBlock.id, [...prevData, newItem]);
    };

    const handleUpdateExpField = (expId: string, field: string, value: any) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        const updated = prevData.map((item: any) =>
            item.id === expId ? { ...item, [field]: value } : item
        );
        updateBlockData(currentBlock.id, updated);
    };

    const handleRemoveExpItem = (expId: string) => {
        const prevData = Array.isArray(currentBlock.data) ? currentBlock.data : [];
        updateBlockData(
            currentBlock.id,
            prevData.filter((item: any) => item.id !== expId)
        );
    };

    // --- 스킬(Skills) 편집 핸들러 ---
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

                {/* 2. 데이터 편집 섹션 */}

                {/* [프로필 폼] */}
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
                            <label className="text-xs text-neutral-400 block mb-1">이메일</label>
                            <input
                                type="text"
                                value={currentBlock.data.email || ""}
                                onChange={(e) =>
                                    updateBlockData(currentBlock.id, {
                                        ...currentBlock.data,
                                        email: e.target.value,
                                    })
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
                                    updateBlockData(currentBlock.id, {
                                        ...currentBlock.data,
                                        phone: e.target.value,
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

                {/* [경력(Experience) 폼] */}
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
                            currentBlock.data.map((exp: any, index: number) => (
                                <div
                                    key={exp.id || index}
                                    className="bg-neutral-900/80 border border-neutral-800 rounded p-3 space-y-2 relative"
                                >
                                    <button
                                        onClick={() => handleRemoveExpItem(exp.id)}
                                        className="absolute top-2.5 right-2.5 text-neutral-500 hover:text-red-400 transition"
                                        title="이 경력 삭제"
                                    >
                                        <Trash2 size={13} />
                                    </button>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">회사명</label>
                                        <input
                                            type="text"
                                            value={exp.company || ""}
                                            onChange={(e) =>
                                                handleUpdateExpField(exp.id, "company", e.target.value)
                                            }
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">직무 / 직책</label>
                                        <input
                                            type="text"
                                            value={exp.role || ""}
                                            onChange={(e) =>
                                                handleUpdateExpField(exp.id, "role", e.target.value)
                                            }
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">시작일</label>
                                            <input
                                                type="text"
                                                placeholder="YYYY.MM"
                                                value={exp.startDate || ""}
                                                onChange={(e) =>
                                                    handleUpdateExpField(exp.id, "startDate", e.target.value)
                                                }
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-neutral-400 block">종료일</label>
                                            <input
                                                type="text"
                                                placeholder="재직 중"
                                                value={exp.endDate || ""}
                                                onChange={(e) =>
                                                    handleUpdateExpField(exp.id, "endDate", e.target.value)
                                                }
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-neutral-400 block">
                                            주요 성과 (줄바꿈으로 구분)
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={Array.isArray(exp.description) ? exp.description.join("\n") : ""}
                                            onChange={(e) =>
                                                handleUpdateExpField(
                                                    exp.id,
                                                    "description",
                                                    e.target.value.split("\n")
                                                )
                                            }
                                            placeholder="한 줄에 하나의 성과를 입력하세요"
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 resize-none"
                                        />
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* [스킬(Skills) 폼] */}
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

                {/* [자유 텍스트 폼] */}
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
                                placeholder="내용을 입력하세요."
                            />
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}