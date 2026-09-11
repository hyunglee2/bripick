// src/components/editor/ResumeCanvas.tsx
"use client";

import { useResumeStore } from "@/store/useResumeStore";

export default function ResumeCanvas() {
    const blocks = useResumeStore((state) => state.resume.blocks);
    const globalStyle = useResumeStore((state) => state.resume.globalStyle);
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const setSelectedBlockId = useResumeStore((state) => state.setSelectedBlockId);

    const templateType = globalStyle?.template || "modern";
    const primaryColor = globalStyle?.primaryColor || "#2563eb";
    const A4_HEIGHT_PX = 1130;

    return (
        <main
            onClick={() => setSelectedBlockId(null)}
            className="flex-1 bg-[#0c0d12] overflow-y-auto p-8 flex justify-center cursor-default"
        >
            {/* A4 백지 캔버스 */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: `${globalStyle?.contentWidth || 800}px`,
                    padding: `${globalStyle?.basePadding || 36}px`,
                }}
                className="resume-paper relative w-full min-h-[1130px] bg-white text-neutral-900 shadow-2xl rounded-sm flex flex-col transition-all"
            >
                {/* A4 1페이지 경계선 (인쇄 시 제외) */}
                <div
                    style={{ top: `${A4_HEIGHT_PX}px` }}
                    className="no-print absolute left-0 right-0 border-b-2 border-dashed border-red-300 pointer-events-none flex justify-end pr-2 -mt-[1px]"
                >
                    <span className="text-[10px] text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded -translate-y-1/2 select-none">
                        A4 1페이지 경계선
                    </span>
                </div>

                {blocks.map((block) => {
                    const isSelected = selectedBlockId === block.id;

                    return (
                        <div
                            key={block.id}
                            onClick={() => setSelectedBlockId(block.id)}
                            style={{
                                paddingTop: `${block.style.paddingY}px`,
                                paddingBottom: `${block.style.paddingY}px`,
                            }}
                            /* 템플릿(Modern 카드 vs Minimal 플랫) 스타일 분기 */
                            className={`relative cursor-pointer transition ${templateType === "modern"
                                    ? "bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-6 py-5 mb-4 shadow-xs hover:border-neutral-300 hover:shadow-sm"
                                    : "px-4 mb-2 hover:bg-neutral-50/50 rounded"
                                } ${isSelected
                                    ? "!ring-2 !ring-blue-500 !border-blue-500 bg-blue-50/20"
                                    : ""
                                }`}
                        >
                            {/* 1. 프로필 블록 */}
                            {block.type === "profile" && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-baseline">
                                        <h1 className="text-3xl font-black tracking-tight text-neutral-900">
                                            {block.data.name || "이름을 입력하세요"}
                                        </h1>
                                        <span
                                            style={{ color: primaryColor }}
                                            className="text-sm font-bold tracking-tight"
                                        >
                                            {block.data.role}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-500 font-medium">
                                        {block.data.email} {block.data.phone && `| ${block.data.phone}`}{" "}
                                        {block.data.location && `| ${block.data.location}`}
                                    </p>
                                    {block.data.bio && (
                                        <p className="text-sm text-neutral-700 leading-relaxed pt-2 whitespace-pre-line border-t border-neutral-200/50 mt-2">
                                            {block.data.bio}
                                        </p>
                                    )}
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
                                            {block.data.map((exp: any) => (
                                                <div key={exp.id} className="space-y-1">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="font-bold text-neutral-900 text-sm">
                                                            {exp.company}
                                                        </span>
                                                        <span className="text-xs text-neutral-500 font-medium">
                                                            {exp.startDate} ~ {exp.endDate}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{ color: primaryColor }}
                                                        className="text-xs font-semibold"
                                                    >
                                                        {exp.role}
                                                    </div>
                                                    <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 pt-1">
                                                        {exp.description?.map((desc: string, i: number) => (
                                                            <li key={i}>{desc}</li>
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
                                            {block.data.map((proj: any) => (
                                                <div key={proj.id} className="space-y-1">
                                                    <div className="flex justify-between items-baseline">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-neutral-900 text-sm">
                                                                {proj.title}
                                                            </span>
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
                                                        <span className="text-xs text-neutral-500 font-medium">
                                                            {proj.startDate} ~ {proj.endDate}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs font-semibold text-neutral-600">
                                                        {proj.role}
                                                    </div>
                                                    <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 pt-1">
                                                        {proj.description?.map((desc: string, i: number) => (
                                                            <li key={i}>{desc}</li>
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
                                                            ? { borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}10`, color: primaryColor }
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

                            {/* 5. 자유 텍스트 블록 */}
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
                                    <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line pt-1">
                                        {block.data?.content || "우측 인스펙터 패널에서 내용을 입력하세요."}
                                    </p>
                                </div>
                            )}

                            {/* 미니멀일 때만 하단 구분선 노출 (모던은 카드로 분리되므로 제외) */}
                            {templateType === "minimal" && block.style.showDivider && (
                                <hr className="mt-4 border-neutral-200" />
                            )}
                        </div>
                    );
                })}
            </div>
        </main>
    );
}