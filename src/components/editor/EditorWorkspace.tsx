"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import ResumeCanvas from "@/components/editor/ResumeCanvas";
import InspectorPanel from "@/components/editor/InspectorPanel";

const STORAGE_KEY = "bripick-editor-inspector-width";
const DEFAULT_WIDTH = 440;
const MIN_INSPECTOR_WIDTH = 340;
const MIN_CANVAS_WIDTH = 520;
const RESIZE_STEP = 24;

export default function EditorWorkspace() {
    const workspaceRef = useRef<HTMLDivElement>(null);
    const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);

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

    return (
        <div ref={workspaceRef} className={`editor-workspace flex min-h-0 flex-1 overflow-hidden${isResizing ? " is-resizing" : ""}`}>
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
            <div className="editor-inspector-shell min-h-0 shrink-0" style={{ width: inspectorWidth }}>
                <InspectorPanel />
            </div>
        </div>
    );
}
