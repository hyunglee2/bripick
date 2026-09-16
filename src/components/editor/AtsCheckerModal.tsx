// src/components/editor/AtsCheckerModal.tsx
"use client";

import { useResumeStore } from "@/store/useResumeStore";
import { CheckCircle2, AlertCircle, X, ShieldCheck, TrendingUp } from "lucide-react";

interface AtsCheckerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AtsCheckerModal({ isOpen, onClose }: AtsCheckerModalProps) {
    const blocks = useResumeStore((state) => state.resume.blocks);

    if (!isOpen) return null;

    // 1. 프로필 검사
    const profileBlock = blocks.find((b) => b.type === "profile");
    const pData = profileBlock?.data || {};
    const hasName = Boolean(pData.name && pData.name.trim() !== "");
    const hasRole = Boolean(pData.role && pData.role.trim() !== "");
    const hasEmail = Boolean(pData.email && pData.email.includes("@"));
    const hasPhone = Boolean(pData.phone && pData.phone.trim() !== "");
    const hasBio = Boolean(pData.bio && pData.bio.trim().length >= 30);

    // 2. 기술 스택 검사
    const skillsBlock = blocks.find((b) => b.type === "skills");
    const skillsCount = (skillsBlock?.data?.skills || []).length;
    const hasSkills = skillsCount >= 3;

    // 3. 경력/프로젝트 불릿 수치 성과 검사 (숫자나 % 포함 여부)
    const expBlock = blocks.find((b) => b.type === "experience");
    const expBullets = (expBlock?.data || []).flatMap((e: any) => e.description || []);
    const projBlock = blocks.find((b) => b.type === "project");
    const projBullets = (projBlock?.data || []).flatMap((p: any) => p.description || []);
    const allBullets = [...expBullets, ...projBullets];

    // 숫자 또는 % 기호가 들어간 정량적 불릿 수
    const quantitativeBullets = allBullets.filter((text: string) =>
        /[0-9]+(%|배|건|명|원|억|만|ms|초|fps)?/i.test(text)
    );
    const hasMetrics = quantitativeBullets.length >= 2;

    // 4. 학력 정보 검사
    const eduBlock = blocks.find((b) => b.type === "education");
    const hasEdu = Boolean(
        eduBlock?.data && eduBlock.data.length > 0 && eduBlock.data[0].school
    );

    // 종합 점수 계산 (100점 만점)
    let score = 0;
    if (hasName) score += 10;
    if (hasRole) score += 5;
    if (hasEmail && hasPhone) score += 10;
    if (hasBio) score += 15;
    if (hasSkills) score += 15;
    if (hasMetrics) score += 25;
    if (hasEdu) score += 20;

    const checklist = [
        {
            title: "기본 인적 사항 (이름, 직무, 이메일, 연락처)",
            passed: hasName && hasRole && hasEmail && hasPhone,
            feedback: "연락처와 이메일 형식(@)을 정확히 기재해야 서류 검토 시 누락되지 않습니다.",
            score: "+25점",
        },
        {
            title: "자기소개 및 요약 (30자 이상)",
            passed: hasBio,
            feedback: "경력 목표와 강점을 담은 1~2문장의 핵심 소개글 작성을 권장합니다.",
            score: "+15점",
        },
        {
            title: "핵심 기술 키워드 (3개 이상)",
            passed: hasSkills,
            feedback: `현재 ${skillsCount}개 등록됨. 포지션 관련 핵심 프레임워크/언어를 등록하세요.`,
            score: "+15점",
        },
        {
            title: "정량적 수치 성과 포함 (최소 2개 불릿 이상)",
            passed: hasMetrics,
            feedback: "예: '로딩 속도 40% 단축', '월 매출 1.2억 달성'과 같이 숫자로 증명하세요.",
            score: "+25점",
        },
        {
            title: "학력 정보 등록",
            passed: hasEdu,
            feedback: "최종 학력 및 전공을 기재해 신뢰도를 높여주세요.",
            score: "+20점",
        },
    ];

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#161722] border border-neutral-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6 text-neutral-100 animate-in fade-in zoom-in-95 duration-150"
            >
                {/* 상단 헤더 */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={20} className="text-blue-500" />
                        <h2 className="text-base font-bold text-white tracking-tight">
                            ATS 이력서 완성도 진단
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-neutral-400 hover:text-white rounded transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 점수 요약 배너 */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="text-xs text-neutral-400 flex items-center gap-1">
                            <TrendingUp size={13} className="text-emerald-400" />
                            서류 자동 통과 가능성
                        </div>
                        <div className="text-2xl font-black tracking-tight text-white flex items-baseline gap-1">
                            {score} <span className="text-sm font-semibold text-neutral-500">/ 100점</span>
                        </div>
                    </div>

                    <div className="text-right">
                        <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border ${score >= 80
                                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/80"
                                    : score >= 50
                                        ? "bg-amber-950/60 text-amber-300 border-amber-800/80"
                                        : "bg-red-950/60 text-red-300 border-red-800/80"
                                }`}
                        >
                            {score >= 80 ? "합격 안정권" : score >= 50 ? "보완 권장" : "미완성 상태"}
                        </span>
                    </div>
                </div>

                {/* 세부 항목 체크리스트 */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        검사항목 체크리스트
                    </h3>

                    <div className="space-y-2">
                        {checklist.map((item, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded-lg border text-xs transition ${item.passed
                                        ? "bg-emerald-950/20 border-emerald-900/40 text-neutral-200"
                                        : "bg-neutral-900/60 border-neutral-800 text-neutral-400"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-semibold">
                                        {item.passed ? (
                                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                        ) : (
                                            <AlertCircle size={16} className="text-neutral-500 shrink-0" />
                                        )}
                                        <span className={item.passed ? "text-white" : "text-neutral-300"}>
                                            {item.title}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-mono text-neutral-400">{item.score}</span>
                                </div>

                                {!item.passed && (
                                    <p className="mt-1.5 text-[11px] text-neutral-400 leading-relaxed pl-6">
                                        💡 {item.feedback}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 모달 닫기 버튼 */}
                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-xs text-white transition active:scale-[0.98]"
                    >
                        확인 및 에디터로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
}