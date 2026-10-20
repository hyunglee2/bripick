"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import ResumeCanvas from "@/components/editor/ResumeCanvas";
import InspectorPanel from "@/components/editor/InspectorPanel";
import ServiceDialog from "@/components/ui/ServiceDialog";

const STORAGE_KEY = "bripick-editor-inspector-width";
const DEFAULT_WIDTH = 440;
const MIN_INSPECTOR_WIDTH = 340;
const MIN_CANVAS_WIDTH = 520;
const RESIZE_STEP = 24;
const MOBILE_GUIDE_STORAGE_KEY = "bripick-mobile-editor-guide-dismissed";
type MobileInspectorLevel = "collapsed" | "half" | "full";

export default function EditorWorkspace() {
    const workspaceRef = useRef<HTMLDivElement>(null);
    const mobilePanelDragStartYRef = useRef<number | null>(null);
    const mobilePanelDraggedRef = useRef(false);
    const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [mobileInspectorLevel, setMobileInspectorLevel] = useState<MobileInspectorLevel>("half");
    const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);

    const clampWidth = useCallback((width: number) => {
        const workspaceWidth = workspaceRef.current?.getBoundingClientRect().width ?? window.innerWidth;
        const maxWidth = Math.max(MIN_INSPECTOR_WIDTH, workspaceWidth - MIN_CANVAS_WIDTH);
        return Math.min(Math.max(width, MIN_INSPECTOR_WIDTH), maxWidth);
    }, []);

    const updateWidth = useCallback((width: number) => {
        setInspectorWidth(clampWidth(width));
    }, [clampWidth]);

    useEffect(() => {
        const storedWidth = Number(window.localStorage.getItem(STORAGE_KEY));
        if (Number.isFinite(storedWidth) && storedWidth > 0) {
            updateWidth(storedWidth);
        } else {
            updateWidth(Math.min(480, window.innerWidth * 0.3));
        }
    }, [updateWidth]);

    useEffect(() => {
        const handleResize = () => updateWidth(inspectorWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [inspectorWidth, updateWidth]);

    useEffect(() => {
        const isMobileViewport = window.matchMedia("(max-width: 640px)").matches;
        const wasDismissed = window.localStorage.getItem(MOBILE_GUIDE_STORAGE_KEY) === "true";
        if (!isMobileViewport || wasDismissed) return;

        const timer = window.setTimeout(() => setIsMobileGuideOpen(true), 700);
        return () => window.clearTimeout(timer);
    }, []);

    const finishResize = useCallback(() => {
        setIsResizing(false);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
        window.localStorage.setItem(STORAGE_KEY, String(Math.round(inspectorWidth)));
    }, [inspectorWidth]);

    useEffect(() => {
        if (!isResizing) return;

        const handlePointerMove = (event: PointerEvent) => {
            const workspaceRight = workspaceRef.current?.getBoundingClientRect().right ?? window.innerWidth;
            updateWidth(workspaceRight - event.clientX);
        };

        const handlePointerUp = () => finishResize();
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp, { once: true });
        window.addEventListener("pointercancel", handlePointerUp, { once: true });

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [finishResize, isResizing, updateWidth]);

    const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        setIsResizing(true);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    };

    const resetWidth = () => {
        const nextWidth = clampWidth(Math.min(480, window.innerWidth * 0.3));
        setInspectorWidth(nextWidth);
        window.localStorage.setItem(STORAGE_KEY, String(Math.round(nextWidth)));
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? RESIZE_STEP : -RESIZE_STEP;
        const nextWidth = clampWidth(inspectorWidth + direction);
        setInspectorWidth(nextWidth);
        window.localStorage.setItem(STORAGE_KEY, String(Math.round(nextWidth)));
    };

    const handleMobilePanelPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        mobilePanelDragStartYRef.current = event.clientY;
        mobilePanelDraggedRef.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleMobilePanelPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        const startY = mobilePanelDragStartYRef.current;
        if (startY === null) return;
        const dragDistance = event.clientY - startY;
        let nextLevel: MobileInspectorLevel | null = null;
        if (dragDistance <= -24) {
            if (mobileInspectorLevel === "collapsed") nextLevel = "half";
            if (mobileInspectorLevel === "half") nextLevel = "full";
        } else if (dragDistance >= 24) {
            if (mobileInspectorLevel === "full") nextLevel = "half";
            if (mobileInspectorLevel === "half") nextLevel = "collapsed";
        }
        if (!nextLevel) return;
        mobilePanelDraggedRef.current = true;
        mobilePanelDragStartYRef.current = null;
        setMobileInspectorLevel(nextLevel);
    };

    const handleMobilePanelPointerEnd = () => {
        mobilePanelDragStartYRef.current = null;
    };

    const toggleMobileInspector = () => {
        if (mobilePanelDraggedRef.current) {
            mobilePanelDraggedRef.current = false;
            return;
        }
        setMobileInspectorLevel((level) => {
            if (level === "collapsed") return "half";
            if (level === "full") return "half";
            return "collapsed";
        });
    };

    const dismissMobileGuide = () => {
        window.localStorage.setItem(MOBILE_GUIDE_STORAGE_KEY, "true");
        setIsMobileGuideOpen(false);
    };

    return (
        <>
            <div ref={workspaceRef} className={`editor-workspace flex min-h-0 flex-1 overflow-hidden${isResizing ? " is-resizing" : ""}${mobileInspectorLevel === "collapsed" ? " is-mobile-inspector-collapsed" : ""}${mobileInspectorLevel === "full" ? " is-mobile-inspector-full" : ""}`}>
                <ResumeCanvas />
                <div
                    role="separator"
                    aria-label="미리보기와 작업 패널 너비 조절"
                    aria-orientation="vertical"
                    aria-valuemin={MIN_INSPECTOR_WIDTH}
                    aria-valuenow={Math.round(inspectorWidth)}
                    tabIndex={0}
                    className="editor-panel-resizer"
                    onPointerDown={startResize}
                    onDoubleClick={resetWidth}
                    onKeyDown={handleKeyDown}
                    title="드래그하여 패널 너비 조절 · 더블클릭하여 초기화"
                >
                    <span className="editor-panel-resizer__grip" aria-hidden="true">
                        <GripVertical size={14} strokeWidth={1.8} />
                    </span>
                </div>
                <button
                    type="button"
                    className="editor-mobile-panel-toggle"
                    aria-expanded={mobileInspectorLevel !== "collapsed"}
                    aria-controls="editor-inspector-panel"
                    aria-label={`작업 패널 ${mobileInspectorLevel === "collapsed" ? "반 펼치기" : mobileInspectorLevel === "half" ? "접기" : "반 펼치기"}`}
                    onClick={toggleMobileInspector}
                    onPointerDown={handleMobilePanelPointerDown}
                    onPointerMove={handleMobilePanelPointerMove}
                    onPointerUp={handleMobilePanelPointerEnd}
                    onPointerCancel={handleMobilePanelPointerEnd}
                >
                    작업 패널
                </button>
                <div id="editor-inspector-panel" className="editor-inspector-shell min-h-0 shrink-0" style={{ width: inspectorWidth }}>
                    <InspectorPanel />
                </div>
            </div>
            <ServiceDialog
                isOpen={isMobileGuideOpen}
                title="PC에서 더 편리하게 작성할 수 있어요"
                message="Bripick은 모바일에서도 사용할 수 있지만, PC의 넓은 화면에서는 이력서를 더욱 편리하게 작성하고 전체 미리보기를 한눈에 확인할 수 있어요."
                confirmLabel="모바일에서 계속하기"
                onConfirm={dismissMobileGuide}
            />
        </>
    );
}
