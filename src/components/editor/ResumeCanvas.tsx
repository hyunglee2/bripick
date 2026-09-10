// 스토어에 담긴 블록들을 실제 종이 규격 형태로 나열하고, 클릭 시 선택 상태로 만들어주는 캔버스 영역
"use client";

import { useResumeStore } from "@/store/useResumeStore";

export default function ResumeCanvas() {
    const blocks = useResumeStore((state) => state.resume.blocks);
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const setSelectedBlockId = useResumeStore((state) => state.setSelectedBlockId);

    return (
        <main className="flex-1 bg-[#0c0d12] overflow-y-auto p-8 flex justify-center">
            {/* A4 백지 캔버스 */}
            <div className="resume-paper w-full max-w-[800px] min-h-[1050px] bg-white text-neutral-900 shadow-2xl rounded-sm p-12 flex flex-col transition-all">
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
                                ? "ring-2 ring-blue-500 bg-blue-50/10"
                                : "hover:ring-1 hover:ring-neutral-200"
                                }`}
                        >
                            {/* 1. 프로필 블록 */}
                            {block.type === "profile" && (
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
                                        {block.data.name || "이름을 입력하세요"}
                                    </h1>
                                    <p className="text-sm font-semibold text-blue-600">
                                        {block.data.role}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        {block.data.email} {block.data.phone && `| ${block.data.phone}`}{" "}
                                        {block.data.location && `| ${block.data.location}`}
                                    </p>
                                    {block.data.bio && (
                                        <p className="text-sm text-neutral-700 leading-relaxed pt-1 whitespace-pre-line">
                                            {block.data.bio}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 2. 경력 블록 */}
                            {block.type === "experience" && (
                                <div className="space-y-3">
                                    <h2 className="text-base font-bold border-b border-neutral-300 pb-1 text-neutral-900 uppercase tracking-wider">
                                        {block.title}
                                    </h2>
                                    {Array.isArray(block.data) && block.data.length > 0 ? (
                                        block.data.map((exp: any) => (
                                            <div key={exp.id} className="space-y-1">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="font-bold text-neutral-900 text-sm">
                                                        {exp.company}
                                                    </span>
                                                    <span className="text-xs text-neutral-500 font-medium">
                                                        {exp.startDate} ~ {exp.endDate}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-semibold text-neutral-600">
                                                    {exp.role}
                                                </div>
                                                <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 pt-1">
                                                    {exp.description?.map((desc: string, i: number) => (
                                                        <li key={i}>{desc}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-neutral-400 italic">경력 항목을 추가해 주세요.</p>
                                    )}
                                </div>
                            )}

                            {/* 3. 프로젝트 블록 */}
                            {block.type === "project" && (
                                <div className="space-y-3">
                                    <h2 className="text-base font-bold border-b border-neutral-300 pb-1 text-neutral-900 uppercase tracking-wider">
                                        {block.title || "PROJECTS"}
                                    </h2>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-baseline">
                                            <span className="font-bold text-neutral-900 text-sm">Bripick</span>
                                            <span className="text-xs text-neutral-500">2026.03 ~ 진행 중</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 font-medium">Next.js 기반 모듈식 이력서 빌더 서비스</p>
                                        <p className="text-xs text-neutral-700 pt-1">
                                            - Zustand를 활용한 실시간 양방향 캔버스 동기화 파이프라인 구축
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 4. 스킬 블록 */}
                            {/* 4. 스킬 블록 (실시간 데이터 연동) */}
                            {block.type === "skills" && (
                                <div className="space-y-2">
                                    <h2 className="text-base font-bold border-b border-neutral-300 pb-1 text-neutral-900 uppercase tracking-wider">
                                        {block.title || "SKILLS"}
                                    </h2>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {((block.data as any)?.skills || []).length > 0 ? (
                                            ((block.data as any).skills as string[]).map((skill: string) => (
                                                <span
                                                    key={skill}
                                                    className="px-2 py-0.5 bg-neutral-100 text-neutral-800 rounded text-xs font-medium border border-neutral-200"
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
                                    <h2 className="text-base font-bold border-b border-neutral-300 pb-1 text-neutral-900 uppercase tracking-wider">
                                        {block.title}
                                    </h2>
                                    <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line">
                                        {block.data.content || "우측 인스펙터 패널에서 내용을 입력하세요."}
                                    </p>
                                </div>
                            )}

                            {/* 하단 구분선 */}
                            {block.style.showDivider && (
                                <hr className="mt-4 border-neutral-200" />
                            )}
                        </div>
                    );
                })}
            </div>
        </main>
    );
}