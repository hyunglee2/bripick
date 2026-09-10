// 서비스 로고와 새 블록(Brick)을 바로 추가할 수 있는 상단 바
"use client";

import { useRef } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { Plus, Download, Upload, FileCode } from "lucide-react";
import { BlockType } from "@/types/resume";

export default function EditorHeader() {
    const addBlock = useResumeStore((state) => state.addBlock);
    const setSelectedBlockId = useResumeStore((state) => state.setSelectedBlockId);
    const resume = useResumeStore((state) => state.resume);
    const loadResume = useResumeStore((state) => state.loadResume);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const blockButtons: { label: string; type: BlockType }[] = [
        { label: "+ 경력", type: "experience" },
        { label: "+ 프로젝트", type: "project" },
        { label: "+ 기술 스택", type: "skills" },
        { label: "+ 자유 텍스트", type: "custom_text" },
    ];

    // 1. PDF 인쇄 저장
    const handleExportPDF = () => {
        setSelectedBlockId(null);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    // 2. JSON 파일 다운로드 (백업)
    const handleDownloadJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resume, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `bripick-resume-${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    // 3. JSON 파일 업로드 (불러오기)
    const handleUploadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (event) => {
                try {
                    const parsedData = JSON.parse(event.target?.result as string);
                    if (parsedData && parsedData.blocks) {
                        loadResume(parsedData);
                        alert("이력서 데이터를 성공적으로 불러왔습니다!");
                    } else {
                        alert("올바르지 않은 이력서 JSON 파일 형식입니다.");
                    }
                } catch (error) {
                    alert("JSON 파일을 파싱하는 중 오류가 발생했습니다.");
                }
            };
        }
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

            <div className="flex items-center gap-2">
                {/* 숨겨진 파일 인풋 */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadJSON}
                    accept=".json"
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition"
                    title="JSON 파일로 불러오기"
                >
                    <Upload size={14} /> 불러오기
                </button>
                <button
                    onClick={handleDownloadJSON}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition"
                    title="JSON 파일로 백업"
                >
                    <FileCode size={14} /> JSON 백업
                </button>
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