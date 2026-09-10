// 서비스 로고와 새 블록(Brick)을 바로 추가할 수 있는 상단 바
"use client";

import { useResumeStore } from "@/store/useResumeStore";
import { Plus, Download, Eye } from "lucide-react";
import { BlockType } from "@/types/resume";

export default function EditorHeader() {
    const addBlock = useResumeStore((state) => state.addBlock);
    const setSelectedBlockId = useResumeStore((state) => state.setSelectedBlockId);

    const blockButtons: { label: string; type: BlockType }[] = [
        { label: "+ 경력", type: "experience" },
        { label: "+ 프로젝트", type: "project" },
        { label: "+ 기술 스택", type: "skills" },
        { label: "+ 자유 텍스트", type: "custom_text" },
    ];

    // PDF 내보내기 핸들러 (포커스 테두리 해제 후 인쇄창 호출)
    const handleExportPDF = () => {
        setSelectedBlockId(null); // 선택된 블록 테두리 제거
        setTimeout(() => {
            window.print();
        }, 150);
    };

    return (
        <header className="h-14 border-b border-neutral-800 bg-[#12131a] px-6 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-black text-xs text-white">
                        B
                    </div>
                    <span className="font-bold tracking-tight text-white">Bripick</span>
                </div>

                {/* 블록 추가 단축 버튼들 */}
                <div className="flex items-center gap-1.5 border-l border-neutral-800 pl-4">
                    <span className="text-xs text-neutral-400 mr-1 flex items-center gap-1">
                        <Plus size={14} /> 블록 추가:
                    </span>
                    {blockButtons.map((btn) => (
                        <button
                            key={btn.type}
                            onClick={() => addBlock(btn.type)}
                            className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition active:scale-95"
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 font-medium text-white transition shadow-sm active:scale-95"
                >
                    <Download size={14} /> PDF 저장
                </button>
            </div>
        </header>
    );
}