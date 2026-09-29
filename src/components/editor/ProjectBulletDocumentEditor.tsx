"use client";

import { useLayoutEffect, useRef } from "react";
import { escapeHtml, richTextToPlainText, sanitizeInlineRichText } from "@/lib/richText";

type ProjectBulletDocumentEditorProps = {
    descriptions: string[];
    levels?: number[];
    html?: string[];
    onChange: (descriptions: string[], levels: number[], html: string[]) => void;
};

const clampLevel = (level: number) => Math.max(1, Math.min(3, level || 1));
const markerForLevel = (level: number) => level === 1 ? "▪" : level === 2 ? "•" : "–";

export default function ProjectBulletDocumentEditor({
    descriptions,
    levels = [],
    html = [],
    onChange,
}: ProjectBulletDocumentEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    const readDocument = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const rows = Array.from(editor.querySelectorAll<HTMLElement>("[data-project-bullet-row]"));
        const nextHtml = rows.map((row) => sanitizeInlineRichText(
            row.querySelector<HTMLElement>("[data-project-bullet-content]")?.innerHTML || "",
        ));
        const nextLevels = rows.map((row) => clampLevel(Number(row.dataset.level)));
        const nextDescriptions = nextHtml.map(richTextToPlainText);
        onChange(
            nextDescriptions.length > 0 ? nextDescriptions : [""],
            nextLevels.length > 0 ? nextLevels : [1],
            nextHtml.length > 0 ? nextHtml : [""],
        );
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
        content.innerHTML = sanitizeInlineRichText(contentHtml) || "<br>";

        row.append(marker, content);
        return row;
    };

    const setRowLevel = (row: HTMLElement, requestedLevel: number) => {
        const previousRow = row.previousElementSibling as HTMLElement | null;
        const previousLevel = previousRow ? clampLevel(Number(previousRow.dataset.level)) : 1;
        const maxLevel = previousRow ? Math.min(3, previousLevel + 1) : 1;
        const level = Math.max(1, Math.min(maxLevel, requestedLevel));
        row.dataset.level = String(level);
        row.style.paddingLeft = `${(level - 1) * 18}px`;
        const marker = row.querySelector<HTMLElement>(".project-bullet-editor__marker");
        if (marker) marker.textContent = markerForLevel(level);
    };

    const placeCaret = (element: HTMLElement, atEnd = false) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(!atEnd);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        editorRef.current?.focus();
    };

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor || document.activeElement === editor || editor.contains(document.activeElement)) return;
        editor.replaceChildren(...(descriptions.length > 0 ? descriptions : [""]).map((description, index) => (
            createRow(
                clampLevel(Number(levels[index]) || 1),
                html[index] || escapeHtml(description),
            )
        )));
    }, [descriptions, levels, html]);

    return (
        <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="project-bullet-editor"
            role="textbox"
            aria-label="프로젝트 기여 및 성과"
            aria-multiline="true"
            onInput={readDocument}
            onBlur={readDocument}
            onKeyDown={(event) => {
                const selection = window.getSelection();
                const anchor = selection?.anchorNode;
                const anchorElement = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
                const row = anchorElement?.closest<HTMLElement>("[data-project-bullet-row]");
                const content = row?.querySelector<HTMLElement>("[data-project-bullet-content]");
                if (!row || !content) return;

                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
                    event.preventDefault();
                    document.execCommand("bold");
                    return;
                }
                if (event.key === "Tab" || event.code === "Tab") {
                    event.preventDefault();
                    setRowLevel(row, clampLevel(Number(row.dataset.level)) + (event.shiftKey ? -1 : 1));
                    readDocument();
                    placeCaret(content, true);
                    return;
                }
                if (event.key === "Enter") {
                    event.preventDefault();
                    const nextRow = createRow(clampLevel(Number(row.dataset.level)));
                    row.after(nextRow);
                    readDocument();
                    placeCaret(nextRow.querySelector<HTMLElement>("[data-project-bullet-content]")!);
                    return;
                }
                if (event.key === "Backspace" && !content.textContent) {
                    event.preventDefault();
                    const level = clampLevel(Number(row.dataset.level));
                    if (level > 1) {
                        setRowLevel(row, level - 1);
                        readDocument();
                        placeCaret(content);
                        return;
                    }
                    const previousContent = row.previousElementSibling?.querySelector<HTMLElement>("[data-project-bullet-content]");
                    if (previousContent) {
                        row.remove();
                        readDocument();
                        placeCaret(previousContent, true);
                    }
                }
            }}
        />
    );
}
