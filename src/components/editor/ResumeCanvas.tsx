// src/components/editor/ResumeCanvas.tsx
"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import EditableText from "@/components/editor/EditableText";
import { ChevronDown, Columns2, Crop, FileText, GripVertical, ImagePlus, Maximize2, Monitor, Trash2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { ProfileData, ResumeBlock, ResumeDocument, SkillsData } from "@/types/resume";
import { getProfileContacts, withProfileContacts } from "@/lib/profileContacts";
import { getSkillCategories, withSkillCategories } from "@/lib/skills";
import { formatBlockTitle } from "@/lib/blockTitles";
import { escapeHtml, richTextToPlainText, sanitizeInlineRichText, splitInlineRichTextLines } from "@/lib/richText";
import RichTextEditable from "@/components/editor/RichTextEditable";
import ProjectBulletDocumentEditor from "@/components/editor/ProjectBulletDocumentEditor";
import ServiceDialog from "@/components/ui/ServiceDialog";
import ProfilePhotoCropDialog from "@/components/editor/ProfilePhotoCropDialog";

const A4_PAPER_HEIGHT = 1130;
const PAGINATION_BOTTOM_SAFETY_GAP = 24;
const DESCRIPTION_FIT_TOLERANCE = 12;
const ITEM_HEADER_FIT_TOLERANCE = 72;
const EDUCATION_ITEM_FIT_TOLERANCE = 160;
const PROJECT_ITEM_GAP = 26;
const FLOW_BLOCK_TYPES = new Set<ResumeBlock["type"]>([
    "experience",
    "project",
    "education",
    "certification",
    "custom_text",
]);

type BlockPlacement = {
    blockIndex: number;
    itemStart?: number;
    itemEnd?: number;
    descriptionStart?: number;
    descriptionEnd?: number;
    itemHeaderOnly?: boolean;
    itemHeaderContinuation?: boolean;
    experienceProjectStart?: number;
    experienceProjectEnd?: number;
    experienceProjectContinuation?: boolean;
    experienceCompanyOnly?: boolean;
    experienceProjectDescriptionStart?: number;
    experienceProjectDescriptionEnd?: number;
    experienceProjectHeaderOnly?: boolean;
    experienceProjectHeaderContinuation?: boolean;
    experienceProjectTitleOnly?: boolean;
    experienceProjectTitleContinuation?: boolean;
};

const getPlacementMeasurementKey = (blockIndex: number, placement: BlockPlacement) => [
    blockIndex,
    placement.itemStart ?? "all",
    placement.itemEnd ?? "all",
    placement.descriptionStart ?? "all",
    placement.descriptionEnd ?? "all",
    placement.itemHeaderOnly === true ? "item-header" : "item-body",
    placement.itemHeaderContinuation === true ? "item-header-continuation" : "item-header-initial",
    placement.experienceProjectStart ?? "all",
    placement.experienceProjectEnd ?? "all",
    placement.experienceProjectDescriptionStart ?? "all",
    placement.experienceProjectDescriptionEnd ?? "all",
    placement.experienceCompanyOnly === true ? "company" : "content",
    placement.experienceProjectHeaderOnly === true ? "header" : "body",
    placement.experienceProjectTitleOnly === true ? "title" : "detail",
].join(":");

type CanvasViewMode = "custom" | "page" | "width" | "two-page";

function getFlowItemCount(block: ResumeBlock) {
    if (Array.isArray(block.data)) return block.data.length;
    if (block.type === "custom_text" && block.data?.content) return String(block.data.content).split("\n").length;
    return 0;
}

function getInitialPlacements(blocks: ResumeBlock[]): BlockPlacement[][] {
    return [blocks.flatMap((block, blockIndex) => block.type === "page_break" ? [] : [{ blockIndex }])];
}

export default function ResumeCanvas({
    resumeOverride,
    readOnly = false,
}: {
    resumeOverride?: ResumeDocument;
    readOnly?: boolean;
} = {}) {
    const storedBlocks = useResumeStore((state) => state.resume.blocks);
    const storedGlobalStyle = useResumeStore((state) => state.resume.globalStyle);
    const storedSelectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const storeSetSelectedBlockId = useResumeStore((state) => state.setSelectedBlockId);
    const storeSetSelectedBlockSelection = useResumeStore((state) => state.setSelectedBlockSelection);
    const storeUpdateBlockData = useResumeStore((state) => state.updateBlockData);
    const storeUpdateBlockTitle = useResumeStore((state) => state.updateBlockTitle);
    const storeReorderBlocks = useResumeStore((state) => state.reorderBlocks);
    const storeRemoveBlock = useResumeStore((state) => state.removeBlock);
    const blocks = resumeOverride?.blocks ?? storedBlocks;
    const globalStyle = resumeOverride?.globalStyle ?? storedGlobalStyle;
    const selectedBlockId = readOnly ? null : storedSelectedBlockId;
    const setSelectedBlockId = readOnly ? (() => undefined) : storeSetSelectedBlockId;
    const setSelectedBlockSelection = readOnly ? (() => undefined) : storeSetSelectedBlockSelection;
    const updateBlockData = readOnly ? (() => undefined) : storeUpdateBlockData;
    const updateBlockTitle = readOnly ? (() => undefined) : storeUpdateBlockTitle;
    const reorderBlocks = readOnly ? (() => undefined) : storeReorderBlocks;
    const removeBlock = readOnly ? (() => undefined) : storeRemoveBlock;

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [dragOverFragmentKey, setDragOverFragmentKey] = useState<string | null>(null);
    const [dragOverPosition, setDragOverPosition] = useState<"before" | "after" | null>(null);
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [viewMode, setViewMode] = useState<CanvasViewMode>(readOnly ? "width" : "custom");
    const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
    const [activeSkillDraftCategoryId, setActiveSkillDraftCategoryId] = useState<string | null>(null);
    const [pendingDeleteBlockId, setPendingDeleteBlockId] = useState<string | null>(null);
    const [pendingProfilePhoto, setPendingProfilePhoto] = useState<{
        blockId: string;
        file?: File;
        source?: string;
        crop?: NonNullable<ProfileData["photoCrop"]>;
    } | null>(null);
    const [profilePhotoMenu, setProfilePhotoMenu] = useState<{ blockId: string; x: number; y: number } | null>(null);
    const [pagePlacements, setPagePlacements] = useState<BlockPlacement[][]>(() => getInitialPlacements(blocks));
    const scrollContainerRef = useRef<HTMLElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const zoomLevelRef = useRef(zoomLevel);
    const zoomLabelRef = useRef<HTMLSpanElement>(null);
    const viewMenuRef = useRef<HTMLDivElement>(null);
    const publicTouchGestureRef = useRef<
        | { mode: "pan"; lastX: number; lastY: number }
        | {
            mode: "pinch";
            startDistance: number;
            startZoom: number;
            currentZoom: number;
            focalX: number;
            focalY: number;
            startCenterX: number;
            startCenterY: number;
            currentCenterX: number;
            currentCenterY: number;
        }
        | null
    >(null);
    const paginationFrameRef = useRef<number | null>(null);
    const paginationBlockSignaturesRef = useRef<string[]>([]);
    const dragScrollFrameRef = useRef<number | null>(null);
    const dragClientYRef = useRef<number | null>(null);
    const profilePhotoMenuRef = useRef<HTMLDivElement>(null);
    const profilePhotoMenuInputRef = useRef<HTMLInputElement>(null);
    const profilePhotoMenuBlockIdRef = useRef<string | null>(null);

    useEffect(() => () => {
        if (dragScrollFrameRef.current !== null) cancelAnimationFrame(dragScrollFrameRef.current);
    }, []);

    useEffect(() => {
        if (!isViewMenuOpen) return;
        const closeViewMenu = (event: PointerEvent) => {
            if (!viewMenuRef.current?.contains(event.target as Node)) setIsViewMenuOpen(false);
        };
        const closeViewMenuWithKeyboard = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsViewMenuOpen(false);
        };
        window.addEventListener("pointerdown", closeViewMenu);
        window.addEventListener("keydown", closeViewMenuWithKeyboard);
        return () => {
            window.removeEventListener("pointerdown", closeViewMenu);
            window.removeEventListener("keydown", closeViewMenuWithKeyboard);
        };
    }, [isViewMenuOpen]);

    useEffect(() => {
        if (!profilePhotoMenu) return;

        const closeMenu = (event: PointerEvent) => {
            if (!profilePhotoMenuRef.current?.contains(event.target as Node)) setProfilePhotoMenu(null);
        };
        const closeMenuWithKeyboard = (event: KeyboardEvent) => {
            if (event.key === "Escape") setProfilePhotoMenu(null);
        };
        const closeMenuOnScroll = () => setProfilePhotoMenu(null);

        window.addEventListener("pointerdown", closeMenu);
        window.addEventListener("keydown", closeMenuWithKeyboard);
        window.addEventListener("scroll", closeMenuOnScroll, true);
        return () => {
            window.removeEventListener("pointerdown", closeMenu);
            window.removeEventListener("keydown", closeMenuWithKeyboard);
            window.removeEventListener("scroll", closeMenuOnScroll, true);
        };
    }, [profilePhotoMenu]);

    const templateType = globalStyle?.template || "modern";
    const primaryColor = globalStyle?.primaryColor || "#2f80c3";
    const fontFamily = globalStyle?.fontFamily || "'Pretendard', sans-serif";
    const paperPadding = globalStyle?.basePadding ?? 36;
    const typographyStyle = {
        "--resume-blue": primaryColor,
        "--resume-display-title-size": `${globalStyle?.displayTitleFontSize ?? 24}px`,
        "--resume-tagline-size": `${Math.round(((globalStyle?.displayTitleFontSize ?? 24) + 2) * 0.6)}px`,
        "--resume-section-title-size": `${globalStyle?.sectionTitleFontSize ?? 24}px`,
        "--resume-item-title-size": `${Math.max(14, globalStyle?.itemTitleFontSize ?? 19)}px`,
        "--resume-body-size": `${Math.max(14, globalStyle?.bodyFontSize ?? 14)}px`,
        "--resume-caption-size": `${Math.max(14, globalStyle?.captionFontSize ?? 14)}px`,
        "--resume-block-gap": `${globalStyle?.blockGap ?? 18}px`,
        "--resume-project-divider-gap": `${globalStyle?.projectDividerGap ?? 28}px`,
    } as React.CSSProperties;

    const fitCanvasToView = useCallback((mode: Exclude<CanvasViewMode, "custom">) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const paperWidth = globalStyle?.contentWidth || 800;
        const horizontalPadding = container.clientWidth < 768 ? 16 : 64;
        const availableWidth = Math.max(container.clientWidth - horizontalPadding, 1);
        const availableHeight = Math.max(container.clientHeight - 64, 1);
        const pageChromeHeight = A4_PAPER_HEIGHT + 34;
        const widthScale = availableWidth / paperWidth;
        const nextScale = mode === "page"
            ? Math.min(widthScale, availableHeight / pageChromeHeight)
            : mode === "two-page"
                ? availableWidth / ((paperWidth * 2) + 40)
                : widthScale;
        setZoomLevel(Math.max(25, Math.min(Math.floor(nextScale * 100), 100)));
        container.scrollLeft = 0;
        container.scrollTop = 0;
    }, [globalStyle?.contentWidth]);

    useLayoutEffect(() => {
        if (viewMode === "custom") return;

        const container = scrollContainerRef.current;
        if (!container) return;

        const updateView = () => fitCanvasToView(viewMode);
        updateView();
        const resizeObserver = new ResizeObserver(updateView);
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [fitCanvasToView, viewMode]);

    const minimumZoom = 25;
    useEffect(() => {
        zoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);

    useEffect(() => {
        if (!readOnly) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        const getDistance = (touches: TouchList) => Math.hypot(
            touches[1].clientX - touches[0].clientX,
            touches[1].clientY - touches[0].clientY,
        );
        const getCenter = (touches: TouchList) => ({
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        });

        const startPinch = (touches: TouchList) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const center = getCenter(touches);
            const rect = canvas.getBoundingClientRect();
            const renderedScale = zoomLevelRef.current / 100;
            const focalX = (center.x - rect.left) / renderedScale;
            const focalY = (center.y - rect.top) / renderedScale;
            canvas.style.transformOrigin = `${focalX}px ${focalY}px`;
            canvas.style.willChange = "transform";
            publicTouchGestureRef.current = {
                mode: "pinch",
                startDistance: Math.max(getDistance(touches), 1),
                startZoom: zoomLevelRef.current,
                currentZoom: zoomLevelRef.current,
                focalX,
                focalY,
                startCenterX: center.x,
                startCenterY: center.y,
                currentCenterX: center.x,
                currentCenterY: center.y,
            };
            setViewMode("custom");
        };

        const handleTouchStart = (event: TouchEvent) => {
            if ((event.target as HTMLElement).closest("button, a")) return;

            if (event.touches.length >= 2) {
                event.preventDefault();
                startPinch(event.touches);
                return;
            }

            const touch = event.touches[0];
            if (touch) {
                publicTouchGestureRef.current = {
                    mode: "pan",
                    lastX: touch.clientX,
                    lastY: touch.clientY,
                };
            }
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (event.touches.length >= 2) {
                event.preventDefault();
                if (publicTouchGestureRef.current?.mode !== "pinch") startPinch(event.touches);

                const gesture = publicTouchGestureRef.current;
                if (gesture?.mode !== "pinch") return;

                const nextZoom = Math.max(
                    minimumZoom,
                    Math.min(Math.round(gesture.startZoom * (getDistance(event.touches) / gesture.startDistance)), 150),
                );
                const center = getCenter(event.touches);
                gesture.currentZoom = nextZoom;
                gesture.currentCenterX = center.x;
                gesture.currentCenterY = center.y;
                zoomLevelRef.current = nextZoom;
                if (canvasRef.current) {
                    const previewScale = nextZoom / gesture.startZoom;
                    const baseScale = gesture.startZoom / 100;
                    const translateX = (center.x - gesture.startCenterX) / baseScale;
                    const translateY = (center.y - gesture.startCenterY) / baseScale;
                    canvasRef.current.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${previewScale})`;
                }
                if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${nextZoom}%`;
                return;
            }

            const touch = event.touches[0];
            const gesture = publicTouchGestureRef.current;
            if (!touch || gesture?.mode !== "pan") return;

            event.preventDefault();
            container.scrollLeft -= touch.clientX - gesture.lastX;
            container.scrollTop -= touch.clientY - gesture.lastY;
            gesture.lastX = touch.clientX;
            gesture.lastY = touch.clientY;
        };

        const handleTouchEnd = (event: TouchEvent) => {
            const gesture = publicTouchGestureRef.current;
            if (gesture?.mode === "pinch") {
                const canvas = canvasRef.current;
                if (canvas) {
                    canvas.style.zoom = String(gesture.currentZoom / 100);
                    canvas.style.transform = "none";
                    canvas.style.willChange = "auto";

                    const committedScale = gesture.currentZoom / 100;
                    const committedRect = canvas.getBoundingClientRect();
                    const focalClientX = committedRect.left + gesture.focalX * committedScale;
                    const focalClientY = committedRect.top + gesture.focalY * committedScale;
                    container.scrollLeft += focalClientX - gesture.currentCenterX;
                    container.scrollTop += focalClientY - gesture.currentCenterY;
                    canvas.style.transformOrigin = "top center";
                }
                setZoomLevel(gesture.currentZoom);
            }

            const touch = event.touches[0];
            publicTouchGestureRef.current = touch
                ? { mode: "pan", lastX: touch.clientX, lastY: touch.clientY }
                : null;
        };

        container.addEventListener("touchstart", handleTouchStart, { passive: false });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });
        container.addEventListener("touchend", handleTouchEnd, { passive: false });
        container.addEventListener("touchcancel", handleTouchEnd, { passive: false });
        return () => {
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
            container.removeEventListener("touchend", handleTouchEnd);
            container.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, [minimumZoom, readOnly]);

    const handleZoomIn = () => {
        setViewMode("custom");
        setZoomLevel((prev) => Math.min(prev + 10, 150));
    };
    const handleZoomOut = () => {
        setViewMode("custom");
        setZoomLevel((prev) => Math.max(prev - 10, minimumZoom));
    };
    const handleZoomReset = () => {
        if (readOnly) {
            setViewMode("width");
            fitCanvasToView("width");
            return;
        }
        setViewMode("custom");
        setZoomLevel(100);
    };

    const handleViewMode = (mode: Exclude<CanvasViewMode, "custom">) => {
        setViewMode(mode);
        setIsViewMenuOpen(false);
        fitCanvasToView(mode);
    };

    const handleProfilePhotoUpload = (block: ResumeBlock | undefined, file?: File) => {
        if (!file || !block || block.type !== "profile") return;
        setPendingProfilePhoto({ file, blockId: block.id });
    };

    const openProfilePhotoMenu = (blockId: string, clientX: number, clientY: number) => {
        setSelectedBlockId(blockId);
        profilePhotoMenuBlockIdRef.current = blockId;
        setProfilePhotoMenu({
            blockId,
            x: Math.max(8, Math.min(clientX, window.innerWidth - 176)),
            y: Math.max(8, Math.min(clientY, window.innerHeight - 128)),
        });
    };

    useEffect(() => {
        const handleSelectedBlockDelete = (event: KeyboardEvent) => {
            if (event.key !== "Backspace" || !selectedBlockId || pendingDeleteBlockId) return;

            const target = event.target as HTMLElement | null;
            const isEditingText = target?.closest(
                'input, textarea, select, [contenteditable="true"], [role="textbox"]',
            );
            if (isEditingText) return;

            const selectedBlock = blocks.find((block) => block.id === selectedBlockId);
            if (!selectedBlock) return;

            event.preventDefault();
            setPendingDeleteBlockId(selectedBlockId);
        };

        window.addEventListener("keydown", handleSelectedBlockDelete);
        return () => window.removeEventListener("keydown", handleSelectedBlockDelete);
    }, [blocks, pendingDeleteBlockId, selectedBlockId]);

    const pendingDeleteBlock = blocks.find((block) => block.id === pendingDeleteBlockId);

    // --- 드래그 앤 드롭 핸들러 ---
    const stopDragAutoScroll = () => {
        if (dragScrollFrameRef.current !== null) {
            cancelAnimationFrame(dragScrollFrameRef.current);
            dragScrollFrameRef.current = null;
        }
        dragClientYRef.current = null;
    };

    const runDragAutoScroll = () => {
        const container = scrollContainerRef.current;
        const clientY = dragClientYRef.current;
        if (!container || clientY === null) {
            dragScrollFrameRef.current = null;
            return;
        }

        const rect = container.getBoundingClientRect();
        const edgeSize = Math.min(120, rect.height * 0.18);
        const topDistance = clientY - rect.top;
        const bottomDistance = rect.bottom - clientY;
        let scrollDelta = 0;

        if (topDistance < edgeSize) {
            const intensity = Math.max(0, Math.min(1, (edgeSize - topDistance) / edgeSize));
            scrollDelta = -(4 + intensity * 18);
        } else if (bottomDistance < edgeSize) {
            const intensity = Math.max(0, Math.min(1, (edgeSize - bottomDistance) / edgeSize));
            scrollDelta = 4 + intensity * 18;
        }

        if (scrollDelta !== 0) container.scrollTop += scrollDelta;
        dragScrollFrameRef.current = requestAnimationFrame(runDragAutoScroll);
    };

    const handleCanvasDragOver = (event: React.DragEvent<HTMLElement>) => {
        if (draggedIndex === null) return;
        event.preventDefault();
        dragClientYRef.current = event.clientY;
        if (dragScrollFrameRef.current === null) {
            dragScrollFrameRef.current = requestAnimationFrame(runDragAutoScroll);
        }
    };

    const handleDragStart = (e: React.DragEvent, globalIdx: number) => {
        setDraggedIndex(globalIdx);
        setDragOverIndex(null);
        setDragOverFragmentKey(null);
        setDragOverPosition(null);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", globalIdx.toString());
    };

    const handleDragOver = (e: React.DragEvent, globalIdx: number, fragmentKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = e.currentTarget.getBoundingClientRect();
        const nextPosition = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
        if (dragOverIndex !== globalIdx) setDragOverIndex(globalIdx);
        if (dragOverFragmentKey !== fragmentKey) setDragOverFragmentKey(fragmentKey);
        if (dragOverPosition !== nextPosition) setDragOverPosition(nextPosition);
    };

    const handleDrop = (e: React.DragEvent, targetGlobalIdx: number) => {
        e.preventDefault();
        stopDragAutoScroll();
        if (draggedIndex !== null && dragOverPosition) {
            let insertionIndex = targetGlobalIdx + (dragOverPosition === "after" ? 1 : 0);
            if (draggedIndex < insertionIndex) insertionIndex -= 1;
            if (draggedIndex !== insertionIndex) reorderBlocks(draggedIndex, insertionIndex);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDragOverFragmentKey(null);
        setDragOverPosition(null);
    };

    const handleDragEnd = () => {
        stopDragAutoScroll();
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDragOverFragmentKey(null);
        setDragOverPosition(null);
    };

    const pages = useMemo(() => pagePlacements.map((placements, pageIndex) => ({
        pageIndex: pageIndex + 1,
        blocks: placements
            .filter(({ blockIndex }) => blocks[blockIndex])
            .map((placement) => ({
                block: blocks[placement.blockIndex],
                globalIdx: placement.blockIndex,
                placement,
            })),
    })), [blocks, pagePlacements]);

    // 텍스트 줄바꿈과 사용자 패딩까지 반영된 실제 DOM 높이로 페이지를 다시 계산한다.
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let disposed = false;
        let observer: ResizeObserver | null = null;
        const currentBlockSignatures = blocks.map((block) => JSON.stringify(block));
        const previousBlockSignatures = paginationBlockSignaturesRef.current;
        const firstChangedBlockIndex = previousBlockSignatures.length === currentBlockSignatures.length
            ? currentBlockSignatures.findIndex((signature, index) => signature !== previousBlockSignatures[index])
            : -1;
        const lockedBlockCount = firstChangedBlockIndex > 0 ? firstChangedBlockIndex : 0;
        paginationBlockSignaturesRef.current = currentBlockSignatures;

        const repaginate = () => {
            if (disposed) return;
            // DOM 높이는 소수점 단위 줄바꿈과 편집기 장식선 때문에 합산값보다
            // 조금 커질 수 있다. 하단 여백을 침범하기 전에 다음 페이지로 넘긴다.
            const availableHeight = A4_PAPER_HEIGHT - (paperPadding * 2) - PAGINATION_BOTTOM_SAFETY_GAP;
            const measuredBlockHeights = new Map<number, number>();
            const measuredPlacementHeights = new Map<string, number>();
            const measuredItemHeights = new Map<string, number>();
            const measuredDescriptionHeights = new Map<string, number>();
            const measuredItemChromeHeights = new Map<string, number>();
            const measuredContinuationItemChromeHeights = new Map<string, number>();
            const measuredExperienceCompanyHeights = new Map<string, number>();
            const measuredExperienceProjectDescriptionHeights = new Map<string, number>();
            const measuredExperienceProjectChromeHeights = new Map<string, number>();
            const measuredExperienceContinuationProjectChromeHeights = new Map<string, number>();
            const measuredExperienceProjectHeaderHeights = new Map<string, number>();
            const measuredExperienceContinuationProjectHeaderHeights = new Map<string, number>();
            const measuredExperienceProjectTitleHeights = new Map<string, number>();
            const measuredExperienceContinuationBaseHeights = new Map<number, number>();
            const measuredBaseHeights = new Map<number, number>();
            const measuredContinuationBaseHeights = new Map<number, number>();

            canvas.querySelectorAll<HTMLElement>("[data-resume-block-index]").forEach((element) => {
                const index = Number(element.dataset.resumeBlockIndex);
                const style = window.getComputedStyle(element);
                // offsetHeight는 캔버스 줌(transform)의 영향을 받지 않는다.
                const outerHeight = element.offsetHeight
                    + Number.parseFloat(style.marginTop || "0")
                    + Number.parseFloat(style.marginBottom || "0");
                measuredBlockHeights.set(index, Math.max(measuredBlockHeights.get(index) || 0, outerHeight));
                const placementKey = element.dataset.paginationPlacementKey;
                if (placementKey) {
                    measuredPlacementHeights.set(
                        placementKey,
                        Math.max(measuredPlacementHeights.get(placementKey) || 0, outerHeight),
                    );
                }
                const isDescriptionContinuation = Number(element.dataset.descriptionStart || "0") > 0
                    || element.dataset.descriptionContinuation === "true";
                const isExperienceProjectContinuation = element.dataset.experienceProjectContinuation === "true";

                let itemsHeight = 0;
                element.querySelectorAll<HTMLElement>("[data-pagination-item-index]").forEach((item) => {
                    const itemIndex = Number(item.dataset.paginationItemIndex);
                    const itemStyle = window.getComputedStyle(item);
                    const itemMarginTop = Number.parseFloat(itemStyle.marginTop || "0");
                    const itemMarginBottom = Number.parseFloat(itemStyle.marginBottom || "0");
                    const itemContentHeight = item.offsetHeight + itemMarginBottom;
                    const itemHeight = blocks[index]?.type === "project"
                        ? itemContentHeight
                        : itemContentHeight + itemMarginTop;
                    measuredItemHeights.set(
                        `${index}:${itemIndex}`,
                        Math.max(measuredItemHeights.get(`${index}:${itemIndex}`) || 0, itemHeight),
                    );

                    if (blocks[index]?.type === "experience") {
                        let projectsHeight = 0;
                        item.querySelectorAll<HTMLElement>("[data-experience-project-index]").forEach((project) => {
                            const projectIndex = Number(project.dataset.experienceProjectIndex);
                            const isProjectDescriptionContinuation = project.dataset.experienceProjectDescriptionContinuation === "true";
                            const projectStyle = window.getComputedStyle(project);
                            const projectHeight = project.offsetHeight
                                + Number.parseFloat(projectStyle.marginTop || "0")
                                + Number.parseFloat(projectStyle.marginBottom || "0");
                            const contributions = project.querySelector<HTMLElement>(".resume-project-contributions");
                            const projectHeader = project.querySelector<HTMLElement>(".resume-experience-project__header");
                            const contributionsStyle = contributions ? window.getComputedStyle(contributions) : null;
                            const contributionsHeight = contributions
                                ? contributions.offsetHeight
                                    + Number.parseFloat(contributionsStyle?.marginTop || "0")
                                    + Number.parseFloat(contributionsStyle?.marginBottom || "0")
                                : 0;
                            let projectDescriptionsHeight = 0;
                            project.querySelectorAll<HTMLElement>("[data-pagination-description-index]").forEach((description) => {
                                const descriptionIndex = Number(description.dataset.paginationDescriptionIndex);
                                const descriptionStyle = window.getComputedStyle(description);
                                const descriptionHeight = description.offsetHeight
                                    + Number.parseFloat(descriptionStyle.marginTop || "0")
                                    + Number.parseFloat(descriptionStyle.marginBottom || "0");
                                const descriptionKey = `${index}:${itemIndex}:${projectIndex}:${descriptionIndex}`;
                                measuredExperienceProjectDescriptionHeights.set(
                                    descriptionKey,
                                    Math.max(measuredExperienceProjectDescriptionHeights.get(descriptionKey) || 0, descriptionHeight),
                                );
                                projectDescriptionsHeight += descriptionHeight;
                            });
                            const projectChromeHeights = isExperienceProjectContinuation || isProjectDescriptionContinuation
                                ? measuredExperienceContinuationProjectChromeHeights
                                : measuredExperienceProjectChromeHeights;
                            const projectHeaderHeights = isExperienceProjectContinuation || isProjectDescriptionContinuation
                                ? measuredExperienceContinuationProjectHeaderHeights
                                : measuredExperienceProjectHeaderHeights;
                            const projectKey = `${index}:${itemIndex}:${projectIndex}`;
                            projectChromeHeights.set(
                                projectKey,
                                Math.max(projectChromeHeights.get(projectKey) || 0, Math.max(0, projectHeight - projectDescriptionsHeight)),
                            );
                            projectHeaderHeights.set(
                                projectKey,
                                Math.max(projectHeaderHeights.get(projectKey) || 0, Math.max(0, projectHeight - contributionsHeight)),
                            );
                            if (projectHeader) {
                                measuredExperienceProjectTitleHeights.set(
                                    projectKey,
                                    Math.max(
                                        measuredExperienceProjectTitleHeights.get(projectKey) || 0,
                                        projectHeader.offsetHeight,
                                    ),
                                );
                            }
                            projectsHeight += projectHeight;
                        });
                        if (projectsHeight > 0) {
                            measuredExperienceCompanyHeights.set(
                                `${index}:${itemIndex}`,
                                Math.max(0, itemHeight - projectsHeight),
                            );
                        }
                    }
                    // 프로젝트 사이 여백은 항목 자체 높이와 분리해 페이지 배치 시에만 더한다.
                    // 단, 블록 chrome 높이 계산에서는 실제 레이아웃 높이를 빼야 한다.
                    itemsHeight += itemContentHeight + itemMarginTop;

                    let descriptionsHeight = 0;
                    item.querySelectorAll<HTMLElement>("[data-pagination-description-index]").forEach((description) => {
                        const descriptionIndex = Number(description.dataset.paginationDescriptionIndex);
                        const descriptionStyle = window.getComputedStyle(description);
                        const descriptionHeight = description.offsetHeight
                            + Number.parseFloat(descriptionStyle.marginTop || "0")
                            + Number.parseFloat(descriptionStyle.marginBottom || "0");
                        measuredDescriptionHeights.set(
                            `${index}:${itemIndex}:${descriptionIndex}`,
                            Math.max(
                                measuredDescriptionHeights.get(`${index}:${itemIndex}:${descriptionIndex}`) || 0,
                                descriptionHeight,
                            ),
                        );
                        descriptionsHeight += descriptionHeight;
                    });
                    const itemChromeHeights = isDescriptionContinuation
                        ? measuredContinuationItemChromeHeights
                        : measuredItemChromeHeights;
                    itemChromeHeights.set(
                        `${index}:${itemIndex}`,
                        Math.max(itemChromeHeights.get(`${index}:${itemIndex}`) || 0, Math.max(0, itemHeight - descriptionsHeight)),
                    );
                });

                if (itemsHeight > 0) {
                    const baseHeights = isExperienceProjectContinuation
                        ? measuredExperienceContinuationBaseHeights
                        : isDescriptionContinuation
                            ? measuredContinuationBaseHeights
                            : measuredBaseHeights;
                    baseHeights.set(index, Math.max(baseHeights.get(index) || 0, outerHeight - itemsHeight));
                }
            });

            // 조각으로 렌더링된 항목도 전체 bullet 높이를 합산해 원래 항목 높이를 복원한다.
            blocks.forEach((block, blockIndex) => {
                if (!Array.isArray(block.data)) return;
                block.data.forEach((item: { description?: string[] }, itemIndex: number) => {
                    if (!Array.isArray(item.description) || item.description.length === 0) return;
                    const itemChromeHeight = measuredItemChromeHeights.get(`${blockIndex}:${itemIndex}`);
                    if (itemChromeHeight === undefined) return;
                    const descriptionsHeight = item.description.reduce((height, _description, descriptionIndex) => (
                        height + (measuredDescriptionHeights.get(`${blockIndex}:${itemIndex}:${descriptionIndex}`) || 24)
                    ), 0);
                    measuredItemHeights.set(`${blockIndex}:${itemIndex}`, itemChromeHeight + descriptionsHeight);
                });
            });

            const nextPages: BlockPlacement[][] = [[]];
            let usedHeight = 0;

            if (lockedBlockCount > 0) {
                const lockedPages = pagePlacements.map((page) => (
                    page.filter((placement) => placement.blockIndex < lockedBlockCount)
                ));
                let lastLockedPageIndex = -1;
                lockedPages.forEach((page, pageIndex) => {
                    if (page.length > 0) lastLockedPageIndex = pageIndex;
                });
                if (lastLockedPageIndex >= 0) {
                    nextPages.splice(
                        0,
                        nextPages.length,
                        ...lockedPages.slice(0, lastLockedPageIndex + 1).map((page) => [...page]),
                    );
                    usedHeight = nextPages.at(-1)!.reduce((height, placement) => (
                        height + (
                            measuredPlacementHeights.get(
                                getPlacementMeasurementKey(placement.blockIndex, placement),
                            ) || measuredBlockHeights.get(placement.blockIndex) || 0
                        )
                    ), 0);
                }
            }

            const startNewPage = () => {
                nextPages.push([]);
                usedHeight = 0;
            };

            const pushPlacement = (placement: BlockPlacement, estimatedHeight: number) => {
                nextPages.at(-1)!.push(placement);
                usedHeight += measuredPlacementHeights.get(
                    getPlacementMeasurementKey(placement.blockIndex, placement),
                ) || estimatedHeight;
            };

            blocks.forEach((block, index) => {
                if (index < lockedBlockCount) return;
                if (block.type === "page_break") {
                    // 이전 버전에 저장된 수동 페이지 나눔 블록은 무시한다.
                    return;
                }

                if (block.style.startOnNewPage === true && nextPages.at(-1)!.length > 0) {
                    startNewPage();
                }

                const itemCount = getFlowItemCount(block);
                if (FLOW_BLOCK_TYPES.has(block.type) && itemCount > 0) {
                    const baseHeight = measuredBaseHeights.get(index) || 80;
                    let itemStart = 0;

                    while (itemStart < itemCount) {
                        const keepItemTogether = block.type === "project" && Array.isArray(block.data)
                            ? (block.data[itemStart]?.keepTogether ?? (block.style.keepTogether === true))
                            : block.style.keepTogether === true;
                        const flowItem = Array.isArray(block.data) ? block.data[itemStart] : undefined;
                        if (flowItem?.startOnNewPage === true && nextPages.at(-1)!.length > 0) {
                            startNewPage();
                        }
                        const experienceProjects = block.type === "experience" && Array.isArray(flowItem?.projects)
                            ? flowItem.projects
                            : [];
                        const hasForcedExperienceProjectPageBreak = experienceProjects.some(
                            (project: { startOnNewPage?: boolean }) => project.startOnNewPage === true,
                        );
                        const descriptions = block.type === "experience" && Array.isArray(flowItem?.projects) && flowItem.projects.length > 0
                            ? undefined
                            : flowItem?.description;
                        const itemHeight = measuredItemHeights.get(`${index}:${itemStart}`) || 80;

                        const experienceCompanyHeight = block.type === "experience" && experienceProjects.length > 0
                            ? (measuredExperienceCompanyHeights.get(`${index}:${itemStart}`) || 90)
                            : 0;
                        const fullExperienceProjectsHeight = experienceProjects.reduce(
                            (total: number, project: { description?: string[] }, projectIndex: number) => {
                                const projectKey = `${index}:${itemStart}:${projectIndex}`;
                                const projectChromeHeight = measuredExperienceProjectChromeHeights.get(projectKey) || 64;
                                const descriptions = Array.isArray(project.description) ? project.description : [];
                                const descriptionsHeight = descriptions.reduce(
                                    (height, _description, descriptionIndex) => height + (
                                        measuredExperienceProjectDescriptionHeights.get(
                                            `${index}:${itemStart}:${projectIndex}:${descriptionIndex}`,
                                        ) || 24
                                    ),
                                    0,
                                );
                                return total + projectChromeHeight + descriptionsHeight;
                            },
                            0,
                        );
                        const oversizedExperienceItem = block.type === "experience"
                            && experienceProjects.length > 0
                            && baseHeight + experienceCompanyHeight + fullExperienceProjectsHeight > availableHeight;
                        const fullExperienceItemHeight = baseHeight
                            + experienceCompanyHeight
                            + fullExperienceProjectsHeight;

                        if (block.type === "experience" && experienceProjects.length > 0) {
                            // 한 장 안에 들어가는 경력은 자동 맞춤 시 통째로 다음 페이지로 옮긴다.
                            if (keepItemTogether && !oversizedExperienceItem && !hasForcedExperienceProjectPageBreak) {
                                if (nextPages.at(-1)!.length > 0
                                    && usedHeight + fullExperienceItemHeight > availableHeight) {
                                    startNewPage();
                                }
                                const placement: BlockPlacement = {
                                    blockIndex: index,
                                    itemStart,
                                    itemEnd: itemStart + 1,
                                    experienceProjectStart: 0,
                                    experienceProjectEnd: experienceProjects.length,
                                };
                                pushPlacement(placement, fullExperienceItemHeight);
                                itemStart += 1;
                                continue;
                            }

                            // 페이지 경계 자동 이동이 켜져 있어도 한 장보다 긴 경력은 강제로
                            // 한 페이지에 밀어 넣지 않는다. 새 페이지에서 시작한 뒤
                            // 프로젝트의 기여/성과 불릿 단위로 자연스럽게 나눈다.
                            if (keepItemTogether && nextPages.at(-1)!.length > 0) startNewPage();
                            const companyHeight = experienceCompanyHeight;
                            let companyPending = true;

                            if (!keepItemTogether && nextPages.at(-1)!.length > 0) {
                                const firstProject = experienceProjects[0] as { description?: string[] } | undefined;
                                const firstProjectDescriptions = Array.isArray(firstProject?.description)
                                    ? firstProject.description
                                    : [];
                                const firstProjectKey = `${index}:${itemStart}:0`;
                                const firstProjectChromeHeight = measuredExperienceProjectChromeHeights.get(firstProjectKey) || 64;
                                const firstDescriptionHeight = firstProjectDescriptions.length > 0
                                    ? (measuredExperienceProjectDescriptionHeights.get(`${firstProjectKey}:0`) || 24)
                                    : 0;
                                const companyFragmentHeight = baseHeight + companyHeight;
                                const firstProjectMinimumHeight = firstProjectChromeHeight + firstDescriptionHeight;

                                // 현재 페이지에 회사 정보는 들어가지만 첫 프로젝트 내용까지는
                                // 들어가지 않으면 회사부터 배치하고 프로젝트만 다음 페이지로 잇는다.
                                if (usedHeight + companyFragmentHeight <= availableHeight
                                    && usedHeight + companyFragmentHeight + firstProjectMinimumHeight > availableHeight) {
                                    const placement: BlockPlacement = {
                                        blockIndex: index,
                                        itemStart,
                                        itemEnd: itemStart + 1,
                                        experienceProjectStart: 0,
                                        experienceProjectEnd: 0,
                                        experienceCompanyOnly: true,
                                    };
                                    pushPlacement(placement, companyFragmentHeight);
                                    companyPending = false;
                                }
                            }

                            experienceProjects.forEach((project: { title?: string; description?: string[]; startOnNewPage?: boolean }, projectIndex: number) => {
                                const projectDescriptions = Array.isArray(project.description) ? project.description : [];
                                let descriptionStart = 0;
                                let projectHeaderPlacedOnPreviousPage = false;
                                let projectTitlePlacedOnPreviousPage = false;

                                if (project.startOnNewPage === true) {
                                    if (companyPending) {
                                        const companyFragmentHeight = baseHeight + companyHeight;
                                        if (nextPages.at(-1)!.length > 0
                                            && usedHeight + companyFragmentHeight > availableHeight) {
                                            startNewPage();
                                        }
                                        const placement: BlockPlacement = {
                                            blockIndex: index,
                                            itemStart,
                                            itemEnd: itemStart + 1,
                                            experienceProjectStart: projectIndex,
                                            experienceProjectEnd: projectIndex,
                                            experienceCompanyOnly: true,
                                        };
                                        pushPlacement(placement, companyFragmentHeight);
                                        companyPending = false;
                                    }
                                    if (nextPages.at(-1)!.length > 0) startNewPage();
                                }

                                if (!keepItemTogether
                                    && project.startOnNewPage !== true
                                    && projectDescriptions.length > 0
                                    && nextPages.at(-1)!.length > 0) {
                                    const projectKey = `${index}:${itemStart}:${projectIndex}`;
                                    const fragmentBaseHeight = companyPending
                                        ? baseHeight
                                        : (measuredExperienceContinuationBaseHeights.get(index) || 24);
                                    const fragmentCompanyHeight = companyPending ? companyHeight : 0;
                                    const projectHeaderChromeHeight = companyPending
                                        ? (measuredExperienceProjectHeaderHeights.get(projectKey) || 48)
                                        : (measuredExperienceContinuationProjectHeaderHeights.get(projectKey)
                                            || measuredExperienceProjectHeaderHeights.get(projectKey)
                                            || 48);
                                    const projectContentChromeHeight = companyPending
                                        ? (measuredExperienceProjectChromeHeights.get(projectKey) || 64)
                                        : (measuredExperienceContinuationProjectChromeHeights.get(projectKey)
                                            || measuredExperienceProjectChromeHeights.get(projectKey)
                                            || 64);
                                    const firstDescriptionHeight = measuredExperienceProjectDescriptionHeights.get(
                                        `${projectKey}:0`,
                                    ) || 24;
                                    const projectHeaderHeight = fragmentBaseHeight
                                        + fragmentCompanyHeight
                                        + projectHeaderChromeHeight;
                                    const projectWithFirstDescriptionHeight = fragmentBaseHeight
                                        + fragmentCompanyHeight
                                        + projectContentChromeHeight
                                        + firstDescriptionHeight;

                                    if (usedHeight + projectHeaderHeight <= availableHeight
                                        && usedHeight + projectWithFirstDescriptionHeight > availableHeight) {
                                        const placement: BlockPlacement = {
                                            blockIndex: index,
                                            itemStart,
                                            itemEnd: itemStart + 1,
                                            experienceProjectStart: projectIndex,
                                            experienceProjectEnd: projectIndex + 1,
                                            experienceProjectContinuation: !companyPending,
                                            experienceProjectDescriptionStart: 0,
                                            experienceProjectDescriptionEnd: 0,
                                            experienceProjectHeaderOnly: true,
                                        };
                                        pushPlacement(placement, projectHeaderHeight);
                                        companyPending = false;
                                        projectHeaderPlacedOnPreviousPage = true;
                                        startNewPage();
                                    } else {
                                        const projectTitleHeight = (companyPending
                                            ? fragmentBaseHeight + fragmentCompanyHeight
                                            : 0)
                                            + (measuredExperienceProjectTitleHeights.get(projectKey) || 22);
                                        if (usedHeight + projectTitleHeight <= availableHeight
                                            && usedHeight + projectHeaderHeight > availableHeight) {
                                            const placement: BlockPlacement = {
                                                blockIndex: index,
                                                itemStart,
                                                itemEnd: itemStart + 1,
                                                experienceProjectStart: projectIndex,
                                                experienceProjectEnd: projectIndex + 1,
                                                experienceProjectContinuation: !companyPending,
                                                experienceProjectDescriptionStart: 0,
                                                experienceProjectDescriptionEnd: 0,
                                                experienceProjectTitleOnly: true,
                                            };
                                            pushPlacement(placement, projectTitleHeight);
                                            companyPending = false;
                                            projectTitlePlacedOnPreviousPage = true;
                                            startNewPage();
                                        }
                                    }
                                }

                                do {
                                    const isDescriptionContinuation = descriptionStart > 0;
                                    const isProjectContinuation = !companyPending || isDescriptionContinuation;
                                    const fragmentBaseHeight = companyPending
                                        ? baseHeight
                                        : (measuredExperienceContinuationBaseHeights.get(index) || 24);
                                    const fragmentCompanyHeight = companyPending ? companyHeight : 0;
                                    const projectKey = `${index}:${itemStart}:${projectIndex}`;
                                    let projectChromeHeight = isDescriptionContinuation
                                        ? 0
                                        : companyPending
                                            ? (measuredExperienceProjectChromeHeights.get(projectKey) || 64)
                                            : (measuredExperienceContinuationProjectChromeHeights.get(projectKey)
                                                || measuredExperienceProjectChromeHeights.get(projectKey)
                                                || 64);
                                    if (projectTitlePlacedOnPreviousPage && descriptionStart === 0) {
                                        projectChromeHeight = Math.max(
                                            0,
                                            projectChromeHeight - (measuredExperienceProjectTitleHeights.get(projectKey) || 22),
                                        );
                                    }
                                    let fragmentHeight = fragmentBaseHeight + fragmentCompanyHeight + projectChromeHeight;
                                    let descriptionEnd = descriptionStart;

                                    while (descriptionEnd < projectDescriptions.length) {
                                        const descriptionHeight = measuredExperienceProjectDescriptionHeights.get(
                                            `${index}:${itemStart}:${projectIndex}:${descriptionEnd}`,
                                        ) || 24;
                                        const fitTolerance = descriptionEnd === projectDescriptions.length - 1
                                            ? DESCRIPTION_FIT_TOLERANCE
                                            : 0;
                                        if (descriptionEnd > descriptionStart
                                            && usedHeight + fragmentHeight + descriptionHeight
                                                > availableHeight + fitTolerance) break;
                                        if (descriptionEnd === descriptionStart
                                            && nextPages.at(-1)!.length > 0
                                            && usedHeight + fragmentHeight + descriptionHeight
                                                > availableHeight + fitTolerance) {
                                            startNewPage();
                                        }
                                        fragmentHeight += descriptionHeight;
                                        descriptionEnd += 1;
                                    }

                                    if (projectDescriptions.length === 0
                                        && nextPages.at(-1)!.length > 0
                                        && usedHeight + fragmentHeight > availableHeight) {
                                        startNewPage();
                                    }

                                    const placement: BlockPlacement = {
                                        blockIndex: index,
                                        itemStart,
                                        itemEnd: itemStart + 1,
                                        experienceProjectStart: projectIndex,
                                        experienceProjectEnd: projectIndex + 1,
                                        experienceProjectContinuation: isProjectContinuation,
                                        experienceProjectDescriptionStart: descriptionStart,
                                        experienceProjectDescriptionEnd: descriptionEnd,
                                        experienceProjectHeaderContinuation: projectHeaderPlacedOnPreviousPage
                                            && descriptionStart === 0,
                                        experienceProjectTitleContinuation: projectTitlePlacedOnPreviousPage
                                            && descriptionStart === 0,
                                    };
                                    pushPlacement(placement, fragmentHeight);
                                    companyPending = false;
                                    descriptionStart = descriptionEnd;

                                    if (descriptionStart < projectDescriptions.length) startNewPage();
                                } while (descriptionStart < projectDescriptions.length);
                            });

                            itemStart += 1;
                            continue;
                        }

                        // 한 페이지보다 긴 항목은 항상 bullet 단위로 나눠 배치한다.
                        // 묶기를 끄면 현재 페이지의 남은 공간부터 bullet 단위로 채운다.
                        const itemDoesNotFitPage = baseHeight + itemHeight > availableHeight;
                        if (Array.isArray(descriptions) && descriptions.length > 0
                            && (itemDoesNotFitPage || !keepItemTogether)) {
                            // 묶기가 켜진 항목 자체가 한 페이지보다 길다면 현재 페이지의
                            // 남은 공간을 사용하지 않고 새 페이지에서 항목을 시작한다.
                            if (keepItemTogether && itemDoesNotFitPage && nextPages.at(-1)!.length > 0) {
                                startNewPage();
                            }
                            const itemChromeHeight = measuredItemChromeHeights.get(`${index}:${itemStart}`) || 60;
                            let itemHeaderPlacedOnPreviousPage = false;
                            if (!keepItemTogether && nextPages.at(-1)!.length > 0) {
                                const firstDescriptionHeight = measuredDescriptionHeights.get(
                                    `${index}:${itemStart}:0`,
                                ) || 24;
                                const itemHeaderHeight = baseHeight + itemChromeHeight;
                                if (usedHeight + itemHeaderHeight
                                        <= availableHeight + ITEM_HEADER_FIT_TOLERANCE
                                    && usedHeight + itemHeaderHeight + firstDescriptionHeight > availableHeight) {
                                    pushPlacement({
                                        blockIndex: index,
                                        itemStart,
                                        itemEnd: itemStart + 1,
                                        descriptionStart: 0,
                                        descriptionEnd: 0,
                                        itemHeaderOnly: true,
                                    }, itemHeaderHeight);
                                    itemHeaderPlacedOnPreviousPage = true;
                                    startNewPage();
                                }
                            }
                            let descriptionStart = 0;

                            while (descriptionStart < descriptions.length) {
                                const isContinuationFragment = descriptionStart > 0
                                    || itemHeaderPlacedOnPreviousPage;
                                const fragmentBaseHeight = isContinuationFragment
                                    ? (measuredContinuationBaseHeights.get(index) || 40)
                                    : baseHeight;
                                const fragmentChromeHeight = isContinuationFragment
                                    ? (measuredContinuationItemChromeHeights.get(`${index}:${itemStart}`) || 8)
                                    : itemChromeHeight;
                                let fragmentHeight = fragmentBaseHeight + fragmentChromeHeight;
                                let descriptionEnd = descriptionStart;

                                while (descriptionEnd < descriptions.length) {
                                    const descriptionHeight = measuredDescriptionHeights.get(
                                        `${index}:${itemStart}:${descriptionEnd}`
                                    ) || 24;
                                    const fitTolerance = descriptionEnd === descriptions.length - 1
                                        ? DESCRIPTION_FIT_TOLERANCE
                                        : 0;
                                    if (descriptionEnd > descriptionStart
                                        && usedHeight + fragmentHeight + descriptionHeight
                                            > availableHeight + fitTolerance) break;
                                    if (descriptionEnd === descriptionStart && nextPages.at(-1)!.length > 0
                                        && usedHeight + fragmentHeight + descriptionHeight
                                            > availableHeight + fitTolerance) {
                                        startNewPage();
                                    }
                                    fragmentHeight += descriptionHeight;
                                    descriptionEnd += 1;
                                }

                                const fragmentDescriptionCount = descriptionEnd - descriptionStart;
                                const remainingDescriptionCount = descriptions.length - descriptionEnd;

                                // 페이지 하단에 불릿 하나만 고립되면 프로젝트 조각 전체를
                                // 다음 페이지로 보내 한 줄짜리 조각 카드가 생기지 않게 한다.
                                if (keepItemTogether
                                    && fragmentDescriptionCount === 1
                                    && remainingDescriptionCount > 0
                                    && nextPages.at(-1)!.length > 0) {
                                    startNewPage();
                                    continue;
                                }

                                // 마지막 불릿 하나만 다음 페이지에 남는 경우에는 현재 조각의
                                // 마지막 불릿도 함께 넘겨 continuation에 최소 두 줄을 유지한다.
                                if (keepItemTogether
                                    && remainingDescriptionCount === 1
                                    && fragmentDescriptionCount > 1) {
                                    descriptionEnd -= 1;
                                    fragmentHeight -= measuredDescriptionHeights.get(
                                        `${index}:${itemStart}:${descriptionEnd}`
                                    ) || 24;
                                }

                                nextPages.at(-1)!.push({
                                    blockIndex: index,
                                    itemStart,
                                    itemEnd: itemStart + 1,
                                    descriptionStart,
                                    descriptionEnd,
                                    itemHeaderContinuation: itemHeaderPlacedOnPreviousPage
                                        && descriptionStart === 0,
                                });
                                usedHeight += fragmentHeight;
                                descriptionStart = descriptionEnd;
                                if (descriptionStart < descriptions.length) startNewPage();
                            }

                            itemStart += 1;
                            continue;
                        }

                        const flowFitTolerance = block.type === "education" && !keepItemTogether
                            ? EDUCATION_ITEM_FIT_TOLERANCE
                            : 0;
                        if (nextPages.at(-1)!.length > 0
                            && usedHeight + baseHeight > availableHeight + flowFitTolerance) startNewPage();

                        let sliceHeight = baseHeight;
                        let itemEnd = itemStart;
                        while (itemEnd < itemCount) {
                            const itemHeight = measuredItemHeights.get(`${index}:${itemEnd}`) || 80;
                            const interItemGap = block.type === "project" && itemEnd > itemStart
                                ? PROJECT_ITEM_GAP
                                : 0;
                            if (itemEnd > itemStart && usedHeight + sliceHeight + interItemGap + itemHeight > availableHeight) break;
                            if (itemEnd === itemStart && nextPages.at(-1)!.length > 0
                                && usedHeight + sliceHeight + itemHeight
                                    > availableHeight + flowFitTolerance) {
                                startNewPage();
                            }
                            sliceHeight += interItemGap + itemHeight;
                            itemEnd += 1;
                        }

                        nextPages.at(-1)!.push({ blockIndex: index, itemStart, itemEnd });
                        usedHeight += sliceHeight;
                        itemStart = itemEnd;
                        if (itemStart < itemCount) startNewPage();
                    }
                    return;
                }

                const blockHeight = measuredBlockHeights.get(index) || 0;
                if (nextPages.at(-1)!.length > 0 && usedHeight + blockHeight > availableHeight) startNewPage();
                nextPages.at(-1)!.push({ blockIndex: index });
                usedHeight += blockHeight;
            });

            const nextSignature = JSON.stringify(nextPages);
            if (paginationFrameRef.current !== null) cancelAnimationFrame(paginationFrameRef.current);
            paginationFrameRef.current = requestAnimationFrame(() => {
                paginationFrameRef.current = null;
                if (disposed) return;
                setPagePlacements((current) => {
                    if (JSON.stringify(current) === nextSignature) return current;

                    // 페이지 재배치 자체가 ResizeObserver를 다시 깨우면, 분할 전후의
                    // 서로 다른 높이를 번갈아 측정하며 두 배치가 무한 반복될 수 있다.
                    // 실제 콘텐츠/스타일 변경은 effect 의존성으로 다시 측정하므로,
                    // 배치를 적용하기 직전에 현재 측정 observer를 종료한다.
                    observer?.disconnect();
                    return nextPages;
                });
            });
        };

        repaginate();
        observer = new ResizeObserver(repaginate);
        canvas.querySelectorAll<HTMLElement>("[data-resume-block-index]").forEach((element) => observer.observe(element));
        document.fonts.ready.then(repaginate);

        return () => {
            disposed = true;
            observer?.disconnect();
            if (paginationFrameRef.current !== null) {
                cancelAnimationFrame(paginationFrameRef.current);
                paginationFrameRef.current = null;
            }
        };
    }, [
        blocks,
        globalStyle?.contentWidth,
        globalStyle?.displayTitleFontSize,
        globalStyle?.sectionTitleFontSize,
        globalStyle?.itemTitleFontSize,
        globalStyle?.bodyFontSize,
        globalStyle?.captionFontSize,
        globalStyle?.blockGap,
        globalStyle?.projectDividerGap,
        // Fast Refresh 중에도 dependency 배열 길이를 유지하되,
        // pagePlacements 변경으로 측정 effect가 재실행되지는 않게 한다.
        canvasRef,
        paperPadding,
        templateType,
    ]);

    // 단일 블록 렌더러 함수
    const renderBlockContent = (block: ResumeBlock, placement: BlockPlacement) => {
        const isDescriptionContinuation = (placement.descriptionStart ?? 0) > 0
            || placement.itemHeaderContinuation === true;
        const isExperienceProjectDescriptionContinuation = (placement.experienceProjectDescriptionStart ?? 0) > 0
            || placement.experienceProjectHeaderContinuation === true;
        const isExperienceProjectTitleContinuation = placement.experienceProjectTitleContinuation === true;
        const isExperienceProjectContinuation = (placement.experienceProjectStart ?? 0) > 0
            || placement.experienceProjectContinuation === true
            || isExperienceProjectDescriptionContinuation
            || isExperienceProjectTitleContinuation;
        const isBlockContinuation = (placement.itemStart ?? 0) > 0
            || isDescriptionContinuation
            || isExperienceProjectContinuation;
        switch (block.type) {
            case "profile": {
                const profileContacts = getProfileContacts(block.data as ProfileData);
                const visibleProfileContacts = profileContacts.filter((contact) => (
                    contact.label.trim() || contact.value.trim()
                ));
                const placeholderContactId = "profile-contact-placeholder";
                const displayedProfileContacts = visibleProfileContacts.length > 0
                    ? visibleProfileContacts
                    : [{ id: placeholderContactId, label: "", value: "", inlineWithPrevious: false }];
                const updateDisplayedProfileContact = (
                    contactId: string,
                    field: "label" | "value",
                    value: string,
                ) => {
                    const nextContacts = contactId === placeholderContactId
                        ? [{ id: `contact-${Date.now()}`, label: "", value: "", [field]: value }]
                        : profileContacts.map((item) => (
                            item.id === contactId ? { ...item, [field]: value } : item
                        ));
                    updateBlockData(
                        block.id,
                        withProfileContacts(block.data as ProfileData, nextContacts),
                    );
                };
                const showProfilePhoto = block.data.showPhoto !== false;
                const profileContactRows = displayedProfileContacts.reduce<typeof displayedProfileContacts[]>((rows, contact) => {
                    if (contact.inlineWithPrevious && rows.length > 0) {
                        rows[rows.length - 1].push(contact);
                    } else {
                        rows.push([contact]);
                    }
                    return rows;
                }, []);
                if (templateType === "modern") {
                    const highlights = Array.isArray(block.data.highlights) ? block.data.highlights : [];
                    const displayedHighlights = highlights.length > 0 ? highlights : [""];
                    const introductionStyle = block.data.introductionStyle || "bullets";
                    return (
                        <div className="resume-profile-hero">
                            <div className={`resume-profile-main${showProfilePhoto ? "" : " resume-profile-main--no-photo"}`}>
                                {showProfilePhoto && (
                                    <button
                                        type="button"
                                        className="resume-profile-photo resume-profile-photo-picker"
                                        aria-label="프로필 사진 관리"
                                        aria-haspopup="menu"
                                        aria-expanded={profilePhotoMenu?.blockId === block.id}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            const rect = event.currentTarget.getBoundingClientRect();
                                            openProfilePhotoMenu(block.id, rect.left, rect.bottom + 6);
                                        }}
                                        onContextMenu={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            openProfilePhotoMenu(block.id, event.clientX, event.clientY);
                                        }}
                                        onDragStart={(event) => event.preventDefault()}
                                    >
                                        {block.data.photo ? (
                                            <img src={block.data.photo} alt="프로필" />
                                        ) : (
                                            <span>{String(block.data.name || "?").slice(0, 1)}</span>
                                        )}
                                        <span className="resume-profile-photo-picker__overlay no-print" aria-hidden="true">
                                            사진 관리
                                        </span>
                                    </button>
                                )}
                                <div className="resume-profile-copy">
                                    <RichTextEditable
                                        html={block.data.bioHtml || escapeHtml(block.data.bio || "")}
                                        readOnly={readOnly}
                                        placeholder="강점, 태도, 역할 중심의 한 줄 수식어"
                                        onChange={(bioHtml) => updateBlockData(block.id, {
                                            ...block.data,
                                            bio: richTextToPlainText(bioHtml),
                                            bioHtml,
                                        })}
                                        className="resume-profile-tagline"
                                    />
                                    <div className="resume-profile-headline">
                                        <EditableText
                                            tag="span"
                                            value={block.data.role || ""}
                                            placeholder="개발자"
                                            onChange={(role) => updateBlockData(block.id, { ...block.data, role })}
                                            className="resume-profile-role"
                                        />
                                        <EditableText
                                            tag="h1"
                                            value={block.data.name || ""}
                                            placeholder="이름"
                                            onChange={(name) => updateBlockData(block.id, { ...block.data, name })}
                                            className="resume-profile-name"
                                        />
                                        <span className="resume-profile-suffix">입니다.</span>
                                    </div>
                                    <div className="resume-profile-contacts">
                                        <strong>Contacts</strong>
                                        <div className="resume-contact-list">
                                            {profileContactRows.map((row) => (
                                                <div key={row.map((contact) => contact.id).join("-")} className="resume-contact-line">
                                                    {row.map((contact) => (
                                                        <span key={contact.id} className="resume-contact-row">
                                                            <b>▸</b>
                                                            <span className="resume-contact-label">
                                                                <EditableText
                                                                    value={contact.label}
                                                                    placeholder="연락처 항목"
                                                                    onChange={(label) => updateDisplayedProfileContact(contact.id, "label", label)}
                                                                />
                                                                <span> :</span>
                                                            </span>
                                                            <EditableText
                                                                value={contact.value}
                                                                placeholder="내용 또는 URL"
                                                                className={/^https?:\/\//i.test(contact.value) ? "resume-contact-link" : ""}
                                                                onChange={(value) => updateDisplayedProfileContact(contact.id, "value", value)}
                                                            />
                                                        </span>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {(!readOnly || highlights.length > 0) && introductionStyle === "bullets" && (
                                <ul className="resume-profile-highlights">
                                    {displayedHighlights.map((highlight: string, index: number) => (
                                        <li key={index}>
                                            <RichTextEditable
                                                html={block.data.highlightsHtml?.[index] || escapeHtml(highlight)}
                                                readOnly={readOnly}
                                                placeholder="핵심 경험이나 강점을 입력하세요"
                                                className="resume-rich-bullet"
                                                onChange={(highlightHtml) => {
                                                    const updated = [...displayedHighlights];
                                                    const highlightsHtml = [...(block.data.highlightsHtml || [])];
                                                    updated[index] = richTextToPlainText(highlightHtml);
                                                    highlightsHtml[index] = highlightHtml;
                                                    updateBlockData(block.id, { ...block.data, highlights: updated, highlightsHtml });
                                                }}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {(!readOnly || highlights.length > 0) && introductionStyle === "paragraph" && (
                                <RichTextEditable
                                    html={(block.data.highlightsHtml || highlights.map(escapeHtml)).join("<br>")}
                                    readOnly={readOnly}
                                    placeholder="자기소개를 입력하세요"
                                    className="resume-profile-introduction"
                                    onChange={(html) => {
                                        const highlightsHtml = splitInlineRichTextLines(html);
                                        updateBlockData(block.id, {
                                            ...block.data,
                                            highlights: highlightsHtml.map(richTextToPlainText),
                                            highlightsHtml,
                                        });
                                    }}
                                />
                            )}
                        </div>
                    );
                }
                return (
                    <div className="space-y-2">
                        <div className="flex justify-between items-baseline gap-4">
                            <EditableText
                                tag="h1"
                                value={block.data.name || ""}
                                placeholder="이름을 입력하세요"
                                onChange={(newName) => updateBlockData(block.id, { ...block.data, name: newName })}
                                className="text-3xl font-black tracking-tight text-neutral-900"
                            />
                            <EditableText
                                tag="span"
                                value={block.data.role || ""}
                                placeholder="직무"
                                onChange={(newRole) => updateBlockData(block.id, { ...block.data, role: newRole })}
                                style={{ color: primaryColor }}
                                className="text-sm font-bold tracking-tight text-right whitespace-nowrap"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-medium">
                            {displayedProfileContacts.map((contact, index) => (
                                <span key={contact.id} className="inline-flex items-center gap-2">
                                    {index > 0 && <span>|</span>}
                                    <EditableText
                                        value={contact.label}
                                        placeholder="연락처 항목"
                                        onChange={(label) => updateDisplayedProfileContact(contact.id, "label", label)}
                                    />
                                    <span>:</span>
                                    <EditableText
                                        value={contact.value}
                                        placeholder="내용 또는 URL"
                                        onChange={(value) => updateDisplayedProfileContact(contact.id, "value", value)}
                                    />
                                </span>
                            ))}
                        </div>
                        <div className="pt-2 border-t border-neutral-200/50 mt-2">
                            <RichTextEditable
                                html={block.data.bioHtml || escapeHtml(block.data.bio || "")}
                                readOnly={readOnly}
                                placeholder="자신을 소개하는 간단한 한 줄 소개를 적어보세요."
                                onChange={(bioHtml) => updateBlockData(block.id, {
                                    ...block.data,
                                    bio: richTextToPlainText(bioHtml),
                                    bioHtml,
                                })}
                                className="text-sm text-neutral-700 leading-relaxed block"
                            />
                        </div>
                    </div>
                );
            }

            case "experience":
                return (
                    <div className="resume-section">
                        {!isBlockContinuation && <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 tracking-wider">
                                <EditableText
                                    value={formatBlockTitle(block.title)}
                                    appearance="plain"
                                    placeholder="경력"
                                    onChange={(title) => updateBlockTitle(block.id, formatBlockTitle(title))}
                                />
                            </h2>
                        </div>}
                        {Array.isArray(block.data) && block.data.length > 0 ? (
                            <div className="space-y-3 pt-1">
                                {block.data
                                    .slice(placement.itemStart ?? 0, placement.itemEnd ?? block.data.length)
                                    .map((exp: any, localIndex: number) => {
                                        const expIndex = (placement.itemStart ?? 0) + localIndex;
                                        const experienceProjects = Array.isArray(exp.projects) ? exp.projects : [];
                                        const placeholderProjectId = `experience-project-placeholder-${exp.id}`;
                                        const visibleExperienceProjects = experienceProjects.length > 0
                                            ? experienceProjects
                                            : readOnly
                                                ? []
                                                : [{
                                                    id: placeholderProjectId,
                                                    title: "",
                                                    role: "",
                                                    startDate: "",
                                                    endDate: "",
                                                    description: [""],
                                                    descriptionLevels: [1],
                                                    descriptionHtml: [""],
                                                }];
                                        const updateExperienceProject = (
                                            project: any,
                                            projectIndex: number,
                                            patch: Record<string, unknown>,
                                        ) => {
                                            const updated = [...block.data];
                                            const projects = [...experienceProjects];
                                            if (project.id === placeholderProjectId) {
                                                projects.push({
                                                    id: `exp-project-${Date.now()}`,
                                                    title: "",
                                                    role: "",
                                                    startDate: "",
                                                    endDate: "",
                                                    description: [""],
                                                    descriptionLevels: [1],
                                                    descriptionHtml: [""],
                                                    ...patch,
                                                });
                                            } else {
                                                projects[projectIndex] = { ...project, ...patch };
                                            }
                                            updated[expIndex] = { ...exp, projects };
                                            updateBlockData(block.id, updated);
                                        };
                                        return (
                                            <div
                                                key={exp.id}
                                                data-pagination-item-index={expIndex}
                                                data-resume-child-id={exp.id}
                                                className="resume-experience-item space-y-1"
                                            >
                                                {!isDescriptionContinuation && !isExperienceProjectContinuation && <div className="resume-experience-company-header">
                                                    <div className="resume-experience-company-identity">
                                                        <EditableText
                                                            tag="span"
                                                            value={exp.company}
                                                            placeholder="회사명"
                                                            onChange={(newCompany) => {
                                                                const updated = [...block.data];
                                                                updated[expIndex] = { ...exp, company: newCompany };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                            className="resume-item-title font-bold text-neutral-900 text-sm"
                                                        />
                                                        <EditableText
                                                            tag="span"
                                                            value={exp.role}
                                                            placeholder="직책 및 역할"
                                                            onChange={(newRole) => {
                                                                const updated = [...block.data];
                                                                updated[expIndex] = { ...exp, role: newRole };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                            className="resume-experience-company-role"
                                                        />
                                                    </div>
                                                </div>}
                                                {!isDescriptionContinuation && !isExperienceProjectContinuation && (
                                                    <ul className="resume-experience-period">
                                                        <li data-bullet-level="2">
                                                            <EditableText
                                                                value={exp.startDate}
                                                                width="short"
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
                                                                width="short"
                                                                placeholder="종료일"
                                                                onChange={(newDate) => {
                                                                    const updated = [...block.data];
                                                                    updated[expIndex] = { ...exp, endDate: newDate };
                                                                    updateBlockData(block.id, updated);
                                                                }}
                                                            />
                                                        </li>
                                                        {(exp.secondStartDate !== undefined || exp.secondEndDate !== undefined) && (
                                                            <li
                                                                data-bullet-level="2"
                                                                className="resume-experience-period__secondary"
                                                                data-empty={!exp.secondStartDate && !exp.secondEndDate ? "true" : undefined}
                                                            >
                                                                <EditableText
                                                                    value={exp.secondStartDate || ""}
                                                                    width="short"
                                                                    placeholder="추가 시작일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[expIndex] = { ...exp, secondStartDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                                <span>~</span>
                                                                <EditableText
                                                                    value={exp.secondEndDate || ""}
                                                                    width="short"
                                                                    placeholder="추가 종료일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[expIndex] = { ...exp, secondEndDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                            </li>
                                                        )}
                                                    </ul>
                                                )}
                                                {!isExperienceProjectContinuation && (() => {
                                                    const descriptionStart = placement.descriptionStart ?? 0;
                                                    const visibleDescriptions = (exp.description || []).slice(
                                                        descriptionStart,
                                                        placement.descriptionEnd ?? exp.description.length,
                                                    );
                                                    if (visibleDescriptions.length === 0) return null;

                                                    if ((exp.descriptionStyle || "bullets") === "paragraph") {
                                                        return (
                                                            <RichTextEditable
                                                                html={visibleDescriptions.map((description: string, localIndex: number) => (
                                                                    exp.descriptionHtml?.[descriptionStart + localIndex] || escapeHtml(description)
                                                                )).join("<br>")}
                                                                readOnly={readOnly}
                                                                placeholder="회사 소개 및 주요 성과"
                                                                className="resume-experience-company-description resume-experience-company-description--paragraph"
                                                                onChange={(html) => {
                                                                    const changedHtml = splitInlineRichTextLines(html);
                                                                    const updated = [...block.data];
                                                                    const newDescriptions = [...(exp.description || [])];
                                                                    const newDescriptionHtml = [...(exp.descriptionHtml || [])];
                                                                    newDescriptions.splice(
                                                                        descriptionStart,
                                                                        visibleDescriptions.length,
                                                                        ...changedHtml.map(richTextToPlainText),
                                                                    );
                                                                    newDescriptionHtml.splice(
                                                                        descriptionStart,
                                                                        visibleDescriptions.length,
                                                                        ...changedHtml,
                                                                    );
                                                                    updated[expIndex] = {
                                                                        ...exp,
                                                                        description: newDescriptions,
                                                                        descriptionHtml: newDescriptionHtml,
                                                                    };
                                                                    updateBlockData(block.id, updated);
                                                                }}
                                                            />
                                                        );
                                                    }

                                                    return (
                                                        <ul className="resume-experience-company-description resume-experience-company-description--bullets">
                                                            {visibleDescriptions.map((desc: string, localDescriptionIndex: number) => {
                                                                const i = descriptionStart + localDescriptionIndex;
                                                                return (
                                                                    <li key={i} data-pagination-description-index={i}>
                                                                        <RichTextEditable
                                                                            html={exp.descriptionHtml?.[i] || escapeHtml(desc)}
                                                                            readOnly={readOnly}
                                                                            placeholder="성과 및 업무 내용"
                                                                            className="resume-rich-bullet"
                                                                            onChange={(descriptionHtml) => {
                                                                                const updated = [...block.data];
                                                                                const newDescriptions = [...exp.description];
                                                                                const nextDescriptionHtml = [...(exp.descriptionHtml || [])];
                                                                                newDescriptions[i] = richTextToPlainText(descriptionHtml);
                                                                                nextDescriptionHtml[i] = descriptionHtml;
                                                                                updated[expIndex] = {
                                                                                    ...exp,
                                                                                    description: newDescriptions,
                                                                                    descriptionHtml: nextDescriptionHtml,
                                                                                };
                                                                                updateBlockData(block.id, updated);
                                                                            }}
                                                                        />
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    );
                                                })()}
                                                {!isDescriptionContinuation
                                                    && !placement.experienceCompanyOnly
                                                    && visibleExperienceProjects.length > 0 && (
                                                    <div className="resume-experience-projects">
                                                        {visibleExperienceProjects
                                                            .slice(
                                                                placement.experienceProjectStart ?? 0,
                                                                placement.experienceProjectEnd ?? visibleExperienceProjects.length,
                                                            )
                                                            .map((project: any, localProjectIndex: number) => {
                                                                const projectIndex = (placement.experienceProjectStart ?? 0) + localProjectIndex;
                                                                const projectDescriptions = Array.isArray(project.description)
                                                                    ? project.description
                                                                    : [];
                                                                const projectDescriptionStart = placement.experienceProjectDescriptionStart ?? 0;
                                                                const projectDescriptionEnd = placement.experienceProjectDescriptionEnd ?? projectDescriptions.length;
                                                                const visibleProjectDescriptions = projectDescriptions.length > 0
                                                                    ? projectDescriptions.slice(projectDescriptionStart, projectDescriptionEnd)
                                                                    : readOnly
                                                                        ? []
                                                                        : [""];
                                                                return <div
                                                                    key={project.id}
                                                                    data-experience-project-index={projectIndex}
                                                                    data-experience-project-description-continuation={
                                                                        isExperienceProjectDescriptionContinuation
                                                                        || isExperienceProjectTitleContinuation
                                                                    }
                                                                    data-resume-sub-child-id={project.id === placeholderProjectId ? undefined : project.id}
                                                                    className="resume-experience-project"
                                                                >
                                                                    {!isExperienceProjectDescriptionContinuation
                                                                        && !isExperienceProjectTitleContinuation
                                                                        && <div className="resume-experience-project__header">
                                                                        <div className="flex min-w-0 items-center gap-2">
                                                                            <span style={{ backgroundColor: primaryColor }} className="h-1.5 w-1.5 shrink-0" />
                                                                            <EditableText
                                                                                tag="span"
                                                                                value={project.title}
                                                                                placeholder="프로젝트명"
                                                                                onChange={(title) => {
                                                                                    updateExperienceProject(project, projectIndex, { title });
                                                                                }}
                                                                                className="resume-item-title font-bold text-neutral-900"
                                                                            />
                                                                        </div>
                                                                        {(project.startDate || project.endDate) && (
                                                                            <div className="flex shrink-0 items-center gap-1 text-xs text-neutral-500">
                                                                                {project.startDate && <EditableText
                                                                                    value={project.startDate}
                                                                                    width="short"
                                                                                    onChange={(startDate) => {
                                                                                        const updated = [...block.data];
                                                                                        const projects = [...exp.projects];
                                                                                        projects[projectIndex] = { ...project, startDate };
                                                                                        updated[expIndex] = { ...exp, projects };
                                                                                        updateBlockData(block.id, updated);
                                                                                    }}
                                                                                />}
                                                                                {project.startDate && project.endDate && <span>~</span>}
                                                                                {project.endDate && <EditableText
                                                                                    value={project.endDate}
                                                                                    width="short"
                                                                                    onChange={(endDate) => {
                                                                                        const updated = [...block.data];
                                                                                        const projects = [...exp.projects];
                                                                                        projects[projectIndex] = { ...project, endDate };
                                                                                        updated[expIndex] = { ...exp, projects };
                                                                                        updateBlockData(block.id, updated);
                                                                                    }}
                                                                                />}
                                                                            </div>
                                                                        )}
                                                                    </div>}
                                                                    {!isExperienceProjectDescriptionContinuation
                                                                        && !placement.experienceProjectTitleOnly
                                                                        && <EditableText
                                                                        tag="div"
                                                                        value={project.role}
                                                                        width="full"
                                                                        placeholder="프로젝트 소개 및 역할"
                                                                        onChange={(role) => {
                                                                            updateExperienceProject(project, projectIndex, { role });
                                                                        }}
                                                                        className="resume-experience-project__summary"
                                                                    />}
                                                                    {!placement.experienceProjectHeaderOnly
                                                                        && !placement.experienceProjectTitleOnly
                                                                        && <ProjectBulletDocumentEditor
                                                                        variant="resume"
                                                                        readOnly={readOnly}
                                                                        descriptions={visibleProjectDescriptions}
                                                                        levels={(project.descriptionLevels || []).slice(projectDescriptionStart, projectDescriptionEnd)}
                                                                        html={(project.descriptionHtml || []).slice(projectDescriptionStart, projectDescriptionEnd)}
                                                                        descriptionStart={projectDescriptionStart}
                                                                        placeholder="프로젝트 기여와 성과"
                                                                        ariaLabel="프로젝트 기여와 성과"
                                                                        className="resume-project-contributions"
                                                                        onChange={(descriptions, descriptionLevels, descriptionHtml) => {
                                                                            const visibleDescriptionCount = projectDescriptionEnd - projectDescriptionStart;
                                                                            const nextDescriptions = [...projectDescriptions];
                                                                            const nextLevels = [...(project.descriptionLevels || [])];
                                                                            const nextHtml = [...(project.descriptionHtml || [])];
                                                                            nextDescriptions.splice(projectDescriptionStart, visibleDescriptionCount, ...descriptions);
                                                                            nextLevels.splice(projectDescriptionStart, visibleDescriptionCount, ...descriptionLevels);
                                                                            nextHtml.splice(projectDescriptionStart, visibleDescriptionCount, ...descriptionHtml);
                                                                            updateExperienceProject(project, projectIndex, {
                                                                                description: nextDescriptions,
                                                                                descriptionLevels: nextLevels,
                                                                                descriptionHtml: nextHtml,
                                                                            });
                                                                        }}
                                                                    />}
                                                                </div>;
                                                            })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <p className="text-xs text-neutral-400 italic">경력 항목을 추가해 주세요.</p>
                        )}
                    </div>
                );

            case "project":
                return (
                    <div className="resume-section">
                        {!isBlockContinuation && <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 tracking-wider">
                                <EditableText
                                    value={formatBlockTitle(block.title || "Projects")}
                                    appearance="plain"
                                    placeholder="프로젝트"
                                    onChange={(title) => updateBlockTitle(block.id, formatBlockTitle(title))}
                                />
                            </h2>
                        </div>}
                        {Array.isArray(block.data) && block.data.length > 0 ? (
                            <div className="resume-project-list pt-1">
                                {block.data
                                    .slice(placement.itemStart ?? 0, placement.itemEnd ?? block.data.length)
                                    .map((proj: any, localIndex: number) => {
                                        const projIndex = (placement.itemStart ?? 0) + localIndex;
                                        return (
                                            <div
                                                key={proj.id}
                                                data-pagination-item-index={projIndex}
                                                data-resume-child-id={proj.id}
                                                className={`resume-project-item space-y-1 ${localIndex > 0 ? "resume-project-item--separated" : ""}`}
                                            >
                                                {!isDescriptionContinuation && <div className="resume-project-header flex justify-between items-baseline gap-2">
                                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                                        <EditableText
                                                            tag="span"
                                                            value={proj.title}
                                                            placeholder="프로젝트명"
                                                            onChange={(newTitle) => {
                                                                const updated = [...block.data];
                                                                updated[projIndex] = { ...proj, title: newTitle };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                            className="resume-item-title font-bold text-neutral-900 text-sm"
                                                        />
                                                        {proj.link && (
                                                            <a href={proj.link} target="_blank" rel="noreferrer" style={{ color: primaryColor }} className="text-xs hover:underline">
                                                                링크 ↗
                                                            </a>
                                                        )}
                                                    </div>
                                                    {(proj.startDate || proj.endDate) && (
                                                        <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                                                            {proj.startDate && <EditableText
                                                                value={proj.startDate}
                                                                width="short"
                                                                onChange={(newDate) => {
                                                                    const updated = [...block.data];
                                                                    updated[projIndex] = { ...proj, startDate: newDate };
                                                                    updateBlockData(block.id, updated);
                                                                }}
                                                            />}
                                                            {proj.startDate && proj.endDate && <span>~</span>}
                                                            {proj.endDate && <EditableText
                                                                value={proj.endDate}
                                                                width="short"
                                                                onChange={(newDate) => {
                                                                    const updated = [...block.data];
                                                                    updated[projIndex] = { ...proj, endDate: newDate };
                                                                    updateBlockData(block.id, updated);
                                                                }}
                                                            />}
                                                        </div>
                                                    )}
                                                </div>}
                                                {!isDescriptionContinuation && <EditableText
                                                    tag="div"
                                                    value={proj.role}
                                                    width="full"
                                                    placeholder="프로젝트 역할"
                                                    onChange={(newRole) => {
                                                        const updated = [...block.data];
                                                        updated[projIndex] = { ...proj, role: newRole };
                                                        updateBlockData(block.id, updated);
                                                    }}
                                                    className="resume-project-summary text-xs text-neutral-500"
                                                />}
                                                <ProjectBulletDocumentEditor
                                                    variant="resume"
                                                    readOnly={readOnly}
                                                    descriptions={(proj.description || []).slice(
                                                        placement.descriptionStart ?? 0,
                                                        placement.descriptionEnd ?? proj.description.length,
                                                    )}
                                                    levels={(proj.descriptionLevels || []).slice(
                                                        placement.descriptionStart ?? 0,
                                                        placement.descriptionEnd ?? proj.description.length,
                                                    )}
                                                    html={(proj.descriptionHtml || []).slice(
                                                        placement.descriptionStart ?? 0,
                                                        placement.descriptionEnd ?? proj.description.length,
                                                    )}
                                                    descriptionStart={placement.descriptionStart ?? 0}
                                                    placeholder="프로젝트 기여와 성과"
                                                    ariaLabel="프로젝트 성과"
                                                    className="resume-project-contributions"
                                                    onChange={(descriptions, descriptionLevels, descriptionHtml) => {
                                                        const descriptionStart = placement.descriptionStart ?? 0;
                                                        const visibleDescriptionCount = (
                                                            placement.descriptionEnd ?? proj.description.length
                                                        ) - descriptionStart;
                                                        const updated = [...block.data];
                                                        const nextDescriptions = [...(proj.description || [])];
                                                        const nextLevels = [...(proj.descriptionLevels || [])];
                                                        const nextHtml = [...(proj.descriptionHtml || [])];
                                                        nextDescriptions.splice(
                                                            descriptionStart,
                                                            visibleDescriptionCount,
                                                            ...descriptions,
                                                        );
                                                        nextLevels.splice(
                                                            descriptionStart,
                                                            visibleDescriptionCount,
                                                            ...descriptionLevels,
                                                        );
                                                        nextHtml.splice(
                                                            descriptionStart,
                                                            visibleDescriptionCount,
                                                            ...descriptionHtml,
                                                        );
                                                        updated[projIndex] = {
                                                            ...proj,
                                                            description: nextDescriptions,
                                                            descriptionLevels: nextLevels,
                                                            descriptionHtml: nextHtml,
                                                        };
                                                        updateBlockData(block.id, updated);
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <p className="text-xs text-neutral-400 italic">우측 인스펙터에서 프로젝트를 추가해 주세요.</p>
                        )}
                    </div>
                );

            case "skills":
                const skillCategories = getSkillCategories(block.data as SkillsData);
                const skillEditorId = (categoryId: string, skillIndex: number | "draft" | "name") => (
                    `skill-${block.id}-${categoryId}-${skillIndex}`
                );
                const focusSkillEditor = (editorId: string) => {
                    window.setTimeout(() => document.getElementById(editorId)?.click(), 0);
                };
                const openSkillDraft = (categoryId: string) => {
                    setActiveSkillDraftCategoryId(categoryId);
                    focusSkillEditor(skillEditorId(categoryId, "draft"));
                };
                const updateCanvasSkillCategories = (categories: typeof skillCategories) => {
                    updateBlockData(
                        block.id,
                        withSkillCategories(block.data as SkillsData, categories),
                    );
                };
                return (
                    <div className="resume-section">
                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 tracking-wider">
                                <EditableText
                                    value={formatBlockTitle(block.title || "Skills")}
                                    appearance="plain"
                                    placeholder="스킬"
                                    onChange={(title) => updateBlockTitle(block.id, formatBlockTitle(title))}
                                />
                            </h2>
                        </div>
                        <div className="resume-skill-categories pt-1">
                            {skillCategories.map((category, categoryIndex) => (
                                <div
                                    key={category.id}
                                    className={`resume-skill-category ${category.name ? "" : "resume-skill-category--unnamed"}`}
                                >
                                    <strong>
                                        <EditableText
                                            editorId={skillEditorId(category.id, "name")}
                                            value={category.name}
                                            appearance="plain"
                                            placeholder="카테고리명"
                                            onChange={(name) => updateCanvasSkillCategories(
                                                skillCategories.map((item, index) => (
                                                    index === categoryIndex ? { ...item, name } : item
                                                )),
                                            )}
                                            onTabNext={() => {
                                                if (category.skills.length > 0) {
                                                    focusSkillEditor(skillEditorId(category.id, 0));
                                                } else {
                                                    openSkillDraft(category.id);
                                                }
                                            }}
                                        />
                                    </strong>
                                    <div className="flex flex-wrap gap-1.5">
                                        {category.skills.map((skill, skillIndex) => (
                                            <span
                                                key={`${category.id}-${skillIndex}`}
                                                className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-900"
                                            >
                                                <EditableText
                                                    editorId={skillEditorId(category.id, skillIndex)}
                                                    value={skill}
                                                    placeholder="기술"
                                                    onChange={(nextSkill) => updateCanvasSkillCategories(
                                                        skillCategories.map((item, index) => (
                                                            index === categoryIndex
                                                                ? {
                                                                    ...item,
                                                                    skills: item.skills.map((currentSkill, currentIndex) => (
                                                                        currentIndex === skillIndex ? nextSkill : currentSkill
                                                                    )),
                                                                }
                                                                : item
                                                        )),
                                                    )}
                                                    onEditEnd={(nextSkill) => {
                                                        if (nextSkill.trim()) return;
                                                        updateCanvasSkillCategories(skillCategories.map((item, index) => (
                                                            index === categoryIndex
                                                                ? {
                                                                    ...item,
                                                                    skills: item.skills.filter((_, currentIndex) => currentIndex !== skillIndex),
                                                                }
                                                                : item
                                                        )));
                                                    }}
                                                    onTabNext={() => {
                                                        if (skillIndex + 1 < category.skills.length) {
                                                            focusSkillEditor(skillEditorId(category.id, skillIndex + 1));
                                                        } else {
                                                            openSkillDraft(category.id);
                                                        }
                                                    }}
                                                />
                                            </span>
                                        ))}
                                        {!readOnly && activeSkillDraftCategoryId === category.id && (
                                            <span
                                                key={`skill-draft-${category.id}-${category.skills.length}`}
                                                className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-900"
                                            >
                                                <EditableText
                                                    editorId={skillEditorId(category.id, "draft")}
                                                    value=""
                                                    placeholder="기술"
                                                    onChange={(skill) => {
                                                        const nextSkill = skill.trim();
                                                        if (!nextSkill) return;
                                                        updateCanvasSkillCategories(skillCategories.map((item, index) => (
                                                            index === categoryIndex
                                                                ? { ...item, skills: [...item.skills, nextSkill] }
                                                                : item
                                                        )));
                                                    }}
                                                    onTabNext={() => focusSkillEditor(skillEditorId(category.id, "draft"))}
                                                    onEditEnd={(skill) => {
                                                        if (!skill.trim()) setActiveSkillDraftCategoryId(null);
                                                    }}
                                                />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case "education":
                return (
                    <div className="resume-section">
                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 tracking-wider">
                                <EditableText
                                    value={formatBlockTitle(block.title || "Education")}
                                    appearance="plain"
                                    placeholder="학력"
                                    onChange={(title) => updateBlockTitle(block.id, formatBlockTitle(title))}
                                />
                            </h2>
                        </div>
                        {Array.isArray(block.data) && block.data.length > 0 ? (
                            <div className="space-y-2 pt-1">
                                {block.data
                                    .slice(placement.itemStart ?? 0, placement.itemEnd ?? block.data.length)
                                    .map((edu: any, localIndex: number) => {
                                        const eduIdx = (placement.itemStart ?? 0) + localIndex;
                                        return (
                                            <div key={edu.id} data-pagination-item-index={eduIdx} className="space-y-0.5">
                                                <div className="flex justify-between items-baseline gap-2">
                                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                                        <EditableText
                                                            tag="span"
                                                            value={edu.school}
                                                            placeholder="학교명"
                                                            onChange={(newSchool) => {
                                                                const updated = [...block.data];
                                                                updated[eduIdx] = { ...edu, school: newSchool };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                            className="resume-item-title font-bold text-neutral-900 text-sm"
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
                                                            className="resume-education-major text-xs font-semibold text-neutral-700"
                                                        />
                                                    </div>
                                                    <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                                                        <EditableText
                                                            value={edu.startDate}
                                                            width="short"
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
                                                            width="short"
                                                            placeholder="졸업일"
                                                            onChange={(newDate) => {
                                                                const updated = [...block.data];
                                                                updated[eduIdx] = { ...edu, endDate: newDate };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                        />
                                                        {edu.status && <span className="text-neutral-400">({edu.status})</span>}
                                                    </div>
                                                </div>
                                                {edu.score && <p className="text-xs text-neutral-500">학점: {edu.score}</p>}
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <p className="text-xs text-neutral-400 italic">학력 정보를 추가해 주세요.</p>
                        )}
                    </div>
                );

            case "certification":
                return (
                    <div className="resume-section resume-other-experience">
                        {!isBlockContinuation && <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 tracking-wider">
                                <EditableText
                                    value={formatBlockTitle(block.title === "CERTIFICATIONS & AWARDS" ? "Other Experience" : (block.title || "Other Experience"))}
                                    appearance="plain"
                                    placeholder="Other Experience"
                                    onChange={(title) => updateBlockTitle(block.id, formatBlockTitle(title))}
                                />
                            </h2>
                        </div>}
                        {Array.isArray(block.data) && block.data.length > 0 ? (
                            <div className="resume-other-experience__list">
                                {block.data
                                    .slice(placement.itemStart ?? 0, placement.itemEnd ?? block.data.length)
                                    .map((cert: any, localIndex: number) => {
                                        const certIdx = (placement.itemStart ?? 0) + localIndex;
                                        const descriptions = Array.isArray(cert.description)
                                            ? cert.description
                                            : cert.description
                                                ? [cert.description]
                                                : cert.issuer
                                                    ? [cert.issuer]
                                                    : [""];
                                        const descriptionStart = placement.descriptionStart ?? 0;
                                        const visibleDescriptions = descriptions.slice(
                                            descriptionStart,
                                            placement.descriptionEnd ?? descriptions.length,
                                        );
                                        const legacyDateParts = String(cert.date || "").split(/\s*~\s*/);
                                        const startDate = cert.startDate ?? legacyDateParts[0] ?? "";
                                        const endDate = cert.endDate ?? legacyDateParts[1] ?? "";
                                        return (
                                            <div
                                                key={cert.id}
                                                data-pagination-item-index={certIdx}
                                                className={`resume-other-experience__item${isDescriptionContinuation ? " resume-other-experience__item--continuation" : ""}`}
                                                style={{
                                                    gridTemplateColumns: isDescriptionContinuation
                                                        ? undefined
                                                        : `minmax(130px, ${block.style.otherExperienceLeftColumnRatio ?? 34}fr) minmax(0, ${100 - (block.style.otherExperienceLeftColumnRatio ?? 34)}fr)`,
                                                }}
                                            >
                                                {!isDescriptionContinuation && <div className="resume-other-experience__summary">
                                                    <div>
                                                        <EditableText
                                                            tag="span"
                                                            value={cert.title}
                                                            placeholder="활동명"
                                                            multiline
                                                            onChange={(newTitle) => {
                                                                const updated = [...block.data];
                                                                updated[certIdx] = { ...cert, title: newTitle };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                            className="resume-item-title resume-other-experience__title whitespace-pre-line font-bold text-neutral-900 text-sm"
                                                        />
                                                        {cert.link && (
                                                            <a
                                                                href={cert.link}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{ color: primaryColor }}
                                                                className="ml-2 inline-block whitespace-nowrap align-baseline text-xs hover:underline"
                                                            >
                                                                링크 ↗
                                                            </a>
                                                        )}
                                                    </div>
                                                    {(startDate || endDate) && (
                                                        <div className="resume-other-experience__date flex items-center gap-1 text-xs font-medium text-neutral-500">
                                                            {startDate && <EditableText
                                                                value={startDate}
                                                                width="short"
                                                                onChange={(newDate) => {
                                                                    const updated = [...block.data];
                                                                    updated[certIdx] = { ...cert, startDate: newDate };
                                                                    updateBlockData(block.id, updated);
                                                                }}
                                                            />}
                                                            {startDate && endDate && <span>~</span>}
                                                            {endDate && <EditableText
                                                                value={endDate}
                                                                width="short"
                                                                onChange={(newDate) => {
                                                                    const updated = [...block.data];
                                                                    updated[certIdx] = { ...cert, endDate: newDate };
                                                                    updateBlockData(block.id, updated);
                                                                }}
                                                            />}
                                                        </div>
                                                    )}
                                                </div>}
                                                <ul className="resume-other-experience__details">
                                                    {visibleDescriptions.map((description: string, localDescriptionIndex: number) => {
                                                        const descriptionIndex = descriptionStart + localDescriptionIndex;
                                                        const descriptionHtml = cert.descriptionHtml?.[descriptionIndex] || escapeHtml(description);
                                                        return <li key={descriptionIndex} data-pagination-description-index={descriptionIndex}>
                                                            {richTextToPlainText(descriptionHtml).trim() ? (
                                                                <RichTextEditable
                                                                    html={descriptionHtml}
                                                                    readOnly={readOnly}
                                                                    ariaLabel={`기타 경험 성과 ${descriptionIndex + 1}`}
                                                                    className="resume-rich-bullet inline cursor-text rounded-sm outline-none focus:bg-blue-50"
                                                                    onChange={(nextHtml) => {
                                                                        const updated = [...block.data];
                                                                        const nextDescriptions = [...descriptions];
                                                                        const nextDescriptionHtml = Array.isArray(cert.descriptionHtml)
                                                                            ? [...cert.descriptionHtml]
                                                                            : descriptions.map((item: string) => escapeHtml(item));
                                                                        nextDescriptions[descriptionIndex] = richTextToPlainText(nextHtml);
                                                                        nextDescriptionHtml[descriptionIndex] = nextHtml;
                                                                        updated[certIdx] = {
                                                                            ...cert,
                                                                            description: nextDescriptions,
                                                                            descriptionHtml: nextDescriptionHtml,
                                                                        };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                            ) : (
                                                                <EditableText
                                                                    value=""
                                                                    width="full"
                                                                    placeholder="활동 내용과 성과"
                                                                    onChange={(nextDescription) => {
                                                                        const updated = [...block.data];
                                                                        const nextDescriptions = [...descriptions];
                                                                        nextDescriptions[descriptionIndex] = nextDescription;
                                                                        updated[certIdx] = { ...cert, description: nextDescriptions };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                            )}
                                                        </li>;
                                                    })}
                                                </ul>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <p className="text-xs text-neutral-400 italic">기타 경험을 추가해 주세요.</p>
                        )}
                    </div>
                );

            case "custom_text":
                const paragraphs = String(block.data?.content || "").split("\n");
                const paragraphStart = placement.itemStart ?? 0;
                const contentStyle = block.data?.contentStyle || "bullets";
                return (
                    <div className="resume-section">
                        {!isBlockContinuation && <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 tracking-wider">
                                <EditableText
                                    value={formatBlockTitle(block.title)}
                                    appearance="plain"
                                    placeholder="섹션 제목"
                                    onChange={(title) => updateBlockTitle(block.id, formatBlockTitle(title))}
                                />
                            </h2>
                        </div>}
                        <div className="space-y-1 pt-1">
                            {paragraphs
                                .slice(paragraphStart, placement.itemEnd ?? paragraphs.length)
                                .map((paragraph, localIndex) => {
                                    const paragraphIndex = paragraphStart + localIndex;
                                    return (
                                        <div
                                            key={paragraphIndex}
                                            data-pagination-item-index={paragraphIndex}
                                            className={`resume-additional-information__item${contentStyle === "bullets" ? " flex items-start gap-2" : " resume-additional-information__item--paragraph"}`}
                                        >
                                            {contentStyle === "bullets" && <span aria-hidden="true">▪</span>}
                                            <RichTextEditable
                                                html={block.data?.contentHtml?.[paragraphIndex] || escapeHtml(paragraph)}
                                                readOnly={readOnly}
                                                placeholder="내용을 입력하세요..."
                                                onChange={(paragraphHtml) => {
                                                    const updated = [...paragraphs];
                                                    const contentHtml = [...(block.data?.contentHtml || [])];
                                                    updated[paragraphIndex] = richTextToPlainText(paragraphHtml);
                                                    contentHtml[paragraphIndex] = paragraphHtml;
                                                    updateBlockData(block.id, {
                                                        ...block.data,
                                                        content: updated.join("\n"),
                                                        contentHtml,
                                                    });
                                                }}
                                                className="resume-rich-bullet block min-w-0 flex-1 whitespace-pre-line text-xs leading-relaxed text-neutral-700"
                                            />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            <main
                ref={scrollContainerRef}
                onClick={() => setSelectedBlockId(null)}
                onDragOver={handleCanvasDragOver}
                className={`editor-canvas flex-1 bg-[#444444] overflow-auto p-8 flex ${readOnly ? "items-start" : "justify-center"} cursor-default relative${readOnly ? " resume-canvas--readonly" : ""}`}
            >
                <div
                    ref={canvasRef}
                    style={{
                        width: `${globalStyle?.contentWidth || 800}px`,
                        zoom: zoomLevel / 100,
                        marginInline: "auto",
                        transformOrigin: "top center",
                        backfaceVisibility: "hidden",
                    }}
                    className={`resume-canvas-pages items-center gap-10 pb-36${viewMode === "two-page" ? " resume-canvas-pages--two-page" : " flex flex-col"}`}
                >
                    {/* 실제 A4 시트 단위 분할 렌더링 */}
                    {pages.map((page) => (
                        <div key={page.pageIndex} className="resume-page relative flex flex-col items-center">
                            {/* 페이지 상단 번호 표시기 (인쇄 시 제외) */}
                            <div className="no-print w-full flex justify-between items-center mb-2 text-xs text-neutral-400 font-medium">
                                <span className="resume-page-indicator">
                                    <FileText aria-hidden="true" />
                                    <span>A4</span>
                                    <span className="resume-page-indicator__divider" aria-hidden="true" />
                                    <span>Page {page.pageIndex}</span>
                                </span>
                                <span className="resume-page-size">210 × 297 mm</span>
                            </div>

                            {/* 실제 A4 단일 시트 */}
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: `${globalStyle?.contentWidth || 800}px`,
                                    height: `${A4_PAPER_HEIGHT}px`,
                                    minHeight: `${A4_PAPER_HEIGHT}px`,
                                    maxHeight: `${A4_PAPER_HEIGHT}px`,
                                    padding: `${paperPadding}px`,
                                    fontFamily: fontFamily,
                                    ...typographyStyle,
                                }}
                                className={`resume-paper relative bg-white text-neutral-900 shadow-2xl rounded-sm flex flex-col transition-all ${templateType === "modern" ? "reference-template" : ""}`}
                            >
                                {page.blocks.map(({ block, globalIdx, placement }, fragmentIndex) => {
                                    const fragmentKey = `${page.pageIndex}-${block.id}-${placement.itemStart ?? "all"}-${placement.descriptionStart ?? "all"}-${fragmentIndex}`;
                                    const isSelected = selectedBlockId === block.id;
                                    const isBeingDragged = draggedIndex === globalIdx;
                                    const isTargeted = dragOverIndex === globalIdx
                                        && dragOverFragmentKey === fragmentKey
                                        && draggedIndex !== globalIdx;
                                    const isHidden = block.isVisible === false;
                                    const continuesPreviousFragment = page.blocks[fragmentIndex - 1]?.globalIdx === globalIdx;
                                    const continuesNextFragment = page.blocks[fragmentIndex + 1]?.globalIdx === globalIdx;
                                    const isGenericDescriptionContinuation = (placement.descriptionStart ?? 0) > 0
                                        || placement.itemHeaderContinuation === true;

                                    return (
                                        <div
                                            key={fragmentKey}
                                            data-resume-block-index={globalIdx}
                                            data-pagination-placement-key={getPlacementMeasurementKey(globalIdx, placement)}
                                            data-block-type={block.type}
                                            data-description-start={placement.descriptionStart ?? 0}
                                            data-description-continuation={isGenericDescriptionContinuation}
                                            data-experience-project-start={placement.experienceProjectStart ?? 0}
                                            data-experience-project-description-start={placement.experienceProjectDescriptionStart ?? 0}
                                            data-experience-project-continuation={placement.experienceProjectContinuation === true}
                                            data-experience-project-title-only={placement.experienceProjectTitleOnly === true}
                                            data-custom-padding={block.style.useCustomPadding === true}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, globalIdx)}
                                            onDragOver={(e) => handleDragOver(e, globalIdx, fragmentKey)}
                                            onDrop={(e) => handleDrop(e, globalIdx)}
                                            onDragEnd={handleDragEnd}
                                            onPointerDownCapture={(event) => {
                                                const target = event.target as HTMLElement;
                                                if (target.closest(".rich-text-bubble-toolbar")) return;
                                                const child = target.closest<HTMLElement>("[data-resume-child-id]");
                                                const subChild = target.closest<HTMLElement>("[data-resume-sub-child-id]");
                                                setSelectedBlockSelection(
                                                    block.id,
                                                    child?.dataset.resumeChildId ?? null,
                                                    subChild?.dataset.resumeSubChildId ?? null,
                                                );
                                            }}
                                            onFocusCapture={(event) => {
                                                const target = event.target as HTMLElement;
                                                if (target.closest(".rich-text-bubble-toolbar")) return;
                                                const child = target.closest<HTMLElement>("[data-resume-child-id]");
                                                const subChild = target.closest<HTMLElement>("[data-resume-sub-child-id]");
                                                setSelectedBlockSelection(
                                                    block.id,
                                                    child?.dataset.resumeChildId ?? null,
                                                    subChild?.dataset.resumeSubChildId ?? null,
                                                );
                                            }}
                                            style={{
                                                ...(block.style.useCustomPadding
                                                    ? {
                                                        paddingTop: `${block.style.paddingY}px`,
                                                        paddingBottom: `${block.style.paddingY}px`,
                                                    }
                                                    : {}),
                                                marginBottom: continuesNextFragment ? 0 : "var(--resume-block-gap)",
                                            }}
                                            className={`resume-block-item relative cursor-pointer transition-[background-color,border-color,box-shadow,opacity,transform] duration-150 ${templateType === "modern"
                                                ? "bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-6 py-5 mb-4 shadow-xs hover:border-neutral-300 hover:shadow-sm"
                                                : "px-4 mb-2 hover:bg-neutral-50/50 rounded"
                                                } ${isSelected ? "resume-block-selected" : ""
                                                } ${isBeingDragged ? "opacity-30 scale-[0.98] border-dashed border-neutral-400" : ""
                                                } ${isHidden ? "opacity-40 grayscale border-dashed border-neutral-300 block-hidden" : ""
                                                } ${continuesPreviousFragment ? "resume-block-fragment--continues-previous" : ""
                                                } ${continuesNextFragment ? "resume-block-fragment--continues-next" : ""
                                                } group`}
                                        >
                                            {isTargeted && dragOverPosition && (
                                                <div
                                                    className={`resume-drop-indicator resume-drop-indicator--${dragOverPosition}`}
                                                    aria-hidden="true"
                                                />
                                            )}
                                            {isHidden && (
                                                <div className="no-print absolute top-2 right-3 flex items-center gap-1 text-[10px] font-semibold text-neutral-500 bg-neutral-200/80 px-2 py-0.5 rounded-full select-none">
                                                    숨김 블록
                                                </div>
                                            )}

                                            <div
                                                className="no-print absolute -left-7 top-1/2 -translate-y-1/2 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-neutral-700 cursor-grab active:cursor-grabbing p-1 transition"
                                                data-tooltip="끌어서 순서 변경"
                                            >
                                                <GripVertical size={16} />
                                            </div>

                                            {renderBlockContent(block, placement)}

                                            {templateType === "minimal" && block.style.showDivider && (
                                                <hr className="mt-4 border-neutral-200" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {profilePhotoMenu && (
                    <div
                        ref={profilePhotoMenuRef}
                        className="resume-profile-photo-menu no-print"
                        style={{ left: profilePhotoMenu.x, top: profilePhotoMenu.y }}
                        role="menu"
                        aria-label="프로필 사진 메뉴"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                profilePhotoMenuInputRef.current?.click();
                                setProfilePhotoMenu(null);
                            }}
                        >
                            <ImagePlus size={14} /> 사진 변경
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            disabled={!blocks.find((block) => block.id === profilePhotoMenu.blockId && block.type === "profile")?.data.photo}
                            onClick={() => {
                                const block = blocks.find((item) => item.id === profilePhotoMenu.blockId);
                                if (block?.type === "profile" && block.data.photo) {
                                    setPendingProfilePhoto({
                                        blockId: block.id,
                                        source: block.data.photoSource || block.data.photo,
                                        crop: block.data.photoSource
                                            ? block.data.photoCrop
                                            : { focusX: 0.5, focusY: 0.5, zoom: 1 },
                                    });
                                }
                                setProfilePhotoMenu(null);
                            }}
                        >
                            <Crop size={14} /> 사진 편집
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            className="is-danger"
                            disabled={!blocks.find((block) => block.id === profilePhotoMenu.blockId && block.type === "profile")?.data.photo}
                            onClick={() => {
                                const block = blocks.find((item) => item.id === profilePhotoMenu.blockId);
                                if (block?.type === "profile") {
                                    updateBlockData(block.id, {
                                        ...block.data,
                                        photo: "",
                                        photoSource: "",
                                        photoCrop: undefined,
                                    });
                                }
                                setProfilePhotoMenu(null);
                            }}
                        >
                            <Trash2 size={14} /> 사진 제거
                        </button>
                    </div>
                )}

                <input
                    ref={profilePhotoMenuInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                        const block = blocks.find((item) => item.id === profilePhotoMenuBlockIdRef.current);
                        handleProfilePhotoUpload(block, event.target.files?.[0]);
                        event.currentTarget.value = "";
                    }}
                />

                {/* 캔버스 우측 하단 줌 컨트롤 바 */}
                <div
                    className={`editor-zoom-controls no-print fixed bg-[#181920]/90 backdrop-blur border border-neutral-700 rounded-full px-3 py-1.5 shadow-xl flex items-center gap-2 z-40${readOnly ? " public-resume-zoom-controls" : ""}`}
                    style={readOnly ? undefined : { right: 'calc(clamp(380px, 30vw, 480px) + var(--editor-floating-control-offset))' }}
                >
                    <button
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= minimumZoom}
                        className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                        data-tooltip={readOnly ? undefined : "축소"}
                        aria-label="축소"
                    >
                        <ZoomOut size={14} />
                    </button>
                    <span ref={zoomLabelRef} className="text-[11px] font-mono font-medium text-neutral-300 min-w-[36px] text-center select-none">
                        {zoomLevel}%
                    </span>
                    <button
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 150}
                        className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                        data-tooltip={readOnly ? undefined : "확대"}
                        aria-label="확대"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <div className="w-[1px] h-3 bg-neutral-700 mx-0.5" />
                    <button
                        onClick={handleZoomReset}
                        className="p-1 text-neutral-400 hover:text-white transition"
                        data-tooltip={readOnly ? undefined : "100%로 리셋"}
                        aria-label={readOnly ? "화면 너비에 맞춤" : "100%로 리셋"}
                    >
                        <RotateCcw size={12} />
                    </button>
                    {!readOnly && (
                        <div ref={viewMenuRef} className="editor-view-menu">
                            <button
                                type="button"
                                className={`editor-view-menu__trigger${viewMode !== "custom" ? " is-active" : ""}`}
                                aria-label="화면 맞춤 및 페이지 배열"
                                aria-haspopup="menu"
                                aria-expanded={isViewMenuOpen}
                                onClick={() => setIsViewMenuOpen((open) => !open)}
                            >
                                <Maximize2 size={13} />
                                <ChevronDown size={10} />
                            </button>
                            {isViewMenuOpen && (
                                <div className="editor-view-menu__popover" role="menu" aria-label="화면 보기 방식">
                                    <button type="button" role="menuitemradio" aria-checked={viewMode === "page"} onClick={() => handleViewMode("page")}>
                                        <Maximize2 size={15} />
                                        <span><strong>쪽 맞춤</strong><small>한 페이지 전체 보기</small></span>
                                    </button>
                                    <button type="button" role="menuitemradio" aria-checked={viewMode === "width"} onClick={() => handleViewMode("width")}>
                                        <Monitor size={15} />
                                        <span><strong>너비 맞춤</strong><small>화면 가로폭에 맞추기</small></span>
                                    </button>
                                    <button type="button" role="menuitemradio" aria-checked={viewMode === "two-page"} onClick={() => handleViewMode("two-page")}>
                                        <Columns2 size={15} />
                                        <span><strong>두 쪽 보기</strong><small>페이지를 두 장씩 정렬</small></span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            <ServiceDialog
                isOpen={pendingDeleteBlockId !== null}
                title="블록을 삭제할까요?"
                message={`'${pendingDeleteBlock?.title?.trim() || "선택한 블록"}' 블록은 삭제 후 실행 취소로 복구할 수 있습니다.`}
                variant="danger"
                confirmLabel="삭제"
                cancelLabel="취소"
                onConfirm={() => {
                    if (pendingDeleteBlockId) removeBlock(pendingDeleteBlockId);
                    setPendingDeleteBlockId(null);
                }}
                onCancel={() => setPendingDeleteBlockId(null)}
            />
            <ProfilePhotoCropDialog
                file={pendingProfilePhoto?.file ?? null}
                source={pendingProfilePhoto?.source}
                initialCrop={pendingProfilePhoto?.crop}
                onCancel={() => setPendingProfilePhoto(null)}
                onApply={({ photo, source, crop }) => {
                    const block = blocks.find((item) => item.id === pendingProfilePhoto?.blockId);
                    if (block?.type === "profile") {
                        updateBlockData(block.id, {
                            ...block.data,
                            photo,
                            photoSource: source,
                            photoCrop: crop,
                            showPhoto: true,
                        });
                    }
                    setPendingProfilePhoto(null);
                }}
            />
        </>
    );
}
