"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { escapeHtml, richTextToPlainText, sanitizeInlineRichText } from "@/lib/richText";
import RichTextBubbleToolbar from "@/components/editor/RichTextBubbleToolbar";

type ProjectBulletDocumentEditorProps = {
    descriptions: string[];
    levels?: number[];
    html?: string[];
    onChange: (descriptions: string[], levels: number[], html: string[]) => void;
    maxLevel?: 1 | 2 | 3;
    allowBold?: boolean;
    placeholder?: string;
    ariaLabel?: string;
};

const clampLevel = (level: number) => Math.max(1, Math.min(3, level || 1));
const markerForLevel = (level: number) => level === 1 ? "▪" : level === 2 ? "•" : "–";
const pastedBulletPattern = /^(\s*)(▪|■|□|•|●|○|◦|‣|[-–—*]|\d+[.)])\s*(.*)$/;

const parsePastedLine = (line: string, fallbackLevel: number) => {
    const match = line.match(pastedBulletPattern);
    if (!match) return { text: line.trim(), level: fallbackLevel };

    const [, indentation, marker, text] = match;
    const indentationLevel = Math.floor(indentation.replace(/\t/g, "  ").length / 2) + 1;
    const markerLevel = /^(▪|■|□)$/.test(marker)
        ? 1
        : /^(•|●|○|◦|‣)$/.test(marker)
            ? 2
            : /^(?:-|–|—)$/.test(marker)
                ? 3
                : fallbackLevel;
    return { text: text.trim(), level: clampLevel(Math.max(indentationLevel, markerLevel)) };
};

