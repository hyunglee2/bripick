// src/components/editor/ResumeCanvas.tsx
"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import EditableText from "@/components/editor/EditableText";
import { FileText, GripVertical, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { ProfileData, ResumeBlock, SkillsData } from "@/types/resume";
import { getProfileContacts, withProfileContacts } from "@/lib/profileContacts";
import { getSkillCategories } from "@/lib/skills";

const A4_PAPER_HEIGHT = 1130;
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
};

function getFlowItemCount(block: ResumeBlock) {
    if (Array.isArray(block.data)) return block.data.length;
    if (block.type === "custom_text" && block.data?.content) return String(block.data.content).split("\n").length;
    return 0;
}

function getInitialPlacements(blocks: ResumeBlock[]): BlockPlacement[][] {
    return [blocks.flatMap((block, blockIndex) => block.type === "page_break" ? [] : [{ blockIndex }])];
}

export default function ResumeCanvas() {
    const blocks = useResumeStore((state) => state.resume.blocks);
    const globalStyle = useResumeStore((state) => state.resume.globalStyle);
    const selectedBlockId = useResumeStore((state) => state.selectedBlockId);
    const setSelectedBlockId = useResumeStore((state) => state.setSelectedBlockId);
    const updateBlockData = useResumeStore((state) => state.updateBlockData);
    const reorderBlocks = useResumeStore((state) => state.reorderBlocks);

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [zoomLevel, setZoomLevel] = useState<number>(100);
    const [pagePlacements, setPagePlacements] = useState<BlockPlacement[][]>(() => getInitialPlacements(blocks));
    const canvasRef = useRef<HTMLDivElement>(null);

    const templateType = globalStyle?.template || "modern";
    const primaryColor = globalStyle?.primaryColor || "#2f80c3";
    const fontFamily = globalStyle?.fontFamily || "'Pretendard', sans-serif";
    const paperPadding = globalStyle?.basePadding ?? 36;
    const typographyStyle = {
        "--resume-blue": primaryColor,
        "--resume-display-title-size": `${globalStyle?.displayTitleFontSize ?? 24}px`,
        "--resume-tagline-size": `${Math.round(((globalStyle?.displayTitleFontSize ?? 24) + 2) * 0.6)}px`,
        "--resume-section-title-size": `${globalStyle?.sectionTitleFontSize ?? 24}px`,
        "--resume-item-title-size": `${globalStyle?.itemTitleFontSize ?? 15}px`,
        "--resume-body-size": `${globalStyle?.bodyFontSize ?? 14}px`,
        "--resume-caption-size": `${globalStyle?.captionFontSize ?? 12}px`,
    } as React.CSSProperties;

    const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 150));
    const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 50));
    const handleZoomReset = () => setZoomLevel(100);

    // --- 드래그 앤 드롭 핸들러 ---
    const handleDragStart = (e: React.DragEvent, globalIdx: number) => {
        setDraggedIndex(globalIdx);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", globalIdx.toString());
    };

    const handleDragOver = (e: React.DragEvent, globalIdx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverIndex !== globalIdx) setDragOverIndex(globalIdx);
    };

    const handleDrop = (e: React.DragEvent, targetGlobalIdx: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== targetGlobalIdx) {
            reorderBlocks(draggedIndex, targetGlobalIdx);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
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

        const repaginate = () => {
            const availableHeight = A4_PAPER_HEIGHT - (paperPadding * 2);
            const measuredBlockHeights = new Map<number, number>();
            const measuredItemHeights = new Map<string, number>();
            const measuredDescriptionHeights = new Map<string, number>();
            const measuredItemChromeHeights = new Map<string, number>();
            const measuredBaseHeights = new Map<number, number>();

            canvas.querySelectorAll<HTMLElement>("[data-resume-block-index]").forEach((element) => {
                const index = Number(element.dataset.resumeBlockIndex);
                const style = window.getComputedStyle(element);
                // offsetHeight는 캔버스 줌(transform)의 영향을 받지 않는다.
                const outerHeight = element.offsetHeight
                    + Number.parseFloat(style.marginTop || "0")
                    + Number.parseFloat(style.marginBottom || "0");
                measuredBlockHeights.set(index, Math.max(measuredBlockHeights.get(index) || 0, outerHeight));

                let itemsHeight = 0;
                element.querySelectorAll<HTMLElement>("[data-pagination-item-index]").forEach((item) => {
                    const itemIndex = Number(item.dataset.paginationItemIndex);
                    const itemStyle = window.getComputedStyle(item);
                    const itemHeight = item.offsetHeight
                        + Number.parseFloat(itemStyle.marginTop || "0")
                        + Number.parseFloat(itemStyle.marginBottom || "0");
                    measuredItemHeights.set(`${index}:${itemIndex}`, itemHeight);
                    itemsHeight += itemHeight;

                    let descriptionsHeight = 0;
                    item.querySelectorAll<HTMLElement>("[data-pagination-description-index]").forEach((description) => {
                        const descriptionIndex = Number(description.dataset.paginationDescriptionIndex);
                        const descriptionStyle = window.getComputedStyle(description);
                        const descriptionHeight = description.offsetHeight
                            + Number.parseFloat(descriptionStyle.marginTop || "0")
                            + Number.parseFloat(descriptionStyle.marginBottom || "0");
                        measuredDescriptionHeights.set(`${index}:${itemIndex}:${descriptionIndex}`, descriptionHeight);
                        descriptionsHeight += descriptionHeight;
                    });
                    measuredItemChromeHeights.set(`${index}:${itemIndex}`, Math.max(0, itemHeight - descriptionsHeight));
                });

                if (itemsHeight > 0) {
                    measuredBaseHeights.set(index, Math.max(measuredBaseHeights.get(index) || 0, outerHeight - itemsHeight));
                }
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
                if (FLOW_BLOCK_TYPES.has(block.type) && itemCount > 0 && block.style.keepTogether !== true) {
                    const baseHeight = measuredBaseHeights.get(index) || 80;
                    let itemStart = 0;

                    while (itemStart < itemCount) {
                        const descriptions = Array.isArray(block.data)
                            ? block.data[itemStart]?.description
                            : undefined;
                        const itemHeight = measuredItemHeights.get(`${index}:${itemStart}`) || 80;

                        // 단일 경력/프로젝트 항목이 한 장보다 크면 설명 bullet 단위로 이어서 배치한다.
                        if (Array.isArray(descriptions) && descriptions.length > 0
                            && baseHeight + itemHeight > availableHeight) {
                            const itemChromeHeight = measuredItemChromeHeights.get(`${index}:${itemStart}`) || 60;
                            let descriptionStart = 0;

                            while (descriptionStart < descriptions.length) {
                                let fragmentHeight = baseHeight + itemChromeHeight;
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
                            if (itemEnd > itemStart && usedHeight + sliceHeight + itemHeight > availableHeight) break;
                            if (itemEnd === itemStart && nextPages.at(-1)!.length > 0
                                && usedHeight + sliceHeight + itemHeight > availableHeight) {
                                startNewPage();
                            }
                            sliceHeight += itemHeight;
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

            setPagePlacements((current) => (
                JSON.stringify(current) === JSON.stringify(nextPages) ? current : nextPages
            ));
        };

        repaginate();
        const observer = new ResizeObserver(repaginate);
        canvas.querySelectorAll<HTMLElement>("[data-resume-block-index]").forEach((element) => observer.observe(element));
        document.fonts.ready.then(repaginate);

        return () => observer.disconnect();
    }, [
        blocks,
        globalStyle?.contentWidth,
        globalStyle?.displayTitleFontSize,
        globalStyle?.sectionTitleFontSize,
        globalStyle?.itemTitleFontSize,
        globalStyle?.bodyFontSize,
        globalStyle?.captionFontSize,
        pagePlacements,
        paperPadding,
        templateType,
    ]);

    // 단일 블록 렌더러 함수
    const renderBlockContent = (block: ResumeBlock, placement: BlockPlacement) => {
        const isContinuation = (placement.itemStart || 0) > 0 || (placement.descriptionStart || 0) > 0;
        switch (block.type) {
            case "profile": {
                const profileContacts = getProfileContacts(block.data as ProfileData);
                const visibleProfileContacts = profileContacts.filter((contact) => (
                    contact.label.trim() || contact.value.trim()
                ));
                const showProfilePhoto = block.data.showPhoto !== false;
                const profileContactRows = visibleProfileContacts.reduce<typeof visibleProfileContacts[]>((rows, contact) => {
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
                                    <div className="resume-profile-photo">
                                        {block.data.photo ? (
                                            <img src={block.data.photo} alt="프로필" />
                                        ) : (
                                            <span>{String(block.data.name || "?").slice(0, 1)}</span>
                                        )}
                                    </div>
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
                                            placeholder="프론트엔드 개발자"
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
                                    {visibleProfileContacts.length > 0 && (
                                        <div className="resume-profile-contacts">
                                            <strong>CONTACTS</strong>
                                            <div className="resume-contact-list">
                                            {profileContactRows.map((row) => (
                                                <div key={row.map((contact) => contact.id).join("-")} className="resume-contact-line">
                                                    {row.map((contact) => (
                                                        <span key={contact.id} className="resume-contact-row">
                                                            <b>▸</b>
                                                            <span className="resume-contact-label">{contact.label} :</span>
                                                            <EditableText
                                                                value={contact.value}
                                                                placeholder="내용"
                                                                className={/^https?:\/\//i.test(contact.value) ? "resume-contact-link" : ""}
                                                                onChange={(value) => {
                                                                    const nextContacts = profileContacts.map((item) => (
                                                                        item.id === contact.id ? { ...item, value } : item
                                                                    ));
                                                                    updateBlockData(
                                                                        block.id,
                                                                        withProfileContacts(block.data as ProfileData, nextContacts),
                                                                    );
                                                                }}
                                                            />
                                                        </span>
                                                    ))}
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {highlights.length > 0 && introductionStyle === "bullets" && (
                                <ul className="resume-profile-highlights">
                                    {highlights.map((highlight: string, index: number) => (
                                        <li key={index}>
                                            <EditableText
                                                value={highlight}
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
                            {visibleProfileContacts.map((contact, index) => (
                                <span key={contact.id} className="inline-flex items-center gap-2">
                                    {index > 0 && <span>|</span>}
                                    <span>{contact.label}: {contact.value}</span>
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
                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                {block.title}{isContinuation && <span className="ml-1 text-[10px] text-neutral-400">— 계속</span>}
                            </h2>
                        </div>
                        {Array.isArray(block.data) && block.data.length > 0 ? (
                            <div className="space-y-3 pt-1">
                                {block.data
                                    .slice(placement.itemStart ?? 0, placement.itemEnd ?? block.data.length)
                                    .map((exp: any, localIndex: number) => {
                                        const expIndex = (placement.itemStart ?? 0) + localIndex;
                                        return (
                                            <div key={exp.id} data-pagination-item-index={expIndex} className="space-y-1">
                                                <div className="flex justify-between items-baseline gap-2">
                                                    <EditableText
                                                        tag="span"
                                                        value={exp.company}
                                                        placeholder="회사명"
                                                        onChange={(newCompany) => {
                                                            const updated = [...block.data];
                                                            updated[expIndex] = { ...exp, company: newCompany };
                                                            updateBlockData(block.id, updated);
                                                        }}
                                                        className="font-bold text-neutral-900 text-sm"
                                                    />
                                                    <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                                                        <EditableText
                                                            value={exp.startDate}
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
                                                            placeholder="종료일"
                                                            onChange={(newDate) => {
                                                                const updated = [...block.data];
                                                                updated[expIndex] = { ...exp, endDate: newDate };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <EditableText
                                                    tag="div"
                                                    value={exp.role}
                                                    placeholder="직책 및 역할"
                                                    style={{ color: primaryColor }}
                                                    onChange={(newRole) => {
                                                        const updated = [...block.data];
                                                        updated[expIndex] = { ...exp, role: newRole };
                                                        updateBlockData(block.id, updated);
                                                    }}
                                                    className="text-xs font-semibold"
                                                />
                                                <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 pt-1">
                                                    {exp.description
                                                        ?.slice(
                                                            placement.descriptionStart ?? 0,
                                                            placement.descriptionEnd ?? exp.description.length
                                                        )
                                                        .map((desc: string, localDescriptionIndex: number) => {
                                                            const i = (placement.descriptionStart ?? 0) + localDescriptionIndex;
                                                            return (
                                                                <li key={i} data-pagination-description-index={i} className="list-item">
                                                                    <EditableText
                                                                        value={desc}
                                                                        placeholder="성과 및 업무 내용"
                                                                        onChange={(newDesc) => {
                                                                            const updated = [...block.data];
                                                                            const newDescriptions = [...exp.description];
                                                                            newDescriptions[i] = newDesc;
                                                                            updated[expIndex] = { ...exp, description: newDescriptions };
                                                                            updateBlockData(block.id, updated);
                                                                        }}
                                                                        className="inline"
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
                            <p className="text-xs text-neutral-400 italic">경력 항목을 추가해 주세요.</p>
                        )}
                    </div>
                );

            case "project":
                return (
                    <div className="resume-section">
                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                {block.title || "PROJECTS"}{isContinuation && <span className="ml-1 text-[10px] text-neutral-400">— 계속</span>}
                            </h2>
                        </div>
                        {Array.isArray(block.data) && block.data.length > 0 ? (
                            <div className="space-y-3 pt-1">
                                {block.data
                                    .slice(placement.itemStart ?? 0, placement.itemEnd ?? block.data.length)
                                    .map((proj: any, localIndex: number) => {
                                        const projIndex = (placement.itemStart ?? 0) + localIndex;
                                        return (
                                            <div key={proj.id} data-pagination-item-index={projIndex} className="space-y-1">
                                                <div className="flex justify-between items-baseline gap-2">
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
                                                            className="font-bold text-neutral-900 text-sm"
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
                                                            placeholder="종료일"
                                                            onChange={(newDate) => {
                                                                const updated = [...block.data];
                                                                updated[projIndex] = { ...proj, endDate: newDate };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <EditableText
                                                    tag="div"
                                                    value={proj.role}
                                                    placeholder="프로젝트 역할"
                                                    onChange={(newRole) => {
                                                        const updated = [...block.data];
                                                        updated[projIndex] = { ...proj, role: newRole };
                                                        updateBlockData(block.id, updated);
                                                    }}
                                                    className="text-xs font-semibold text-neutral-600"
                                                />
                                                <ul className="list-disc list-inside text-xs text-neutral-700 space-y-1 pt-1">
                                                    {proj.description
                                                        ?.slice(
                                                            placement.descriptionStart ?? 0,
                                                            placement.descriptionEnd ?? proj.description.length
                                                        )
                                                        .map((desc: string, localDescriptionIndex: number) => {
                                                            const i = (placement.descriptionStart ?? 0) + localDescriptionIndex;
                                                            return (
                                                                <li key={i} data-pagination-description-index={i} className="list-item">
                                                                    <EditableText
                                                                        value={desc}
                                                                        placeholder="성과 및 주요 내용"
                                                                        onChange={(newDesc) => {
                                                                            const updated = [...block.data];
                                                                            const newDescriptions = [...proj.description];
                                                                            newDescriptions[i] = newDesc;
                                                                            updated[projIndex] = { ...proj, description: newDescriptions };
                                                                            updateBlockData(block.id, updated);
                                                                        }}
                                                                        className="inline"
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
                return (
                    <div className="resume-section">
                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">{block.title || "SKILLS"}</h2>
                        </div>
                        <div className="resume-skill-categories pt-1">
                            {skillCategories.map((category) => (
                                <div
                                    key={category.id}
                                    className={`resume-skill-category ${category.name ? "" : "resume-skill-category--unnamed"}`}
                                >
                                    {category.name && <strong>{category.name}</strong>}
                                    <div className="flex flex-wrap gap-1.5">
                                        {category.skills.map((skill) => (
                                            <span
                                                key={skill}
                                                style={templateType === "modern" ? { borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}10`, color: primaryColor } : {}}
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${templateType === "modern" ? "border" : "bg-neutral-100 text-neutral-800 border border-neutral-200"
                                                    }`}
                                            >
                                                {skill}
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
                                {block.title || "EDUCATION"}{isContinuation && <span className="ml-1 text-[10px] text-neutral-400">— 계속</span>}
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
                                                            className="font-bold text-neutral-900 text-sm"
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
                                                            placeholder="졸업일"
                                                            onChange={(newDate) => {
                                                                const updated = [...block.data];
                                                                updated[eduIdx] = { ...edu, endDate: newDate };
                                                                updateBlockData(block.id, updated);
                                                            }}
                                                        />
                                                        <span className="text-neutral-400">({edu.status || "졸업"})</span>
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
                    <div className="resume-section">
                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                {block.title || "CERTIFICATIONS"}{isContinuation && <span className="ml-1 text-[10px] text-neutral-400">— 계속</span>}
                            </h2>
                        </div>
                        {Array.isArray(block.data) && block.data.length > 0 ? (
                            <div className="space-y-2 pt-1">
                                {block.data
                                    .slice(placement.itemStart ?? 0, placement.itemEnd ?? block.data.length)
                                    .map((cert: any, localIndex: number) => {
                                        const certIdx = (placement.itemStart ?? 0) + localIndex;
                                        return (
                                            <div key={cert.id} data-pagination-item-index={certIdx} className="flex justify-between items-baseline gap-2">
                                                <div className="flex items-center gap-2">
                                                    <EditableText
                                                        tag="span"
                                                        value={cert.title}
                                                        placeholder="자격증/수상명"
                                                        onChange={(newTitle) => {
                                                            const updated = [...block.data];
                                                            updated[certIdx] = { ...cert, title: newTitle };
                                                            updateBlockData(block.id, updated);
                                                        }}
                                                        className="font-bold text-neutral-900 text-sm"
                                                    />
                                                    {cert.issuer && <span className="text-xs text-neutral-500">({cert.issuer})</span>}
                                                </div>
                                                <EditableText
                                                    value={cert.date}
                                                    placeholder="취득일"
                                                    onChange={(newDate) => {
                                                        const updated = [...block.data];
                                                        updated[certIdx] = { ...cert, date: newDate };
                                                        updateBlockData(block.id, updated);
                                                    }}
                                                    className="text-xs text-neutral-500 font-medium"
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <p className="text-xs text-neutral-400 italic">자격 및 수상 내역을 추가해 주세요.</p>
                        )}
                    </div>
                );

            case "custom_text":
                const paragraphs = String(block.data?.content || "").split("\n");
                const paragraphStart = placement.itemStart ?? 0;
                return (
                    <div className="resume-section">
                        <div className="flex items-center gap-2 border-b border-neutral-200 pb-1.5">
                            {templateType === "modern" && (
                                <span style={{ backgroundColor: primaryColor }} className="w-1.5 h-4 rounded-full inline-block" />
                            )}
                            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                                {block.title}{isContinuation && <span className="ml-1 text-[10px] text-neutral-400">— 계속</span>}
                            </h2>
                        </div>
                        <div className="space-y-1 pt-1">
                            {paragraphs
                                .slice(paragraphStart, placement.itemEnd ?? paragraphs.length)
                                .map((paragraph, localIndex) => {
                                    const paragraphIndex = paragraphStart + localIndex;
                                    return (
                                        <div key={paragraphIndex} data-pagination-item-index={paragraphIndex}>
                                            <EditableText
                                                tag="p"
                                                multiline
                                                value={paragraph}
                                                placeholder="내용을 입력하세요..."
                                                onChange={(newContent) => {
                                                    const updated = [...paragraphs];
                                                    updated[paragraphIndex] = newContent;
                                                    updateBlockData(block.id, { content: updated.join("\n") });
                                                }}
                                                className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line block"
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
        <main
            onClick={() => setSelectedBlockId(null)}
            className="editor-canvas flex-1 bg-[#444444] overflow-y-auto p-8 flex justify-center cursor-default relative"
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
                            {page.blocks.map(({ block, globalIdx, placement }) => {
                                const isSelected = selectedBlockId === block.id;
                                const isBeingDragged = draggedIndex === globalIdx;
                                const isTargeted = dragOverIndex === globalIdx && draggedIndex !== globalIdx;
                                const isHidden = block.isVisible === false;

                                return (
                                    <div
                                        key={block.id}
                                        data-resume-block-index={globalIdx}
                                        data-block-type={block.type}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, globalIdx)}
                                        onDragOver={(e) => handleDragOver(e, globalIdx)}
                                        onDrop={(e) => handleDrop(e, globalIdx)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => setSelectedBlockId(block.id)}
                                        style={{
                                            paddingTop: `${block.style.paddingY}px`,
                                            paddingBottom: `${block.style.paddingY}px`,
                                        }}
                                        className={`resume-block-item relative cursor-pointer transition-[background-color,border-color,box-shadow,opacity,transform] duration-150 ${templateType === "modern"
                                            ? "bg-neutral-50/70 border border-neutral-200/80 rounded-xl px-6 py-5 mb-4 shadow-xs hover:border-neutral-300 hover:shadow-sm"
                                            : "px-4 mb-2 hover:bg-neutral-50/50 rounded"
                                            } ${isSelected ? "resume-block-selected" : ""
                                            } ${isBeingDragged ? "opacity-30 scale-[0.98] border-dashed border-neutral-400" : ""
                                            } ${isTargeted ? "border-t-4 border-t-blue-500 -mt-1" : ""
                                            } ${isHidden ? "opacity-40 grayscale border-dashed border-neutral-300 block-hidden" : ""
                                            } group`}
                                    >
                                        {isHidden && (
                                            <div className="no-print absolute top-2 right-3 flex items-center gap-1 text-[10px] font-semibold text-neutral-500 bg-neutral-200/80 px-2 py-0.5 rounded-full select-none">
                                                숨김 블록
                                            </div>
                                        )}

                                        <div
                                            className="no-print absolute -left-7 top-1/2 -translate-y-1/2 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-neutral-700 cursor-grab active:cursor-grabbing p-1 transition"
                                            title="끌어서 순서 변경"
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

            {/* 캔버스 우측 하단 줌 컨트롤 바 */}
            <div
                className="editor-zoom-controls no-print fixed bottom-6 bg-[#181920]/90 backdrop-blur border border-neutral-700 rounded-full px-3 py-1.5 shadow-xl flex items-center gap-2 z-40"
                style={{ right: 'calc(clamp(380px, 30vw, 480px) + 1.5rem)' }}
            >
                <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 50}
                    className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 transition"
                    title="축소"
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
                    title="확대"
                >
                    <ZoomIn size={14} />
                </button>
                <div className="w-[1px] h-3 bg-neutral-700 mx-0.5" />
                <button
                    onClick={handleZoomReset}
                    className="p-1 text-neutral-400 hover:text-white transition"
                    title="100%로 리셋"
                >
                    <RotateCcw size={12} />
                </button>
            </div>
        </main>
    );
}
