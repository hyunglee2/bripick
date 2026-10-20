"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type TutorialStep = {
    selector: string;
    title: string;
    description: string;
};

type HighlightRect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

const STORAGE_KEY = "bripick-editor-tutorial-completed-v1";
export const EDITOR_TUTORIAL_EVENT = "bripick:start-editor-tutorial";

const DESKTOP_STEPS: TutorialStep[] = [
    {
        selector: '[data-tour="document-menu"]',
        title: "이력서를 관리해 보세요",
        description: "이력서 이름을 바꾸고 새 이력서를 만들거나 기존 이력서를 복제할 수 있어요.",
    },
    {
        selector: '[data-tour="add-block"]',
        title: "필요한 블록을 추가하세요",
        description: "경력, 프로젝트, 학력 등 필요한 항목을 원하는 만큼 추가할 수 있어요.",
    },
    {
        selector: ".resume-paper",
        title: "미리보기에서 선택하고 편집하세요",
        description: "용지 안의 텍스트는 바로 수정할 수 있고, 블록이나 프로젝트를 클릭하면 해당 영역의 설정이 작업 패널에 열려요.",
    },
    {
        selector: '[data-tour="inspector"]',
        title: "선택한 영역을 작업 패널에서 편집하세요",
        description: "미리보기에서 선택한 블록이나 프로젝트의 내용을 작성·수정하고 표시 방식과 페이지 시작 옵션도 설정할 수 있어요.",
    },
    {
        selector: '[data-tour="zoom-controls"]',
        title: "문서 전체를 확인하세요",
        description: "현재 페이지와 전체 페이지 수를 확인하고 화면 맞춤과 배율을 조정할 수 있어요.",
    },
    {
        selector: '[data-tour="pdf-export"]',
        title: "완성된 이력서를 저장하세요",
        description: "작성이 끝나면 PDF 저장 버튼을 눌러 이력서를 파일로 보관할 수 있어요.",
    },
];

const MOBILE_STEPS: TutorialStep[] = [
    DESKTOP_STEPS[0],
    {
        selector: ".resume-paper",
        title: "미리보기에서 선택하고 편집하세요",
        description: "용지 안의 텍스트는 바로 수정할 수 있고, 블록이나 프로젝트를 누르면 해당 영역의 설정이 작업 패널에 열려요.",
    },
    {
        selector: '[data-tour="panel-toggle"]',
        title: "작업 패널을 움직여 보세요",
        description: "손잡이를 위아래로 끌어 접힘, 반 펼침, 전체 펼침의 세 단계로 조절할 수 있어요.",
    },
    {
        selector: '[data-tour="inspector"]',
        title: "선택한 영역을 작업 패널에서 편집하세요",
        description: "미리보기에서 선택한 블록이나 프로젝트의 내용을 작업 패널에서 작성·수정하고 표시 옵션도 설정할 수 있어요.",
    },
    {
        selector: '[data-tour="zoom-controls"]',
        title: "문서 전체를 확인하세요",
        description: "페이지를 이동하고 화면 맞춤과 배율을 조정할 수 있어요.",
    },
    DESKTOP_STEPS[5],
];

