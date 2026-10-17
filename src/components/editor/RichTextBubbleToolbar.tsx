"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link2, Tag } from "lucide-react";

type RichTextBubbleToolbarProps = {
    editorRef: React.RefObject<HTMLElement | null>;
    onFormat: () => void;
    allowBold?: boolean;
    allowLink?: boolean;
};

type ToolbarPosition = { left: number; top: number };
type ActiveFormats = { bold: boolean; accent: boolean; skill: boolean; link: boolean };
type SelectionOffsets = { start: number; end: number };

export default function RichTextBubbleToolbar({
    editorRef,
    onFormat,
    allowBold = true,
    allowLink = true,
}: RichTextBubbleToolbarProps) {
    const toolbarRef = useRef<HTMLDivElement>(null);
    const linkInputRef = useRef<HTMLInputElement>(null);
    const savedRangeRef = useRef<Range | null>(null);
    const selectionOffsetsRef = useRef<SelectionOffsets | null>(null);
    const originalLinkTitleRef = useRef("");
    const [position, setPosition] = useState<ToolbarPosition | null>(null);
    const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);
    const [linkValue, setLinkValue] = useState("");
    const [linkTitle, setLinkTitle] = useState("");
    const [accentColor, setAccentColor] = useState("#2f80c3");
    const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
        bold: false,
        accent: false,
        skill: false,
        link: false,
    });

    const getSelectionOffsets = (editor: HTMLElement, range: Range): SelectionOffsets => {
        const beforeStart = document.createRange();
        beforeStart.selectNodeContents(editor);
        beforeStart.setEnd(range.startContainer, range.startOffset);
        const beforeEnd = document.createRange();
        beforeEnd.selectNodeContents(editor);
        beforeEnd.setEnd(range.endContainer, range.endOffset);
        return { start: beforeStart.toString().length, end: beforeEnd.toString().length };
    };

    const createRangeFromOffsets = (editor: HTMLElement, offsets: SelectionOffsets) => {
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let consumed = 0;
        let startSet = false;
        let node = walker.nextNode();

        while (node) {
            const next = consumed + (node.textContent?.length || 0);
            if (!startSet && offsets.start <= next) {
                range.setStart(node, Math.max(0, offsets.start - consumed));
                startSet = true;
            }
            if (startSet && offsets.end <= next) {
                range.setEnd(node, Math.max(0, offsets.end - consumed));
                return range;
            }
            consumed = next;
            node = walker.nextNode();
        }
        return null;
    };

    const restoreSelection = () => {
        const editor = editorRef.current;
        const offsets = selectionOffsetsRef.current;
        const range = editor && offsets ? createRangeFromOffsets(editor, offsets) : savedRangeRef.current;
        if (!range) return false;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        savedRangeRef.current = range.cloneRange();
        return true;
    };

    const updateFromSelection = () => {
        const editor = editorRef.current;
        const toolbar = toolbarRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
            if (!toolbar?.contains(document.activeElement)) setPosition(null);
            return;
        }

        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) {
            if (!toolbar?.contains(document.activeElement)) setPosition(null);
            return;
        }

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        const selectionElement = range.startContainer instanceof HTMLElement
            ? range.startContainer
            : range.startContainer.parentElement;
        setActiveFormats({
            bold: document.queryCommandState("bold"),
            accent: Boolean(selectionElement?.closest('[data-resume-accent="true"]')),
            skill: Boolean(selectionElement?.closest('[data-resume-skill="true"]')),
            link: Boolean(selectionElement?.closest("a")),
        });
        const resumePaper = editor.closest<HTMLElement>(".resume-paper");
        if (resumePaper) {
            const currentAccent = getComputedStyle(resumePaper).getPropertyValue("--resume-blue").trim();
            if (currentAccent) setAccentColor(currentAccent);
        }
        savedRangeRef.current = range.cloneRange();
        selectionOffsetsRef.current = getSelectionOffsets(editor, range);
        setPosition({
            left: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
            top: Math.max(12, rect.top - 10),
        });
    };

    useEffect(() => {
        const editor = editorRef.current;
        const handleOpenLinkEditor = () => openLinkEditor();
        document.addEventListener("selectionchange", updateFromSelection);
        window.addEventListener("resize", updateFromSelection);
        window.addEventListener("scroll", updateFromSelection, true);
        editor?.addEventListener("open-rich-text-link", handleOpenLinkEditor);
        return () => {
            document.removeEventListener("selectionchange", updateFromSelection);
            window.removeEventListener("resize", updateFromSelection);
            window.removeEventListener("scroll", updateFromSelection, true);
            editor?.removeEventListener("open-rich-text-link", handleOpenLinkEditor);
        };
    });

    useLayoutEffect(() => {
        if (isLinkEditorOpen) linkInputRef.current?.focus();
    }, [isLinkEditorOpen]);

    const applyBold = () => {
        if (!restoreSelection()) return;
        document.execCommand("bold");
        savedRangeRef.current = window.getSelection()?.rangeCount
            ? window.getSelection()!.getRangeAt(0).cloneRange()
            : savedRangeRef.current;
        onFormat();
        updateFromSelection();
    };

    const applyAccentColor = () => {
        if (!restoreSelection()) return;
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        if (!range || range.collapsed) return;

        const accent = document.createElement("span");
        accent.dataset.resumeAccent = "true";
        accent.append(range.extractContents());
        range.insertNode(accent);

        const nextRange = document.createRange();
        nextRange.selectNodeContents(accent);
        selection?.removeAllRanges();
        selection?.addRange(nextRange);
        savedRangeRef.current = nextRange.cloneRange();
        onFormat();
        updateFromSelection();
    };

    const toggleSkillTag = () => {
        if (!restoreSelection()) return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        if (!editor || !range || range.collapsed) return;

        const closestSkillTag = (node: Node | null) => {
            const element = node instanceof HTMLElement ? node : node?.parentElement;
            return element?.closest<HTMLElement>('[data-resume-skill="true"]') || null;
        };
        const intersectingTag = Array.from(
            editor.querySelectorAll<HTMLElement>('[data-resume-skill="true"]'),
        ).find((tag) => {
            try {
                return range.intersectsNode(tag);
            } catch {
                return false;
            }
        }) || null;
        const existingTag = closestSkillTag(range.startContainer)
            || closestSkillTag(range.endContainer)
            || closestSkillTag(range.commonAncestorContainer)
            || intersectingTag;

        if (existingTag && editor.contains(existingTag)) {
            const contents = document.createDocumentFragment();
            while (existingTag.firstChild) contents.append(existingTag.firstChild);
            const firstNode = contents.firstChild;
            const lastNode = contents.lastChild;
            existingTag.replaceWith(contents);
            if (firstNode && lastNode) {
                const nextRange = document.createRange();
                nextRange.setStartBefore(firstNode);
                nextRange.setEndAfter(lastNode);
                selection?.removeAllRanges();
                selection?.addRange(nextRange);
                savedRangeRef.current = nextRange.cloneRange();
            }
        } else {
            const tag = document.createElement("span");
            tag.dataset.resumeSkill = "true";
            tag.append(range.extractContents());
            range.insertNode(tag);

            const nextRange = document.createRange();
            nextRange.selectNodeContents(tag);
            selection?.removeAllRanges();
            selection?.addRange(nextRange);
            savedRangeRef.current = nextRange.cloneRange();
        }

        onFormat();
        updateFromSelection();
    };

    function openLinkEditor() {
        restoreSelection();
        const selection = window.getSelection();
        const anchorNode = selection?.anchorNode;
        const anchorElement = anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement;
        const anchor = anchorElement?.closest("a");
        setLinkValue(anchor?.getAttribute("href") || "");
        const selectedTitle = anchor?.textContent || selection?.toString() || "";
        originalLinkTitleRef.current = selectedTitle;
        setLinkTitle(selectedTitle);
        setIsLinkEditorOpen(true);
    }

    const applyLink = () => {
        if (!restoreSelection()) return;
        const trimmed = linkValue.trim();
        if (!trimmed) {
            removeLink();
            return;
        } else {
            const href = /^(https?:\/\/|mailto:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
            const selection = window.getSelection();
            const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
            if (!range) return;
            const rangeContainer = range.commonAncestorContainer;
            const rangeElement = rangeContainer instanceof HTMLElement
                ? rangeContainer
                : rangeContainer.parentElement;
            let anchor = rangeElement?.closest<HTMLAnchorElement>("a") || null;

            if (anchor) {
                anchor.href = href;
                anchor.target = "_blank";
                anchor.rel = "noopener noreferrer";
                if (linkTitle.trim() && linkTitle.trim() !== originalLinkTitleRef.current.trim()) {
                    anchor.textContent = linkTitle.trim();
                }
            } else {
                const selectedContents = range.extractContents();
                anchor = document.createElement("a");
                anchor.href = href;
                anchor.target = "_blank";
                anchor.rel = "noopener noreferrer";
                if (linkTitle.trim() && linkTitle.trim() !== originalLinkTitleRef.current.trim()) {
                    anchor.textContent = linkTitle.trim();
                } else {
                    anchor.append(selectedContents);
                }
                range.insertNode(anchor);
            }

            const nextRange = document.createRange();
            nextRange.selectNodeContents(anchor);
            selection?.removeAllRanges();
            selection?.addRange(nextRange);
            savedRangeRef.current = nextRange.cloneRange();
        }
        setIsLinkEditorOpen(false);
        onFormat();
        updateFromSelection();
    };

    const removeLink = () => {
        if (!restoreSelection()) return;
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const rangeContainer = range?.commonAncestorContainer;
        const rangeElement = rangeContainer instanceof HTMLElement
            ? rangeContainer
            : rangeContainer?.parentElement;
        const anchor = rangeElement?.closest<HTMLAnchorElement>("a");
        if (anchor) anchor.replaceWith(...Array.from(anchor.childNodes));
        setLinkValue("");
        setLinkTitle("");
        setIsLinkEditorOpen(false);
        onFormat();
        updateFromSelection();
    };

    if (!position || typeof document === "undefined") return null;

    return createPortal(
        <div
            ref={toolbarRef}
            className="rich-text-bubble-toolbar"
            style={{ left: position.left, top: position.top }}
            role="toolbar"
            aria-label="텍스트 서식"
            onPointerDown={(event) => event.stopPropagation()}
        >
            {!isLinkEditorOpen ? (
                <>
                    {allowBold && (
                        <button
                            type="button"
                            className={activeFormats.bold ? "is-active" : undefined}
                            aria-label="볼드"
                            aria-pressed={activeFormats.bold}
                            data-tooltip="볼드 (Ctrl/⌘ + B)"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={applyBold}
                        >
                            <span className="rich-text-bubble-toolbar__bold-letter" aria-hidden="true">B</span>
                        </button>
                    )}
                    <button
                        type="button"
                        className={`rich-text-bubble-toolbar__accent${activeFormats.accent ? " is-active" : ""}`}
                        style={{ color: accentColor }}
                        aria-label="포인트 색상"
                        aria-pressed={activeFormats.accent}
                        data-tooltip="포인트 색상"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={applyAccentColor}
                    >
                        <span className="rich-text-bubble-toolbar__accent-letter" aria-hidden="true">A</span>
                    </button>
                    <button
                        type="button"
                        className={activeFormats.skill ? "is-active" : undefined}
                        aria-label="기술 태그"
                        aria-pressed={activeFormats.skill}
                        data-tooltip="기술 태그"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={toggleSkillTag}
                    >
                        <Tag size={15} />
                    </button>
                    {allowLink && (
                        <button
                            type="button"
                            className={activeFormats.link ? "is-active" : undefined}
                            aria-label="링크"
                            aria-pressed={activeFormats.link}
                            data-tooltip="링크 (Ctrl/⌘ + K)"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={openLinkEditor}
                        >
                            <Link2 size={15} />
                        </button>
                    )}
                </>
            ) : (
                <form
                    className="rich-text-bubble-toolbar__link-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        applyLink();
                    }}
                >
                    <label>
                        <span>페이지 또는 URL</span>
                        <input
                            ref={linkInputRef}
                            value={linkValue}
                            onChange={(event) => setLinkValue(event.target.value)}
                            placeholder="https://example.com"
                            aria-label="링크 주소"
                            onKeyDown={(event) => {
                                if (event.key === "Escape") setIsLinkEditorOpen(false);
                            }}
                        />
                    </label>
                    <label>
                        <span>링크 제목</span>
                        <input
                            value={linkTitle}
                            onChange={(event) => setLinkTitle(event.target.value)}
                            placeholder="표시할 텍스트"
                            aria-label="링크 제목"
                        />
                    </label>
                    <div className="rich-text-bubble-toolbar__link-actions">
                        <button type="submit">적용</button>
                        <button type="button" onClick={removeLink}>링크 제거</button>
                    </div>
                </form>
            )}
        </div>,
        document.body,
    );
}
