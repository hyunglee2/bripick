// src/components/editor/ResumeCanvas.tsx
"use client";

import { useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import EditableText from "@/components/editor/EditableText";
import { GripVertical, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export default function ResumeCanvas() {
    const blocks = useResumeStore((state) => state.resume.blocks);
    const globalStyle = useResumeStore((state) => state.resume.globalStyle);
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const setSelectedBlockId = useResumeStore((state) => state.setSelectedBlockId);
    const updateBlockData = useResumeStore((state) => state.updateBlockData);
    const reorderBlocks = useResumeStore((state) => state.reorderBlocks);

    // 드래그 앤 드롭 인덱스 상태
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // 캔버스 실시간 줌 배율 (기본 100%)
    const [zoomLevel, setZoomLevel] = useState<number>(100);

    const templateType = globalStyle?.template || "modern";
    const primaryColor = globalStyle?.primaryColor || "#2563eb";
    const fontFamily = globalStyle?.fontFamily || "'Pretendard', sans-serif";
    const A4_HEIGHT_PX = 1130;

    // --- 줌 컨트롤러 핸들러 ---
    const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 150));
    const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 50));
    const handleZoomReset = () => setZoomLevel(100);

    // --- HTML5 드래그 앤 드롭 핸들러 ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverIndex !== index) setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== targetIndex) {
            reorderBlocks(draggedIndex, targetIndex);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <main
            onClick={() => setSelectedBlockId(null)}
            className="flex-1 bg-[#0c0d12] overflow-y-auto p-8 flex justify-center cursor-default relative"
        >
            {/* 캔버스 줌 스케일 컨테이너 */}
            <div
                style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top center",
                    transition: "transform 0.15s ease-out",
                }}
                className="w-full flex justify-center pb-24"
            >
                {/* A4 백지 캔버스 */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        maxWidth: `${globalStyle?.contentWidth || 800}px`,
                        padding: `${globalStyle?.basePadding || 36}px`,
                        fontFamily: fontFamily,
                    }}
                    className="resume-paper relative w-full min-h-[1130px] bg-white text-neutral-900 shadow-2xl rounded-sm flex flex-col transition-all"
                >
                    {/* A4 1페이지 경계선 (인쇄 시 제외) */}
                    <div
                        style={{ top: `${A4_HEIGHT_PX}px` }}
                        className="no-print absolute left-0 right-0 border-b-2 border-dashed border-red-300 pointer-events-none flex justify-end pr-2 -mt-[1px]"
                    >
                        <span className="text-[10px] text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded -translate-y-1/2 select-none font-sans">
                            A4 1페이지 경계선
                        </span>
                    </div>

                    {blocks.map((block, index) => {
                        const isSelected = selectedBlockId === block.id;
                        const isBeingDragged = draggedIndex === index;
                        const isTargeted = dragOverIndex === index && draggedIndex !== index;

                        return (
                            <div
                                key={block.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                                onClick={() => setSelectedBlockId(block.id)}
                                style={{
                                    paddingTop: `${block.style.paddingY}px`,
                                    paddingBottom: `${block.style.paddingY}px`,
                                }}
                                className={`relative cursor-pointer transition-all ${templateType === "modern"
                                    ? "bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-6 py-5 mb-4 shadow-xs hover:border-neutral-300 hover:shadow-sm"
                                    : "px-4 mb-2 hover:bg-neutral-50/50 rounded"
                                    } ${isSelected ? "!ring-2 !ring-blue-500 !border-blue-500 bg-blue-50/20" : ""
                                    } ${isBeingDragged ? "opacity-30 scale-[0.98] border-dashed border-neutral-400" : ""
                                    } ${isTargeted ? "border-t-4 border-t-blue-500 -mt-1" : ""
                                    } group`}
                            >
                                {/* 드래그 핸들 */}
                                <div
                                    className="no-print absolute -left-7 top-1/2 -translate-y-1/2 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-neutral-700 cursor-grab active:cursor-grabbing p-1 transition"
                                    title="끌어서 순서 변경"
                                >
                                    <GripVertical size={16} />
                                </div>

                                {/* 1. 프로필 블록 */}
                                {block.type === "profile" && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-baseline gap-4">
                                            <EditableText
                                                tag="h1"
                                                value={block.data.name || ""}
                                                placeholder="이름을 입력하세요"
                                                onChange={(newName) =>
                                                    updateBlockData(block.id, { ...block.data, name: newName })
                                                }
                                                className="text-3xl font-black tracking-tight text-neutral-900"
                                            />
                                            <EditableText
                                                tag="span"
                                                value={block.data.role || ""}
                                                placeholder="직무"
                                                onChange={(newRole) =>
                                                    updateBlockData(block.id, { ...block.data, role: newRole })
                                                }
                                                style={{ color: primaryColor }}
                                                className="text-sm font-bold tracking-tight text-right whitespace-nowrap"
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-medium">
                                            <EditableText
                                                value={block.data.email || ""}
                                                placeholder="이메일"
                                                onChange={(newEmail) =>
                                                    updateBlockData(block.id, { ...block.data, email: newEmail })
                                                }
                                            />
                                            <span>|</span>
                                            <EditableText
                                                value={block.data.phone || ""}
                                                placeholder="연락처"
                                                onChange={(newPhone) =>
                                                    updateBlockData(block.id, { ...block.data, phone: newPhone })
                                                }
                                            />
                                            <span>|</span>
                                            <EditableText
                                                value={block.data.location || ""}
                                                placeholder="거주 지역"
                                                onChange={(newLoc) =>
                                                    updateBlockData(block.id, { ...block.data, location: newLoc })
                                                }
                                            />
                                        </div>

                                        <div className="pt-2 border-t border-neutral-200/50 mt-2">
                                            <EditableText
                                                tag="p"
                                                multiline
                                                value={block.data.bio || ""}
                                                placeholder="자신을 소개하는 간단한 한 줄 소개를 적어보세요."
                                                onChange={(newBio) =>
                                                    updateBlockData(block.id, { ...block.data, bio: newBio })
                                                }
                                                className="text-sm text-neutral-700 leading-relaxed block"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 2. 경력 블록 */}
                                {block.type === "experience" && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                                            {templateType === "modern" && (
                                                <span
                                                    style={{ backgroundColor: primaryColor }}
                                                    className="w-1.5 h-4 rounded-full inline-block"
                                                />
                                            )}
                                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                                {block.title}
                                            </h2>
                                        </div>

                                        {Array.isArray(block.data) && block.data.length > 0 ? (
                                            <div className="space-y-3 pt-1">
                                                {block.data.map((exp: any, expIndex: number) => (
                                                    <div key={exp.id} className="space-y-1">
                                                        <div className="flex justify-between items-baseline gap-2">
                                                            <EditableText
                                                                tag="span"
                                                                value={exp.company}
                                                                placeholder="회사명"
                                                                onChange={(newCompany) => {
                                                                    const updated = [...block.data];
                                                                    updated[expIndex] = { ...exp, company: newCompany };
                                                                    updateBlockData(block.id, updated);
                                                                }}
                                                                className="font-bold text-neutral-900 text-sm"
                                                            />
                                                            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                                                                <EditableText
                                                                    value={exp.startDate}
                                                                    placeholder="시작일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[expIndex] = { ...exp, startDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                                <span>~</span>
                                                                <EditableText
                                                                    value={exp.endDate}
                                                                    placeholder="종료일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[expIndex] = { ...exp, endDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <EditableText
                                                            tag="div"
                                                            value={exp.role}
                                                            placeholder="직책 및 역할"
                                                            style={{ color: primaryColor }}
                                                            onChange={(newRole) => {
                                                                const updated = [...block.data];
                                                                updated[expIndex] = { ...exp, role: newRole };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                            className="text-xs font-semibold"
                                                        />

                                                        <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 pt-1">
                                                            {exp.description?.map((desc: string, i: number) => (
                                                                <li key={i} className="list-item">
                                                                    <EditableText
                                                                        value={desc}
                                                                        placeholder="담당 업무 및 성과 상세 내용"
                                                                        onChange={(newDesc) => {
                                                                            const updated = [...block.data];
                                                                            const newDescriptions = [...exp.description];
                                                                            newDescriptions[i] = newDesc;
                                                                            updated[expIndex] = { ...exp, description: newDescriptions };
                                                                            updateBlockData(block.id, updated);
                                                                        }}
                                                                        className="inline"
                                                                    />
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-neutral-400 italic">경력 항목을 추가해 주세요.</p>
                                        )}
                                    </div>
                                )}

                                {/* 3. 프로젝트 블록 */}
                                {block.type === "project" && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                                            {templateType === "modern" && (
                                                <span
                                                    style={{ backgroundColor: primaryColor }}
                                                    className="w-1.5 h-4 rounded-full inline-block"
                                                />
                                            )}
                                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                                {block.title || "PROJECTS"}
                                            </h2>
                                        </div>

                                        {Array.isArray(block.data) && block.data.length > 0 ? (
                                            <div className="space-y-3 pt-1">
                                                {block.data.map((proj: any, projIndex: number) => (
                                                    <div key={proj.id} className="space-y-1">
                                                        <div className="flex justify-between items-baseline gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <EditableText
                                                                    tag="span"
                                                                    value={proj.title}
                                                                    placeholder="프로젝트명"
                                                                    onChange={(newTitle) => {
                                                                        const updated = [...block.data];
                                                                        updated[projIndex] = { ...proj, title: newTitle };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                    className="font-bold text-neutral-900 text-sm"
                                                                />
                                                                {proj.link && (
                                                                    <a
                                                                        href={proj.link}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        style={{ color: primaryColor }}
                                                                        className="text-xs hover:underline"
                                                                    >
                                                                        링크 ↗
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                                                                <EditableText
                                                                    value={proj.startDate}
                                                                    placeholder="시작일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[projIndex] = { ...proj, startDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                                <span>~</span>
                                                                <EditableText
                                                                    value={proj.endDate}
                                                                    placeholder="종료일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[projIndex] = { ...proj, endDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <EditableText
                                                            tag="div"
                                                            value={proj.role}
                                                            placeholder="프로젝트 역할"
                                                            onChange={(newRole) => {
                                                                const updated = [...block.data];
                                                                updated[projIndex] = { ...proj, role: newRole };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                            className="text-xs font-semibold text-neutral-600"
                                                        />

                                                        <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 pt-1">
                                                            {proj.description?.map((desc: string, i: number) => (
                                                                <li key={i} className="list-item">
                                                                    <EditableText
                                                                        value={desc}
                                                                        placeholder="성과 및 주요 내용"
                                                                        onChange={(newDesc) => {
                                                                            const updated = [...block.data];
                                                                            const newDescriptions = [...proj.description];
                                                                            newDescriptions[i] = newDesc;
                                                                            updated[projIndex] = { ...proj, description: newDescriptions };
                                                                            updateBlockData(block.id, updated);
                                                                        }}
                                                                        className="inline"
                                                                    />
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-neutral-400 italic">
                                                우측 인스펙터에서 프로젝트를 추가해 주세요.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* 4. 스킬 블록 */}
                                {block.type === "skills" && (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                                            {templateType === "modern" && (
                                                <span
                                                    style={{ backgroundColor: primaryColor }}
                                                    className="w-1.5 h-4 rounded-full inline-block"
                                                />
                                            )}
                                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                                {block.title || "SKILLS"}
                                            </h2>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {((block.data as any)?.skills || []).length > 0 ? (
                                                ((block.data as any).skills as string[]).map((skill: string) => (
                                                    <span
                                                        key={skill}
                                                        style={
                                                            templateType === "modern"
                                                                ? {
                                                                    borderColor: `${primaryColor}30`,
                                                                    backgroundColor: `${primaryColor}10`,
                                                                    color: primaryColor,
                                                                }
                                                                : {}
                                                        }
                                                        className={`px-2 py-0.5 rounded text-xs font-medium ${templateType === "modern"
                                                            ? "border"
                                                            : "bg-neutral-100 text-neutral-800 border border-neutral-200"
                                                            }`}
                                                    >
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-neutral-400 italic">
                                                    우측 인스펙터에서 스킬을 추가하세요.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 5. 학력 (Education) 블록 */}
                                {block.type === "education" && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                                            {templateType === "modern" && (
                                                <span
                                                    style={{ backgroundColor: primaryColor }}
                                                    className="w-1.5 h-4 rounded-full inline-block"
                                                />
                                            )}
                                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                                {block.title || "EDUCATION"}
                                            </h2>
                                        </div>

                                        {Array.isArray(block.data) && block.data.length > 0 ? (
                                            <div className="space-y-2 pt-1">
                                                {block.data.map((edu: any, eduIdx: number) => (
                                                    <div key={edu.id} className="space-y-0.5">
                                                        <div className="flex justify-between items-baseline gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <EditableText
                                                                    tag="span"
                                                                    value={edu.school}
                                                                    placeholder="학교명"
                                                                    onChange={(newSchool) => {
                                                                        const updated = [...block.data];
                                                                        updated[eduIdx] = { ...edu, school: newSchool };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                    className="font-bold text-neutral-900 text-sm"
                                                                />
                                                                <span className="text-xs text-neutral-400">|</span>
                                                                <EditableText
                                                                    value={edu.major}
                                                                    placeholder="전공"
                                                                    onChange={(newMajor) => {
                                                                        const updated = [...block.data];
                                                                        updated[eduIdx] = { ...edu, major: newMajor };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                    className="text-xs font-semibold text-neutral-700"
                                                                />
                                                            </div>

                                                            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                                                                <EditableText
                                                                    value={edu.startDate}
                                                                    placeholder="입학일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[eduIdx] = { ...edu, startDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                                <span>~</span>
                                                                <EditableText
                                                                    value={edu.endDate}
                                                                    placeholder="졸업일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[eduIdx] = { ...edu, endDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                                <span className="text-neutral-400">({edu.status || "졸업"})</span>
                                                            </div>
                                                        </div>

                                                        {edu.score && (
                                                            <p className="text-xs text-neutral-500">
                                                                학점: {edu.score}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-neutral-400 italic">학력 정보를 추가해 주세요.</p>
                                        )}
                                    </div>
                                )}

                                {/* 6. 자격/수상 (Certification) 블록 */}
                                {block.type === "certification" && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                                            {templateType === "modern" && (
                                                <span
                                                    style={{ backgroundColor: primaryColor }}
                                                    className="w-1.5 h-4 rounded-full inline-block"
                                                />
                                            )}
                                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                                {block.title || "CERTIFICATIONS & AWARDS"}
                                            </h2>
                                        </div>

                                        {Array.isArray(block.data) && block.data.length > 0 ? (
                                            <div className="space-y-2 pt-1">
                                                {block.data.map((cert: any, certIdx: number) => (
                                                    <div key={cert.id} className="flex justify-between items-baseline gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <EditableText
                                                                tag="span"
                                                                value={cert.title}
                                                                placeholder="자격증/수상명"
                                                                onChange={(newTitle) => {
                                                                    const updated = [...block.data];
                                                                    updated[certIdx] = { ...cert, title: newTitle };
                                                                    updateBlockData(block.id, updated);
                                                                }}
                                                                className="font-bold text-neutral-900 text-sm"
                                                            />
                                                            {cert.issuer && (
                                                                <span className="text-xs text-neutral-500">
                                                                    ({cert.issuer})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <EditableText
                                                            value={cert.date}
                                                            placeholder="취득일"
                                                            onChange={(newDate) => {
                                                                const updated = [...block.data];
                                                                updated[certIdx] = { ...cert, date: newDate };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                            className="text-xs text-neutral-500 font-medium"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-neutral-400 italic">자격 및 수상 내역을 추가해 주세요.</p>
                                        )}
                                    </div>
                                )}

                                {/* 7. 자유 텍스트 블록 */}
                                {block.type === "custom_text" && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                                            {templateType === "modern" && (
                                                <span
                                                    style={{ backgroundColor: primaryColor }}
                                                    className="w-1.5 h-4 rounded-full inline-block"
                                                />
                                            )}
                                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                                {block.title}
                                            </h2>
                                        </div>
                                        <EditableText
                                            tag="p"
                                            multiline
                                            value={block.data?.content || ""}
                                            placeholder="내용을 입력하세요..."
                                            onChange={(newContent) =>
                                                updateBlockData(block.id, { content: newContent })
                                            }
                                            className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line pt-1 block"
                                        />
                                    </div>
                                )}

                                {/* 미니멀일 때만 하단 구분선 노출 */}
                                {templateType === "minimal" && block.style.showDivider && (
                                    <hr className="mt-4 border-neutral-200" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 우측 하단 플로팅 줌 컨트롤 바 (인쇄 시 자동 숨김) */}
            <div className="no-print fixed bottom-6 right-84 bg-[#181920]/90 backdrop-blur border border-neutral-700 rounded-full px-3 py-1.5 shadow-xl flex items-center gap-2 z-40">
                <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 50}
                    className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                    title="축소"
                >
                    <ZoomOut size={14} />
                </button>

                <span className="text-[11px] font-mono font-medium text-neutral-300 min-w-[36px] text-center select-none">
                    {zoomLevel}%
                </span>

                <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 150}
                    className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                    title="확대"
                >
                    <ZoomIn size={14} />
                </button>

                <div className="w-[1px] h-3 bg-neutral-700 mx-0.5" />

                <button
                    onClick={handleZoomReset}
                    className="p-1 text-neutral-400 hover:text-white transition"
                    title="100%로 리셋"
                >
                    <RotateCcw size={12} />
                </button>
            </div>
        </main>
    );
}