export default function EditorTutorial() {
    const [steps, setSteps] = useState<TutorialStep[]>([]);
    const [stepIndex, setStepIndex] = useState<number | null>(null);
    const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);

    const closeTutorial = useCallback((completed = false) => {
        if (completed) window.localStorage.setItem(STORAGE_KEY, "true");
        setStepIndex(null);
        setHighlightRect(null);
    }, []);

    const startTutorial = useCallback(() => {
        const isMobile = window.matchMedia("(max-width: 640px)").matches;
        setSteps(isMobile ? MOBILE_STEPS : DESKTOP_STEPS);
        setStepIndex(0);
    }, []);

    useEffect(() => {
        const handleManualStart = () => startTutorial();
        window.addEventListener(EDITOR_TUTORIAL_EVENT, handleManualStart);

        if (window.localStorage.getItem(STORAGE_KEY) !== "true") {
            let retryTimer: number | null = null;
            const tryAutoStart = () => {
                if (document.querySelector('[role="alertdialog"]')) {
                    retryTimer = window.setTimeout(tryAutoStart, 500);
                    return;
                }
                startTutorial();
            };
            retryTimer = window.setTimeout(tryAutoStart, 1400);
            return () => {
                window.removeEventListener(EDITOR_TUTORIAL_EVENT, handleManualStart);
                if (retryTimer !== null) window.clearTimeout(retryTimer);
            };
        }

        return () => window.removeEventListener(EDITOR_TUTORIAL_EVENT, handleManualStart);
    }, [startTutorial]);

    useEffect(() => {
        if (stepIndex === null) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeTutorial(true);
            if (event.key === "ArrowRight") {
                setStepIndex((current) => current === null ? null : Math.min(current + 1, steps.length - 1));
            }
            if (event.key === "ArrowLeft") {
                setStepIndex((current) => current === null ? null : Math.max(current - 1, 0));
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [closeTutorial, stepIndex, steps.length]);

    useLayoutEffect(() => {
        if (stepIndex === null) return;
        const step = steps[stepIndex];
        if (!step) return;

        let frameId = 0;
        const updateRect = () => {
            const target = document.querySelector<HTMLElement>(step.selector);
            if (!target || target.getClientRects().length === 0) {
                setHighlightRect(null);
                return;
            }
            const rect = target.getBoundingClientRect();
            const padding = 6;
            setHighlightRect({
                top: Math.max(6, rect.top - padding),
                left: Math.max(6, rect.left - padding),
                width: Math.min(window.innerWidth - 12, rect.width + padding * 2),
                height: Math.min(window.innerHeight - 12, rect.height + padding * 2),
            });
        };
        const scheduleUpdate = () => {
            window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(updateRect);
        };

        scheduleUpdate();
        window.addEventListener("resize", scheduleUpdate);
        window.addEventListener("scroll", scheduleUpdate, true);
        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener("resize", scheduleUpdate);
            window.removeEventListener("scroll", scheduleUpdate, true);
        };
    }, [stepIndex, steps]);

    if (stepIndex === null || !steps[stepIndex] || typeof document === "undefined") return null;

    const step = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
    const popoverWidth = Math.min(340, window.innerWidth - 24);
    const popoverLeft = highlightRect
        ? Math.min(window.innerWidth - popoverWidth - 12, Math.max(12, highlightRect.left + highlightRect.width / 2 - popoverWidth / 2))
        : 12;
    const placeBelow = highlightRect ? highlightRect.top + highlightRect.height + 190 < window.innerHeight : true;
    const popoverTop = highlightRect
        ? placeBelow
            ? highlightRect.top + highlightRect.height + 12
            : Math.max(12, highlightRect.top - 182)
        : 80;

    return createPortal(
        <div className="editor-tutorial" role="dialog" aria-modal="true" aria-label="Bripick 편집기 튜토리얼">
            {highlightRect && (
                <div
                    className="editor-tutorial__highlight"
                    style={highlightRect}
                    aria-hidden="true"
                />
            )}
            <section
                className="editor-tutorial__popover"
                style={isMobile ? undefined : { width: popoverWidth, left: popoverLeft, top: popoverTop }}
            >
                <div className="editor-tutorial__topline">
                    <span>{stepIndex + 1} / {steps.length}</span>
                    <button type="button" onClick={() => closeTutorial(true)} aria-label="튜토리얼 닫기">
                        <X size={16} />
                    </button>
                </div>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
                <div className="editor-tutorial__progress" aria-hidden="true">
                    {steps.map((_, index) => <span key={index} className={index === stepIndex ? "is-active" : ""} />)}
                </div>
                <div className="editor-tutorial__actions">
                    <button type="button" className="editor-tutorial__skip" onClick={() => closeTutorial(true)}>건너뛰기</button>
                    <div>
                        {stepIndex > 0 && (
                            <button type="button" onClick={() => setStepIndex(stepIndex - 1)}>이전</button>
                        )}
                        <button
                            type="button"
                            className="editor-tutorial__primary"
                            onClick={() => isLastStep ? closeTutorial(true) : setStepIndex(stepIndex + 1)}
                        >
                            {isLastStep ? "완료" : "다음"}
                        </button>
                    </div>
                </div>
            </section>
        </div>,
        document.body,
    );
}
