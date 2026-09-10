// 스토어에 담긴 블록들을 실제 종이 규격 형태로 나열하고, 클릭 시 선택 상태로 만들어주는 캔버스 영역
"use client";

import { useResumeStore } from "@/store/useResumeStore";

export default function ResumeCanvas() {
    const blocks = useResumeStore((state) => state.resume.blocks);
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const setSelectedBlockId = useResumeStore((state) => state.setSelectedBlockId);

    return (
        <main className="flex-1 bg-[#0c0d12] overflow-y-auto p-8 flex justify-center">
            {/* A4 비율의 이력서 백지 캔버스 */}
            <div className="w-full max-w-[800px] min-h-[1050px] bg-white text-neutral-900 shadow-2xl rounded-sm p-12 flex flex-col">
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
                            className={`relative cursor-pointer transition rounded px-4 group ${isSelected
                                ? "ring-2 ring-blue-500 bg-blue-50/20"
                                : "hover:ring-1 hover:ring-neutral-300"
                                }`}
                        >
                            {/* 프로필 블록 렌더링 */}
                            {block.type === "profile" && (
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-extrabold tracking-tight">
                                        {block.data.name || "이름을 입력하세요"}
                                    </h1>
                                    <p className="text-sm font-semibold text-blue-600">
                                        {block.data.role}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        {block.data.email} {block.data.phone && `| ${block.data.phone}`}{" "}
                                        {block.data.location && `| ${block.data.location}`}
                                    </p>
                                    <p className="text-sm text-neutral-700 leading-relaxed pt-2">
                                        {block.data.bio}
                                    </p>
                                </div>
                            )}

                            {/* 경력 블록 렌더링 */}
                            {block.type === "experience" && (
                                <div className="space-y-3">
                                    <h2 className="text-lg font-bold border-b border-neutral-200 pb-1 text-neutral-800">
                                        {block.title}
                                    </h2>
                                    {block.data.map((exp: any) => (
                                        <div key={exp.id} className="space-y-1">
                                            <div className="flex justify-between items-baseline">
                                                <span className="font-bold text-neutral-900">
                                                    {exp.company}
                                                </span>
                                                <span className="text-xs text-neutral-500">
                                                    {exp.startDate} ~ {exp.endDate}
                                                </span>
                                            </div>
                                            <div className="text-xs font-medium text-neutral-600">
                                                {exp.role}
                                            </div>
                                            <ul className="list-disc list-inside text-xs text-neutral-700 space-y-0.5 pt-1">
                                                {exp.description?.map((desc: string, i: number) => (
                                                    <li key={i}>{desc}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 기타 블록 렌더링 임시 안내 */}
                            {block.type !== "profile" && block.type !== "experience" && (
                                <div className="border border-dashed border-neutral-300 p-4 rounded text-center text-xs text-neutral-500">
                                    [{block.title}] 블록 준비 중
                                </div>
                            )}

                            {/* 하단 구분선 */}
                            {block.style.showDivider && (
                                <hr className="mt-4 border-neutral-100" />
                            )}
                        </div>
                    );
                })}
            </div>
        </main>
    );
}