export default function ProjectBulletDocumentEditor({
    descriptions,
    levels = [],
    html = [],
    onChange,
    maxLevel = 3,
    allowBold = true,
    placeholder = "프로젝트의 핵심 기여와 성과를 입력하세요",
    ariaLabel = "프로젝트 기여 및 성과",
}: ProjectBulletDocumentEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const clampDocumentLevel = (level: number) => Math.max(1, Math.min(maxLevel, clampLevel(level)));

    const readDocument = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const rows = Array.from(editor.querySelectorAll<HTMLElement>("[data-project-bullet-row]"));
        const nextHtml = rows.map((row) => sanitizeInlineRichText(
            row.querySelector<HTMLElement>("[data-project-bullet-content]")?.innerHTML || "",
        ));
        const nextLevels = rows.map((row) => clampDocumentLevel(Number(row.dataset.level)));
        const nextDescriptions = nextHtml.map(richTextToPlainText);
        const meaningfulIndexes = nextDescriptions
            .map((description, index) => description.trim() ? index : -1)
            .filter((index) => index >= 0);
        const normalizedDescriptions = meaningfulIndexes.map((index) => nextDescriptions[index]);
        const normalizedLevels = meaningfulIndexes.map((index) => nextLevels[index]);
        const normalizedHtml = meaningfulIndexes.map((index) => nextHtml[index]);
        const currentDescriptions = descriptions;
        const currentLevels = currentDescriptions.map((_, index) => clampDocumentLevel(Number(levels[index]) || 1));
        const currentHtml = currentDescriptions.map((description, index) => (
            sanitizeInlineRichText(html[index] || escapeHtml(description))
        ));

        if (JSON.stringify(normalizedDescriptions) === JSON.stringify(currentDescriptions)
            && JSON.stringify(normalizedLevels) === JSON.stringify(currentLevels)
            && JSON.stringify(normalizedHtml) === JSON.stringify(currentHtml)) return;

        onChange(normalizedDescriptions, normalizedLevels, normalizedHtml);
    };

    const createRow = (level: number, contentHtml = "") => {
        const row = document.createElement("div");
        row.className = "project-bullet-editor__row";
        row.dataset.projectBulletRow = "";
        row.dataset.level = String(level);
        row.style.paddingLeft = `${(level - 1) * 18}px`;

        const marker = document.createElement("span");
        marker.className = "project-bullet-editor__marker";
        marker.contentEditable = "false";
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = markerForLevel(level);

        const content = document.createElement("span");
        content.className = "project-bullet-editor__content";
        content.dataset.projectBulletContent = "";
        content.dataset.placeholder = placeholder;
        content.innerHTML = sanitizeInlineRichText(contentHtml) || "<br>";

        row.append(marker, content);
        return row;
    };

    const setActiveContent = (content: HTMLElement | null) => {
        editorRef.current
            ?.querySelectorAll<HTMLElement>("[data-project-bullet-content]")
            .forEach((element) => element.classList.toggle("is-active", element === content));
    };

    const setRowLevel = (row: HTMLElement, requestedLevel: number) => {
        const previousRow = row.previousElementSibling as HTMLElement | null;
        const previousLevel = previousRow ? clampDocumentLevel(Number(previousRow.dataset.level)) : 1;
        const allowedLevel = previousRow ? Math.min(maxLevel, previousLevel + 1) : 1;
        const level = Math.max(1, Math.min(allowedLevel, requestedLevel));
        row.dataset.level = String(level);
        row.style.paddingLeft = `${(level - 1) * 18}px`;
        const marker = row.querySelector<HTMLElement>(".project-bullet-editor__marker");
        if (marker) marker.textContent = markerForLevel(level);
    };

    const placeCaret = (element: HTMLElement, atEnd = false) => {
        setActiveContent(element);
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(!atEnd);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        editorRef.current?.focus();
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        const plainText = event.clipboardData.getData("text/plain").replace(/\r/g, "");
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const editorRows = Array.from(
            editorRef.current?.querySelectorAll<HTMLElement>("[data-project-bullet-row]") || [],
        );
        const selectedRows = range
            ? editorRows.filter((row) => {
                try {
                    return range.intersectsNode(row);
                } catch {
                    return false;
                }
            })
            : [];
        const anchor = selection?.anchorNode;
        const anchorElement = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
        const currentRow = selectedRows[0]
            || anchorElement?.closest<HTMLElement>("[data-project-bullet-row]")
            || editorRows[0];
        const currentContent = currentRow?.querySelector<HTMLElement>("[data-project-bullet-content]");
        if (!currentRow || !currentContent) return;

        const fallbackLevel = clampDocumentLevel(Number(currentRow.dataset.level));
        const lines = plainText
            .split("\n")
            .map((line) => parsePastedLine(line, fallbackLevel))
            .filter((line) => line.text.length > 0);
        if (lines.length === 0) return;

        const replacesMultipleRows = selectedRows.length > 1
            || Boolean(range && !currentContent.contains(range.commonAncestorContainer));

        if (replacesMultipleRows) {
            selectedRows
                .filter((row) => row !== currentRow)
                .forEach((row) => row.remove());
            currentContent.textContent = lines[0].text;
        } else if (range && currentContent.contains(range.commonAncestorContainer)) {
            range.deleteContents();
            const textNode = document.createTextNode(lines[0].text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
        } else {
            currentContent.textContent = lines[0].text;
        }
        setRowLevel(currentRow, lines[0].level);

        let previousRow = currentRow;
        let lastContent = currentContent;
        lines.slice(1).forEach((line) => {
            const nextRow = createRow(clampDocumentLevel(line.level), escapeHtml(line.text));
            previousRow.after(nextRow);
            previousRow = nextRow;
            lastContent = nextRow.querySelector<HTMLElement>("[data-project-bullet-content]")!;
        });

        placeCaret(lastContent, true);
        readDocument();
    };

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor || document.activeElement === editor || editor.contains(document.activeElement)) return;
        editor.replaceChildren(...(descriptions.length > 0 ? descriptions : [""]).map((description, index) => (
            createRow(
                clampDocumentLevel(Number(levels[index]) || 1),
                html[index] || escapeHtml(description),
            )
        )));
    }, [descriptions, levels, html]);

    useEffect(() => {
        const meaningfulIndexes = descriptions
            .map((description, index) => description.trim() ? index : -1)
            .filter((index) => index >= 0);
        if (meaningfulIndexes.length === descriptions.length) return;

        onChange(
            meaningfulIndexes.map((index) => descriptions[index]),
            meaningfulIndexes.map((index) => clampDocumentLevel(Number(levels[index]) || 1)),
            meaningfulIndexes.map((index) => sanitizeInlineRichText(
                html[index] || escapeHtml(descriptions[index]),
            )),
        );
    }, [descriptions, levels, html, onChange]);

    return (
        <>
        <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="project-bullet-editor"
            role="textbox"
            aria-label={ariaLabel}
            aria-multiline="true"
            onMouseDown={(event) => {
                if (event.detail !== 3) return;
                const target = event.target as HTMLElement;
                const content = target.closest<HTMLElement>("[data-project-bullet-content]");
                if (!content) return;

                event.preventDefault();
                setActiveContent(content);
                const range = document.createRange();
                range.selectNodeContents(content);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            }}
            onPointerDown={(event) => {
                const target = event.target as HTMLElement;
                setActiveContent(target.closest<HTMLElement>("[data-project-bullet-content]"));
            }}
            onClick={(event) => {
                const target = event.target as HTMLElement;
                const anchor = target.closest<HTMLAnchorElement>("a");
                if (!anchor || !editorRef.current?.contains(anchor)) return;
                event.preventDefault();
                const range = document.createRange();
                range.selectNodeContents(anchor);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                editorRef.current.dispatchEvent(new CustomEvent("open-rich-text-link"));
            }}
            onPaste={handlePaste}
            onInput={readDocument}
            onBlur={() => {
                setActiveContent(null);
                readDocument();
            }}
            onKeyDown={(event) => {
                const selection = window.getSelection();
                const anchor = selection?.anchorNode;
                const anchorElement = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
                const row = anchorElement?.closest<HTMLElement>("[data-project-bullet-row]");
                const content = row?.querySelector<HTMLElement>("[data-project-bullet-content]");
                if (!row || !content) return;
                setActiveContent(content);

                if (allowBold && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
                    event.preventDefault();
                    document.execCommand("bold");
                    readDocument();
                    return;
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
                    event.preventDefault();
                    document.execCommand("underline");
                    readDocument();
                    return;
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                    event.preventDefault();
                    editorRef.current?.dispatchEvent(new CustomEvent("open-rich-text-link"));
                    return;
                }
                if (event.key === "Tab" || event.code === "Tab") {
                    if (maxLevel === 1) return;
                    event.preventDefault();
                    setRowLevel(row, clampDocumentLevel(Number(row.dataset.level)) + (event.shiftKey ? -1 : 1));
                    placeCaret(content, true);
                    readDocument();
                    return;
                }
                if (event.key === "Enter") {
                    event.preventDefault();
                    const nextRow = createRow(clampDocumentLevel(Number(row.dataset.level)));
                    row.after(nextRow);
                    placeCaret(nextRow.querySelector<HTMLElement>("[data-project-bullet-content]")!);
                    readDocument();
                    return;
                }
                if (event.key === "Backspace" && !content.textContent) {
                    event.preventDefault();
                    const level = clampDocumentLevel(Number(row.dataset.level));
                    if (level > 1) {
                        setRowLevel(row, level - 1);
                        placeCaret(content);
                        readDocument();
                        return;
                    }
                    const previousContent = row.previousElementSibling?.querySelector<HTMLElement>("[data-project-bullet-content]");
                    if (previousContent) {
                        row.remove();
                        placeCaret(previousContent, true);
                        readDocument();
                    }
                }
            }}
        />
        <RichTextBubbleToolbar
            editorRef={editorRef}
            onFormat={readDocument}
            allowBold={allowBold}
        />
        </>
    );
}
