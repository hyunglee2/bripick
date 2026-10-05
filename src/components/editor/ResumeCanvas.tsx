// src/components/editor/ResumeCanvas.tsx
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import EditableText from "@/components/editor/EditableText";
import { FileText, GripVertical, ImagePlus, Trash2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { ProfileData, ResumeBlock, ResumeDocument, SkillsData } from "@/types/resume";
import { getProfileContacts, withProfileContacts } from "@/lib/profileContacts";
import { getSkillCategories, withSkillCategories } from "@/lib/skills";
import { escapeHtml, richTextToPlainText, sanitizeInlineRichText } from "@/lib/richText";
import { createProfilePhotoDataUrl } from "@/lib/profilePhoto";
import RichTextEditable from "@/components/editor/RichTextEditable";
import ServiceDialog from "@/components/ui/ServiceDialog";

const A4_PAPER_HEIGHT = 1130;
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
    experienceProjectStart?: number;
    experienceProjectEnd?: number;
};

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
    const storeUpdateBlockData = useResumeStore((state) => state.updateBlockData);
    const storeUpdateBlockTitle = useResumeStore((state) => state.updateBlockTitle);
    const storeReorderBlocks = useResumeStore((state) => state.reorderBlocks);
    const storeRemoveBlock = useResumeStore((state) => state.removeBlock);
    const blocks = resumeOverride?.blocks ?? storedBlocks;
    const globalStyle = resumeOverride?.globalStyle ?? storedGlobalStyle;
    const selectedBlockId = readOnly ? null : storedSelectedBlockId;
    const setSelectedBlockId = readOnly ? (() => undefined) : storeSetSelectedBlockId;
    const updateBlockData = readOnly ? (() => undefined) : storeUpdateBlockData;
    const updateBlockTitle = readOnly ? (() => undefined) : storeUpdateBlockTitle;
    const reorderBlocks = readOnly ? (() => undefined) : storeReorderBlocks;
    const removeBlock = readOnly ? (() => undefined) : storeRemoveBlock;

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [dragOverFragmentKey, setDragOverFragmentKey] = useState<string | null>(null);
    const [dragOverPosition, setDragOverPosition] = useState<"before" | "after" | null>(null);
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [pendingDeleteBlockId, setPendingDeleteBlockId] = useState<string | null>(null);
    const [profilePhotoMenu, setProfilePhotoMenu] = useState<{ blockId: string; x: number; y: number } | null>(null);
    const [pagePlacements, setPagePlacements] = useState<BlockPlacement[][]>(() => getInitialPlacements(blocks));
    const scrollContainerRef = useRef<HTMLElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const paginationFrameRef = useRef<number | null>(null);
    const dragScrollFrameRef = useRef<number | null>(null);
    const dragClientYRef = useRef<number | null>(null);
    const profilePhotoMenuRef = useRef<HTMLDivElement>(null);
    const profilePhotoMenuInputRef = useRef<HTMLInputElement>(null);
    const profilePhotoMenuBlockIdRef = useRef<string | null>(null);

    useEffect(() => () => {
        if (dragScrollFrameRef.current !== null) cancelAnimationFrame(dragScrollFrameRef.current);
    }, []);

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
    } as React.CSSProperties;

    const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 150));
    const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 50));
    const handleZoomReset = () => setZoomLevel(100);

    const handleProfilePhotoUpload = async (block: ResumeBlock | undefined, file?: File) => {
        if (!file || !block || block.type !== "profile") return;
        const photo = await createProfilePhotoDataUrl(file);
        updateBlockData(block.id, { ...block.data, photo, showPhoto: true });
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

        const repaginate = () => {
            if (disposed) return;
            const availableHeight = A4_PAPER_HEIGHT - (paperPadding * 2);
            const measuredBlockHeights = new Map<number, number>();
            const measuredItemHeights = new Map<string, number>();
            const measuredDescriptionHeights = new Map<string, number>();
            const measuredItemChromeHeights = new Map<string, number>();
            const measuredContinuationItemChromeHeights = new Map<string, number>();
            const measuredExperienceCompanyHeights = new Map<string, number>();
            const measuredExperienceProjectHeights = new Map<string, number>();
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
                const isDescriptionContinuation = Number(element.dataset.descriptionStart || "0") > 0;

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
                            const projectStyle = window.getComputedStyle(project);
                            const projectHeight = project.offsetHeight
                                + Number.parseFloat(projectStyle.marginTop || "0")
                                + Number.parseFloat(projectStyle.marginBottom || "0");
                            measuredExperienceProjectHeights.set(
                                `${index}:${itemIndex}:${projectIndex}`,
                                Math.max(
                                    measuredExperienceProjectHeights.get(`${index}:${itemIndex}:${projectIndex}`) || 0,
                                    projectHeight,
                                ),
                            );
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
                    const baseHeights = isDescriptionContinuation
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

            const startNewPage = () => {
                nextPages.push([]);
                usedHeight = 0;
            };

            blocks.forEach((block, index) => {
                if (block.type === "page_break") {
                    // 이전 버전에 저장된 수동 페이지 나눔 블록은 무시한다.
                    return;
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
                        const experienceProjects = block.type === "experience" && Array.isArray(flowItem?.projects)
                            ? flowItem.projects
                            : [];
                        const descriptions = block.type === "experience" && Array.isArray(flowItem?.projects) && flowItem.projects.length > 0
                            ? undefined
                            : flowItem?.description;
                        const itemHeight = measuredItemHeights.get(`${index}:${itemStart}`) || 80;

                        if (block.type === "experience" && experienceProjects.length > 0 && !keepItemTogether) {
                            const companyHeight = measuredExperienceCompanyHeights.get(`${index}:${itemStart}`) || 90;
                            let experienceProjectStart = 0;

                            while (experienceProjectStart < experienceProjects.length) {
                                const isProjectContinuation = experienceProjectStart > 0;
                                const fragmentBaseHeight = isProjectContinuation ? 24 : baseHeight;
                                const fragmentCompanyHeight = isProjectContinuation ? 0 : companyHeight;
                                let fragmentHeight = fragmentBaseHeight + fragmentCompanyHeight;
                                let experienceProjectEnd = experienceProjectStart;

                                while (experienceProjectEnd < experienceProjects.length) {
                                    const projectHeight = measuredExperienceProjectHeights.get(
                                        `${index}:${itemStart}:${experienceProjectEnd}`,
                                    ) || 120;
                                    if (experienceProjectEnd > experienceProjectStart
                                        && usedHeight + fragmentHeight + projectHeight > availableHeight) break;
                                    if (experienceProjectEnd === experienceProjectStart
                                        && nextPages.at(-1)!.length > 0
                                        && usedHeight + fragmentHeight + projectHeight > availableHeight) {
                                        startNewPage();
                                    }
                                    fragmentHeight += projectHeight;
                                    experienceProjectEnd += 1;
                                }

                                nextPages.at(-1)!.push({
                                    blockIndex: index,
                                    itemStart,
                                    itemEnd: itemStart + 1,
                                    experienceProjectStart,
                                    experienceProjectEnd,
                                });
                                usedHeight += fragmentHeight;
                                experienceProjectStart = experienceProjectEnd;
                                if (experienceProjectStart < experienceProjects.length) startNewPage();
                            }

                            itemStart += 1;
                            continue;
                        }

                        // 한 페이지보다 긴 항목은 항상 bullet 단위로 나눠 배치한다.
                        // 묶기를 끄면 현재 페이지의 남은 공간부터 bullet 단위로 채운다.
                        const itemDoesNotFitPage = baseHeight + itemHeight > availableHeight;
                        const itemDoesNotFitRemainingSpace = usedHeight + baseHeight + itemHeight > availableHeight;
                        if (Array.isArray(descriptions) && descriptions.length > 0
                            && (itemDoesNotFitPage || (!keepItemTogether && itemDoesNotFitRemainingSpace))) {
                            // 묶기가 켜진 항목 자체가 한 페이지보다 길다면 현재 페이지의
                            // 남은 공간을 사용하지 않고 새 페이지에서 항목을 시작한다.
                            if (keepItemTogether && itemDoesNotFitPage && nextPages.at(-1)!.length > 0) {
                                startNewPage();
                            }
                            const itemChromeHeight = measuredItemChromeHeights.get(`${index}:${itemStart}`) || 60;
                            let descriptionStart = 0;

                            while (descriptionStart < descriptions.length) {
                                const isContinuationFragment = descriptionStart > 0;
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
                                    if (descriptionEnd > descriptionStart
                                        && usedHeight + fragmentHeight + descriptionHeight > availableHeight) break;
                                    if (descriptionEnd === descriptionStart && nextPages.at(-1)!.length > 0
                                        && usedHeight + fragmentHeight + descriptionHeight > availableHeight) {
                                        startNewPage();
                                    }
                                    fragmentHeight += descriptionHeight;
                                    descriptionEnd += 1;
                                }

                                const fragmentDescriptionCount = descriptionEnd - descriptionStart;
                                const remainingDescriptionCount = descriptions.length - descriptionEnd;

                                // 페이지 하단에 불릿 하나만 고립되면 프로젝트 조각 전체를
                                // 다음 페이지로 보내 한 줄짜리 조각 카드가 생기지 않게 한다.
                                if (fragmentDescriptionCount === 1
                                    && remainingDescriptionCount > 0
                                    && nextPages.at(-1)!.length > 0) {
                                    startNewPage();
                                    continue;
                                }

                                // 마지막 불릿 하나만 다음 페이지에 남는 경우에는 현재 조각의
                                // 마지막 불릿도 함께 넘겨 continuation에 최소 두 줄을 유지한다.
                                if (remainingDescriptionCount === 1 && fragmentDescriptionCount > 1) {
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
                                });
                                usedHeight += fragmentHeight;
                                descriptionStart = descriptionEnd;
                                if (descriptionStart < descriptions.length) startNewPage();
                            }

                            itemStart += 1;
                            continue;
                        }

                        if (nextPages.at(-1)!.length > 0 && usedHeight + baseHeight > availableHeight) startNewPage();

                        let sliceHeight = baseHeight;
                        let itemEnd = itemStart;
                        while (itemEnd < itemCount) {
                            const itemHeight = measuredItemHeights.get(`${index}:${itemEnd}`) || 80;
                            const interItemGap = block.type === "project" && itemEnd > itemStart
                                ? PROJECT_ITEM_GAP
                                : 0;
                            if (itemEnd > itemStart && usedHeight + sliceHeight + interItemGap + itemHeight > availableHeight) break;
                            if (itemEnd === itemStart && nextPages.at(-1)!.length > 0
                                && usedHeight + sliceHeight + itemHeight > availableHeight) {
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
        // Fast Refresh 중에도 dependency 배열 길이를 유지하되,
        // pagePlacements 변경으로 측정 effect가 재실행되지는 않게 한다.
        canvasRef,
        paperPadding,
        templateType,
    ]);

    // 단일 블록 렌더러 함수
    const renderBlockContent = (block: ResumeBlock, placement: BlockPlacement) => {
        const isDescriptionContinuation = (placement.descriptionStart ?? 0) > 0;
        const isExperienceProjectContinuation = (placement.experienceProjectStart ?? 0) > 0;
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
                    const introductionStyle = block.data.introductionStyle || "bullets";
                    return (
                        <div className="resume-profile-hero">
                            <div className={`resume-profile-main${showProfilePhoto ? "" : " resume-profile-main--no-photo"}`}>
                                {showProfilePhoto && (
                                    <label
                                        className="resume-profile-photo resume-profile-photo-picker"
                                        onClick={(event) => event.stopPropagation()}
                                        onContextMenu={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setSelectedBlockId(block.id);
                                            profilePhotoMenuBlockIdRef.current = block.id;
                                            setProfilePhotoMenu({
                                                blockId: block.id,
                                                x: Math.max(8, Math.min(event.clientX, window.innerWidth - 176)),
                                                y: Math.max(8, Math.min(event.clientY, window.innerHeight - 92)),
                                            });
                                        }}
                                        onDragStart={(event) => event.preventDefault()}
                                    >
                                        {block.data.photo ? (
                                            <img src={block.data.photo} alt="프로필" />
                                        ) : (
                                            <span>{String(block.data.name || "?").slice(0, 1)}</span>
                                        )}
                                        <span className="resume-profile-photo-picker__overlay no-print" aria-hidden="true">
                                            사진 변경
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="sr-only"
                                            aria-label="프로필 사진 선택"
                                            onChange={(event) => {
                                                void handleProfilePhotoUpload(block, event.target.files?.[0]);
                                                event.currentTarget.value = "";
                                            }}
                                        />
                                    </label>
                                )}
                                <div className="resume-profile-copy">
                                    <EditableText
                                        tag="p"
                                        value={block.data.bio || ""}
                                        placeholder="예: 사용자 중심의 서비스를 만드는"
                                        onChange={(bio) => updateBlockData(block.id, { ...block.data, bio })}
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
                                            <strong>CONTACTS</strong>
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
                            {highlights.length > 0 && introductionStyle === "bullets" && (
                                <ul className="resume-profile-highlights">
                                    {highlights.map((highlight: string, index: number) => (
                                        <li key={index}>
                                            <EditableText
                                                value={highlight}
                                                width="full"
                                                placeholder="자기소개를 입력하세요"
                                                onChange={(value) => {
                                                    const updated = [...highlights];
                                                    updated[index] = value;
                                                    updateBlockData(block.id, { ...block.data, highlights: updated });
                                                }}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {highlights.length > 0 && introductionStyle === "paragraph" && (
                                <EditableText
                                    tag="p"
                                    multiline
                                    value={highlights.join("\n")}
                                    placeholder="자기소개를 입력하세요"
                                    className="resume-profile-introduction"
                                    onChange={(value) => updateBlockData(block.id, {
                                        ...block.data,
                                        highlights: value.split(/\r?\n/).filter((line) => line.trim()),
                                    })}
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
                            <EditableText
                                tag="p"
                                multiline
                                value={block.data.bio || ""}
                                placeholder="자신을 소개하는 간단한 한 줄 소개를 적어보세요."
                                onChange={(newBio) => updateBlockData(block.id, { ...block.data, bio: newBio })}
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
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                <EditableText
                                    value={block.title}
                                    appearance="plain"
                                    placeholder="경력"
                                    onChange={(title) => updateBlockTitle(block.id, title)}
                                />
                            </h2>
                        </div>}
                        {Array.isArray(block.data) && block.data.length > 0 ? (
                            <div className="space-y-3 pt-1">
                                {block.data
                                    .slice(placement.itemStart ?? 0, placement.itemEnd ?? block.data.length)
                                    .map((exp: any, localIndex: number) => {
                                        const expIndex = (placement.itemStart ?? 0) + localIndex;
                                        return (
                                            <div key={exp.id} data-pagination-item-index={expIndex} className="resume-experience-item space-y-1">
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
                                                            <EditableText
                                                                tag="p"
                                                                multiline
                                                                value={visibleDescriptions.join("\n")}
                                                                width="full"
                                                                placeholder="회사 소개 및 주요 성과"
                                                                className="resume-experience-company-description resume-experience-company-description--paragraph"
                                                                data-pagination-description-index={descriptionStart}
                                                                onChange={(value) => {
                                                                    const updated = [...block.data];
                                                                    const newDescriptions = [...(exp.description || [])];
                                                                    newDescriptions.splice(
                                                                        descriptionStart,
                                                                        visibleDescriptions.length,
                                                                        ...value.split(/\r?\n/).filter((line) => line.trim()),
                                                                    );
                                                                    updated[expIndex] = { ...exp, description: newDescriptions };
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
                                                                        <EditableText
                                                                            value={desc}
                                                                            width="full"
                                                                            placeholder="성과 및 업무 내용"
                                                                            onChange={(newDesc) => {
                                                                                const updated = [...block.data];
                                                                                const newDescriptions = [...exp.description];
                                                                                newDescriptions[i] = newDesc;
                                                                                updated[expIndex] = { ...exp, description: newDescriptions };
                                                                                updateBlockData(block.id, updated);
                                                                            }}
                                                                        />
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    );
                                                })()}
                                                {!isDescriptionContinuation && Array.isArray(exp.projects) && exp.projects.length > 0 && (
                                                    <div className="resume-experience-projects">
                                                        {exp.projects
                                                            .slice(
                                                                placement.experienceProjectStart ?? 0,
                                                                placement.experienceProjectEnd ?? exp.projects.length,
                                                            )
                                                            .map((project: any, localProjectIndex: number) => {
                                                            const projectIndex = (placement.experienceProjectStart ?? 0) + localProjectIndex;
                                                            return <div
                                                                key={project.id}
                                                                data-experience-project-index={projectIndex}
                                                                className="resume-experience-project"
                                                            >
                                                                <div className="resume-experience-project__header">
                                                                    <div className="flex min-w-0 items-baseline gap-2">
                                                                        <span style={{ backgroundColor: primaryColor }} className="h-1.5 w-1.5 shrink-0" />
                                                                        <EditableText
                                                                            tag="span"
                                                                            value={project.title}
                                                                            placeholder="프로젝트명"
                                                                            onChange={(title) => {
                                                                                const updated = [...block.data];
                                                                                const projects = [...exp.projects];
                                                                                projects[projectIndex] = { ...project, title };
                                                                                updated[expIndex] = { ...exp, projects };
                                                                                updateBlockData(block.id, updated);
                                                                            }}
                                                                            className="resume-item-title font-bold text-neutral-900"
                                                                        />
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center gap-1 text-xs text-neutral-500">
                                                                        <EditableText
                                                                            value={project.startDate || ""}
                                                                            width="short"
                                                                            placeholder="시작일"
                                                                            onChange={(startDate) => {
                                                                                const updated = [...block.data];
                                                                                const projects = [...exp.projects];
                                                                                projects[projectIndex] = { ...project, startDate };
                                                                                updated[expIndex] = { ...exp, projects };
                                                                                updateBlockData(block.id, updated);
                                                                            }}
                                                                        />
                                                                        <span>~</span>
                                                                        <EditableText
                                                                            value={project.endDate || ""}
                                                                            width="short"
                                                                            placeholder="종료일"
                                                                            onChange={(endDate) => {
                                                                                const updated = [...block.data];
                                                                                const projects = [...exp.projects];
                                                                                projects[projectIndex] = { ...project, endDate };
                                                                                updated[expIndex] = { ...exp, projects };
                                                                                updateBlockData(block.id, updated);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <EditableText
                                                                    tag="div"
                                                                    value={project.role}
                                                                    placeholder="프로젝트 소개 및 역할"
                                                                    onChange={(role) => {
                                                                        const updated = [...block.data];
                                                                        const projects = [...exp.projects];
                                                                        projects[projectIndex] = { ...project, role };
                                                                        updated[expIndex] = { ...exp, projects };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                    className="resume-experience-project__summary"
                                                                />
                                                                <ul className="resume-project-bullets">
                                                                    {(project.description || []).map((description: string, descriptionIndex: number) => (
                                                                        <li
                                                                            key={descriptionIndex}
                                                                            data-bullet-level={project.descriptionLevels?.[descriptionIndex] || 1}
                                                                        >
                                                                            <RichTextEditable
                                                                                html={project.descriptionHtml?.[descriptionIndex] || escapeHtml(description)}
                                                                                ariaLabel="프로젝트 기여와 성과"
                                                                                className="resume-rich-bullet inline cursor-text rounded-sm outline-none focus:bg-blue-50"
                                                                                onKeyDown={(event) => {
                                                                                    if (event.key === "Enter") event.preventDefault();
                                                                                }}
                                                                                onChange={(descriptionHtml) => {
                                                                                    const updated = [...block.data];
                                                                                    const projects = [...exp.projects];
                                                                                    const descriptions = [...(project.description || [])];
                                                                                    const html = [...(project.descriptionHtml || [])];
                                                                                    descriptions[descriptionIndex] = richTextToPlainText(descriptionHtml);
                                                                                    html[descriptionIndex] = descriptionHtml;
                                                                                    projects[projectIndex] = { ...project, description: descriptions, descriptionHtml: html };
                                                                                    updated[expIndex] = { ...exp, projects };
                                                                                    updateBlockData(block.id, updated);
                                                                                }}
                                                                            />
                                                                        </li>
                                                                    ))}
                                                                </ul>
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
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                <EditableText
                                    value={block.title || "PROJECTS"}
                                    appearance="plain"
                                    placeholder="프로젝트"
                                    onChange={(title) => updateBlockTitle(block.id, title)}
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
                                                className={`resume-project-item space-y-1 ${localIndex > 0 ? "resume-project-item--separated" : ""}`}
                                            >
                                                {!isDescriptionContinuation && <div className="resume-project-header flex justify-between items-baseline gap-2">
                                                    <div className="flex items-center gap-2">
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
                                                    <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                                                        <EditableText
                                                            value={proj.startDate}
                                                            width="short"
                                                            placeholder="시작일"
                                                            onChange={(newDate) => {
                                                                const updated = [...block.data];
                                                                updated[projIndex] = { ...proj, startDate: newDate };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                        />
                                                        <span>~</span>
                                                        <EditableText
                                                            value={proj.endDate}
                                                            width="short"
                                                            placeholder="종료일"
                                                            onChange={(newDate) => {
                                                                const updated = [...block.data];
                                                                updated[projIndex] = { ...proj, endDate: newDate };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                        />
                                                    </div>
                                                </div>}
                                                {!isDescriptionContinuation && <EditableText
                                                    tag="div"
                                                    value={proj.role}
                                                    placeholder="프로젝트 역할"
                                                    onChange={(newRole) => {
                                                        const updated = [...block.data];
                                                        updated[projIndex] = { ...proj, role: newRole };
                                                        updateBlockData(block.id, updated);
                                                    }}
                                                    className="resume-project-summary text-xs text-neutral-500"
                                                />}
                                                <ul className="resume-project-bullets list-disc list-inside text-xs text-neutral-700 space-y-1 pt-1">
                                                    {proj.description
                                                        ?.slice(
                                                            placement.descriptionStart ?? 0,
                                                            placement.descriptionEnd ?? proj.description.length
                                                        )
                                                        .map((desc: string, localDescriptionIndex: number) => {
                                                            const i = (placement.descriptionStart ?? 0) + localDescriptionIndex;
                                                            const bulletLevel = Math.max(
                                                                1,
                                                                Math.min(3, Number(proj.descriptionLevels?.[i]) || 1),
                                                            );
                                                            const bulletHtml = sanitizeInlineRichText(
                                                                proj.descriptionHtml?.[i] || escapeHtml(desc),
                                                            );
                                                            if (!richTextToPlainText(bulletHtml).trim()) {
                                                                return (
                                                                    <li
                                                                        key={i}
                                                                        data-pagination-description-index={i}
                                                                        data-bullet-level={bulletLevel}
                                                                        className="list-item"
                                                                    >
                                                                        <EditableText
                                                                            value=""
                                                                            width="full"
                                                                            placeholder="프로젝트 기여와 성과"
                                                                            onChange={(newDescription) => {
                                                                                const updated = [...block.data];
                                                                                const newDescriptions = [...proj.description];
                                                                                newDescriptions[i] = newDescription;
                                                                                updated[projIndex] = { ...proj, description: newDescriptions };
                                                                                updateBlockData(block.id, updated);
                                                                            }}
                                                                        />
                                                                    </li>
                                                                );
                                                            }
                                                            return (
                                                                <li
                                                                    key={i}
                                                                    data-pagination-description-index={i}
                                                                    data-bullet-level={bulletLevel}
                                                                    className="list-item"
                                                                >
                                                                    <RichTextEditable
                                                                        html={bulletHtml}
                                                                        ariaLabel="프로젝트 성과"
                                                                        className="resume-rich-bullet inline cursor-text rounded-sm outline-none focus:bg-blue-50"
                                                                        onKeyDown={(event) => {
                                                                            if (event.key === "Enter") event.preventDefault();
                                                                        }}
                                                                        onChange={(newHtml) => {
                                                                            const updated = [...block.data];
                                                                            const newDescriptions = [...proj.description];
                                                                            const newDescriptionHtml = Array.isArray(proj.descriptionHtml)
                                                                                ? [...proj.descriptionHtml]
                                                                                : proj.description.map((text: string) => escapeHtml(text));
                                                                            newDescriptions[i] = richTextToPlainText(newHtml);
                                                                            newDescriptionHtml[i] = newHtml;
                                                                            updated[projIndex] = {
                                                                                ...proj,
                                                                                description: newDescriptions,
                                                                                descriptionHtml: newDescriptionHtml,
                                                                            };
                                                                            updateBlockData(block.id, updated);
                                                                        }}
                                                                    />
                                                                </li>
                                                            );
                                                        })}
                                                </ul>
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
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                <EditableText
                                    value={block.title || "SKILLS"}
                                    appearance="plain"
                                    placeholder="스킬"
                                    onChange={(title) => updateBlockTitle(block.id, title)}
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
                                                value={category.name}
                                                appearance="plain"
                                                placeholder="카테고리명"
                                                onChange={(name) => updateCanvasSkillCategories(
                                                    skillCategories.map((item, index) => (
                                                        index === categoryIndex ? { ...item, name } : item
                                                    )),
                                                )}
                                            />
                                    </strong>
                                    <div className="flex flex-wrap gap-1.5">
                                        {category.skills.length === 0 && (
                                            <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-900">
                                                <EditableText
                                                    value=""
                                                    placeholder="기술"
                                                    onChange={(skill) => updateCanvasSkillCategories(
                                                        skill
                                                            ? skillCategories.map((item, index) => (
                                                                index === categoryIndex ? { ...item, skills: [skill] } : item
                                                            ))
                                                            : skillCategories,
                                                    )}
                                                />
                                            </span>
                                        )}
                                        {category.skills.map((skill, skillIndex) => (
                                            <span
                                                key={`${category.id}-${skillIndex}`}
                                                className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-900"
                                            >
                                                <EditableText
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
                                                />
                                            </span>
                                        ))}
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
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                <EditableText
                                    value={block.title || "EDUCATION"}
                                    appearance="plain"
                                    placeholder="학력"
                                    onChange={(title) => updateBlockTitle(block.id, title)}
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
                                                    <div className="flex items-center gap-2">
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
                                                            className="text-xs font-semibold text-neutral-700"
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
                                    value={block.title === "CERTIFICATIONS & AWARDS" ? "Other Experience" : (block.title || "Other Experience")}
                                    appearance="plain"
                                    placeholder="Other Experience"
                                    onChange={(title) => updateBlockTitle(block.id, title)}
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
                                                    <div className="resume-other-experience__date flex items-center gap-1 text-xs font-medium text-neutral-500">
                                                                <EditableText
                                                                    value={startDate}
                                                                    width="short"
                                                                    placeholder="시작일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[certIdx] = { ...cert, startDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                            <span>~</span>
                                                                <EditableText
                                                                    value={endDate}
                                                                    width="short"
                                                                    placeholder="종료일"
                                                                    onChange={(newDate) => {
                                                                        const updated = [...block.data];
                                                                        updated[certIdx] = { ...cert, endDate: newDate };
                                                                        updateBlockData(block.id, updated);
                                                                    }}
                                                                />
                                                    </div>
                                                </div>}
                                                <ul className="resume-other-experience__details">
                                                    {visibleDescriptions.map((description: string, localDescriptionIndex: number) => {
                                                        const descriptionIndex = descriptionStart + localDescriptionIndex;
                                                        const descriptionHtml = cert.descriptionHtml?.[descriptionIndex] || escapeHtml(description);
                                                        return <li key={descriptionIndex} data-pagination-description-index={descriptionIndex}>
                                                            {richTextToPlainText(descriptionHtml).trim() ? (
                                                                <RichTextEditable
                                                                    html={descriptionHtml}
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
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                <EditableText
                                    value={block.title}
                                    appearance="plain"
                                    placeholder="섹션 제목"
                                    onChange={(title) => updateBlockTitle(block.id, title)}
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
                                            <EditableText
                                                tag="p"
                                                multiline
                                                value={paragraph}
                                                placeholder="내용을 입력하세요..."
                                                onChange={(newContent) => {
                                                    const updated = [...paragraphs];
                                                    updated[paragraphIndex] = newContent;
                                                    updateBlockData(block.id, { ...block.data, content: updated.join("\n") });
                                                }}
                                                className="block min-w-0 flex-1 whitespace-pre-line text-xs leading-relaxed text-neutral-700"
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
            className={`editor-canvas flex-1 bg-[#444444] overflow-y-auto p-8 flex justify-center cursor-default relative${readOnly ? " resume-canvas--readonly" : ""}`}
        >
            <div
                ref={canvasRef}
                style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top center",
                    transition: "transform 0.15s ease-out",
                }}
                className="w-full flex flex-col items-center gap-10 pb-36"
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
                                minHeight: `${A4_PAPER_HEIGHT}px`,
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

                                return (
                                    <div
                                        key={fragmentKey}
                                        data-resume-block-index={globalIdx}
                                        data-block-type={block.type}
                                        data-description-start={placement.descriptionStart ?? 0}
                                        data-experience-project-start={placement.experienceProjectStart ?? 0}
                                        data-custom-padding={block.style.useCustomPadding === true}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, globalIdx)}
                                        onDragOver={(e) => handleDragOver(e, globalIdx, fragmentKey)}
                                        onDrop={(e) => handleDrop(e, globalIdx)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => setSelectedBlockId(block.id)}
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
                        className="is-danger"
                        disabled={!blocks.find((block) => block.id === profilePhotoMenu.blockId && block.type === "profile")?.data.photo}
                        onClick={() => {
                            const block = blocks.find((item) => item.id === profilePhotoMenu.blockId);
                            if (block?.type === "profile") {
                                updateBlockData(block.id, { ...block.data, photo: "" });
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
                    void handleProfilePhotoUpload(block, event.target.files?.[0]);
                    event.currentTarget.value = "";
                }}
            />

            {/* 캔버스 우측 하단 줌 컨트롤 바 */}
            <div
                className="editor-zoom-controls no-print fixed bottom-6 bg-[#181920]/90 backdrop-blur border border-neutral-700 rounded-full px-3 py-1.5 shadow-xl flex items-center gap-2 z-40"
                style={{ right: 'calc(clamp(380px, 30vw, 480px) + 1.5rem)' }}
            >
                <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 50}
                    className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                    data-tooltip="축소"
                >
                    <ZoomOut size={14} />
                </button>
                <span className="text-[11px] font-mono font-medium text-neutral-300 min-w-[36px] text-center select-none">
                    {zoomLevel}%
                </span>
                <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 150}
                    className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                    data-tooltip="확대"
                >
                    <ZoomIn size={14} />
                </button>
                <div className="w-[1px] h-3 bg-neutral-700 mx-0.5" />
                <button
                    onClick={handleZoomReset}
                    className="p-1 text-neutral-400 hover:text-white transition"
                    data-tooltip="100%로 리셋"
                >
                    <RotateCcw size={12} />
                </button>
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
        </>
    );
}
