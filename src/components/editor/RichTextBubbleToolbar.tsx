"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bold, Link2, Underline } from "lucide-react";

type RichTextBubbleToolbarProps = {
    editorRef: React.RefObject<HTMLElement | null>;
    onFormat: () => void;
    allowBold?: boolean;
    allowUnderline?: boolean;
    allowLink?: boolean;
};

type ToolbarPosition = { left: number; top: number };

export default function RichTextBubbleToolbar({
    editorRef,
    onFormat,
    allowBold = true,
    allowUnderline = true,
    allowLink = true,
}: RichTextBubbleToolbarProps) {
    const toolbarRef = useRef<HTMLDivElement>(null);
    const linkInputRef = useRef<HTMLInputElement>(null);
    const savedRangeRef = useRef<Range | null>(null);
    const [position, setPosition] = useState<ToolbarPosition | null>(null);
    const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);
    const [linkValue, setLinkValue] = useState("");
    const [linkTitle, setLinkTitle] = useState("");

    const restoreSelection = () => {
        const range = savedRangeRef.current;
        if (!range) return false;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
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
        savedRangeRef.current = range.cloneRange();
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

    const applyCommand = (command: "bold" | "underline") => {
        if (!restoreSelection()) return;
        document.execCommand(command);
        savedRangeRef.current = window.getSelection()?.rangeCount
            ? window.getSelection()!.getRangeAt(0).cloneRange()
            : savedRangeRef.current;
        onFormat();
        updateFromSelection();
    };

    const openLinkEditor = () => {
        restoreSelection();
        const selection = window.getSelection();
        const anchorNode = selection?.anchorNode;
        const anchorElement = anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement;
        const anchor = anchorElement?.closest("a");
        setLinkValue(anchor?.getAttribute("href") || "");
        setLinkTitle(anchor?.textContent || selection?.toString() || "");
        setIsLinkEditorOpen(true);
    };

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
                if (linkTitle.trim()) anchor.textContent = linkTitle.trim();
            } else {
                const selectedText = range.toString();
                const selectedContents = range.extractContents();
                anchor = document.createElement("a");
                anchor.href = href;
                anchor.target = "_blank";
                anchor.rel = "noopener noreferrer";
                if (linkTitle.trim() && linkTitle.trim() !== selectedText) {
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
                            aria-label="볼드"
                            data-tooltip="볼드 (Ctrl/⌘ + B)"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyCommand("bold")}
                        >
                            <Bold size={15} />
                        </button>
                    )}
                    {allowUnderline && (
                        <button
                            type="button"
                            aria-label="밑줄"
                            data-tooltip="밑줄 (Ctrl/⌘ + U)"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyCommand("underline")}
                        >
                            <Underline size={15} />
                        </button>
                    )}
                    {allowLink && (
                        <button
                            type="button"
                            aria-label="링크"
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
