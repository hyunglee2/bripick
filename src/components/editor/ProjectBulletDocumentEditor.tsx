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
    variant?: "inspector" | "resume";
    readOnly?: boolean;
    descriptionStart?: number;
    className?: string;
};

const clampLevel = (level: number) => Math.max(1, Math.min(3, level || 1));
const markerForLevel = (level: number) => level === 1 ? "▪" : level === 2 ? "•" : "–";
const pastedBulletPattern = /^(\s*)(▪|■|□|•|●|○|◦|‣|[-–—*]|\d+[.)])\s*(.*)$/;

type PastedBullet = { text: string; level: number };

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

const parsePastedHtml = (clipboardHtml: string): PastedBullet[] => {
    if (!clipboardHtml.trim()) return [];

    const document = new DOMParser().parseFromString(clipboardHtml, "text/html");
    const editorRows = Array.from(document.querySelectorAll<HTMLElement>("[data-project-bullet-row]"));
    if (editorRows.length > 0) {
        return editorRows
            .map((row) => ({
                text: row.querySelector<HTMLElement>("[data-project-bullet-content]")?.textContent?.trim() || "",
                level: clampLevel(Number(row.dataset.level) || 1),
            }))
            .filter((item) => item.text.length > 0);
    }

    return Array.from(document.querySelectorAll<HTMLLIElement>("li"))
        .map((item) => {
            const explicitLevel = Number(item.dataset.bulletLevel || item.dataset.level);
            let nestedLevel = 1;
            let ancestor = item.parentElement?.closest("li");
            while (ancestor) {
                nestedLevel += 1;
                ancestor = ancestor.parentElement?.closest("li");
            }

            const content = item.cloneNode(true) as HTMLLIElement;
            content.querySelectorAll("ul, ol").forEach((list) => list.remove());
            content.querySelectorAll('[aria-hidden="true"]').forEach((marker) => marker.remove());

            return {
                text: content.textContent?.trim() || "",
                level: clampLevel(Number.isFinite(explicitLevel) && explicitLevel > 0 ? explicitLevel : nestedLevel),
            };
        })
        .filter((item) => item.text.length > 0);
};

const mergePastedLines = (
    plainText: string,
    htmlBullets: PastedBullet[],
    fallbackLevel: number,
): PastedBullet[] => {
    const plainLines = plainText
        .split("\n")
        .map((line) => parsePastedLine(line, fallbackLevel))
        .filter((line) => line.text.length > 0);
    if (htmlBullets.length === 0) return plainLines;
    if (plainLines.length === 0) return htmlBullets;

    const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();
    const unmatchedHtmlBullets = [...htmlBullets];

    return plainLines.map((line) => {
        const normalizedLine = normalizeText(line.text);
        const matchingIndex = unmatchedHtmlBullets.findIndex(
            (htmlBullet) => normalizeText(htmlBullet.text) === normalizedLine,
        );
        if (matchingIndex < 0) return line;

        const [matchingHtmlBullet] = unmatchedHtmlBullets.splice(matchingIndex, 1);
        return { ...line, level: matchingHtmlBullet.level };
    });
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
    variant = "inspector",
    readOnly = false,
    descriptionStart = 0,
    className = "",
}: ProjectBulletDocumentEditorProps) {
    const editorRef = useRef<HTMLElement>(null);
    const lastEmittedDocumentRef = useRef<string | null>(null);
    const clampDocumentLevel = (level: number) => Math.max(1, Math.min(maxLevel, clampLevel(level)));

    const documentSignature = (nextDescriptions: string[], nextLevels: number[], nextHtml: string[]) => JSON.stringify({
        descriptions: nextDescriptions,
        levels: nextLevels,
        html: nextHtml,
    });

    const readDocument = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const rows = Array.from(editor.querySelectorAll<HTMLElement>("[data-project-bullet-row]"));
        const nextHtml = rows.map((row) => sanitizeInlineRichText(
            row.querySelector<HTMLElement>("[data-project-bullet-content]")?.innerHTML || "",
        ));
        rows.forEach((row, index) => {
            const content = row.querySelector<HTMLElement>("[data-project-bullet-content]");
            if (content) content.dataset.empty = richTextToPlainText(nextHtml[index]).trim() ? "false" : "true";
        });
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

        lastEmittedDocumentRef.current = documentSignature(
            normalizedDescriptions,
            normalizedLevels,
            normalizedHtml,
        );
        onChange(normalizedDescriptions, normalizedLevels, normalizedHtml);
    };

    const createRow = (level: number, contentHtml = "", descriptionIndex = 0) => {
        const row = document.createElement(variant === "resume" ? "li" : "div");
        row.className = variant === "resume" ? "" : "project-bullet-editor__row";
        row.dataset.projectBulletRow = "";
        row.dataset.level = String(level);
        row.dataset.bulletLevel = String(level);
        if (variant === "resume") {
            row.dataset.paginationDescriptionIndex = String(descriptionStart + descriptionIndex);
            row.classList.add("list-item");
        } else {
            row.style.paddingLeft = `${(level - 1) * 18}px`;
        }

        const marker = document.createElement("span");
        marker.className = "project-bullet-editor__marker";
        marker.contentEditable = "false";
        marker.setAttribute("aria-hidden", "true");
        marker.textContent = markerForLevel(level);

        const content = document.createElement("span");
        content.className = variant === "resume"
            ? "resume-rich-bullet inline cursor-text rounded-sm outline-none"
            : "project-bullet-editor__content";
        content.dataset.projectBulletContent = "";
        content.dataset.placeholder = placeholder;
        content.innerHTML = sanitizeInlineRichText(contentHtml) || "<br>";
        content.dataset.empty = richTextToPlainText(contentHtml).trim() ? "false" : "true";

        if (variant === "resume") {
            row.append(content);
        } else {
            row.append(marker, content);
        }
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
        row.dataset.bulletLevel = String(level);
        if (variant !== "resume") row.style.paddingLeft = `${(level - 1) * 18}px`;
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

    const handlePaste = (event: React.ClipboardEvent<HTMLElement>) => {
        event.preventDefault();
        const plainText = event.clipboardData.getData("text/plain").replace(/\r/g, "");
        const htmlBullets = parsePastedHtml(event.clipboardData.getData("text/html"));
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
        const lines = mergePastedLines(plainText, htmlBullets, fallbackLevel)
            .map((line) => ({ ...line, level: clampDocumentLevel(line.level) }));
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

    // readDocument와 같은 방식으로 지금 화면에 있는 내용을 서명으로 만든다.
    const readDomSignature = (editor: HTMLElement) => {
        const rows = Array.from(editor.querySelectorAll<HTMLElement>("[data-project-bullet-row]"));
        const entries = rows.map((row) => {
            const rowHtml = sanitizeInlineRichText(
                row.querySelector<HTMLElement>("[data-project-bullet-content]")?.innerHTML || "",
            );
            return {
                description: richTextToPlainText(rowHtml),
                level: clampDocumentLevel(Number(row.dataset.level)),
                html: rowHtml,
            };
        }).filter((entry) => entry.description.trim());
        return documentSignature(
            entries.map((entry) => entry.description),
            entries.map((entry) => entry.level),
            entries.map((entry) => entry.html),
        );
    };

    // 불릿 순서와 그 안의 글자 위치로 커서를 기억했다가, 내용을 다시 그린 뒤 같은 자리에 돌려놓는다.
    const saveCaret = (editor: HTMLElement) => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return null;
        const range = selection.getRangeAt(0);
        const contents = Array.from(editor.querySelectorAll<HTMLElement>("[data-project-bullet-content]"));
        const rowIndex = contents.findIndex((content) => content.contains(range.startContainer));
        if (rowIndex < 0) return null;
        const measure = document.createRange();
        measure.selectNodeContents(contents[rowIndex]);
        measure.setEnd(range.startContainer, range.startOffset);
        return { rowIndex, offset: measure.toString().length };
    };

    const restoreCaret = (editor: HTMLElement, caret: { rowIndex: number; offset: number }) => {
        const contents = Array.from(editor.querySelectorAll<HTMLElement>("[data-project-bullet-content]"));
        const content = contents[Math.min(caret.rowIndex, contents.length - 1)];
        if (!content) return;
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        let remaining = caret.offset;
        let node = walker.nextNode();
        while (node) {
            const length = node.textContent?.length ?? 0;
            if (remaining <= length) {
                const range = document.createRange();
                range.setStart(node, remaining);
                range.collapse(true);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                return;
            }
            remaining -= length;
            node = walker.nextNode();
        }
        placeCaret(content, true);
    };

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const nextSignature = documentSignature(
            descriptions,
            descriptions.map((_, index) => clampDocumentLevel(Number(levels[index]) || 1)),
            descriptions.map((description, index) => sanitizeInlineRichText(html[index] || escapeHtml(description))),
        );
        const isFocused = document.activeElement === editor || editor.contains(document.activeElement);
        if (isFocused && lastEmittedDocumentRef.current === nextSignature) {
            lastEmittedDocumentRef.current = null;
            return;
        }
        // 입력 중에 캔버스가 다시 그려져도(쪽 나눔 재계산 등) 화면 내용이 같으면 DOM을 갈아끼우지 않는다.
        // 갈아끼우면 커서가 첫 불릿 앞으로 튀어서 이어 치는 글자가 엉뚱한 곳에 들어간다.
        if (isFocused && readDomSignature(editor) === nextSignature) return;
        const caret = isFocused ? saveCaret(editor) : null;
        editor.replaceChildren(...(descriptions.length > 0 ? descriptions : [""]).map((description, index) => (
            createRow(
                clampDocumentLevel(Number(levels[index]) || 1),
                html[index] || escapeHtml(description),
                index,
            )
        )));
        if (caret) restoreCaret(editor, caret);
    }, [descriptions, levels, html]);

    const latestPropsRef = useRef({ descriptions, levels, html, onChange });
    latestPropsRef.current = { descriptions, levels, html, onChange };

    useEffect(() => {
        // 빈 불릿은 정리하되, 미리보기의 다른 불릿에 입력 중일 때는 기다렸다가 포커스가 빠진 뒤에 정리한다.
        const removeEmptyRows = () => {
            const active = document.activeElement;
            if (active instanceof HTMLElement && active.isContentEditable && !editorRef.current?.contains(active)) return;
            const { descriptions, levels, html, onChange } = latestPropsRef.current;
            const meaningfulIndexes = descriptions
                .map((description, index) => description.trim() ? index : -1)
                .filter((index) => index >= 0);
            if (
                meaningfulIndexes.length === 0
                || meaningfulIndexes.length === descriptions.length
            ) return;

            onChange(
                meaningfulIndexes.map((index) => descriptions[index]),
                meaningfulIndexes.map((index) => clampDocumentLevel(Number(levels[index]) || 1)),
                meaningfulIndexes.map((index) => sanitizeInlineRichText(
                    html[index] || escapeHtml(descriptions[index]),
                )),
            );
        };
        removeEmptyRows();
        let timer: number | undefined;
        const handleFocusOut = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(removeEmptyRows, 0);
        };
        document.addEventListener("focusout", handleFocusOut);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener("focusout", handleFocusOut);
        };
    }, [descriptions, levels, html, onChange]);

    const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
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
            const selectionRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
            const selectedRows = selectionRange
                ? Array.from(
                    editorRef.current?.querySelectorAll<HTMLElement>("[data-project-bullet-row]") || [],
                ).filter((candidateRow) => {
                    const candidateContent = candidateRow.querySelector<HTMLElement>(
                        "[data-project-bullet-content]",
                    );
                    if (!candidateContent) return false;
                    try {
                        return selectionRange.intersectsNode(candidateContent);
                    } catch {
                        return false;
                    }
                })
                : [];
            const rowsToIndent = selectedRows.length > 0 ? selectedRows : [row];
            const levelDelta = event.shiftKey ? -1 : 1;
            rowsToIndent.forEach((selectedRow) => {
                setRowLevel(
                    selectedRow,
                    clampDocumentLevel(Number(selectedRow.dataset.level)) + levelDelta,
                );
            });
            readDocument();
            return;
        }
        if (event.key === "Enter") {
            if (event.nativeEvent.isComposing) return;
            event.preventDefault();
            // 커서 뒤에 남은 글자는 새 불릿으로 옮겨 문서 편집기처럼 줄을 나눈다.
            let trailingHtml = "";
            const selectionRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
            if (selectionRange && content.contains(selectionRange.startContainer)) {
                selectionRange.deleteContents();
                const trailingRange = document.createRange();
                trailingRange.setStart(selectionRange.startContainer, selectionRange.startOffset);
                trailingRange.setEnd(content, content.childNodes.length);
                const holder = document.createElement("span");
                holder.append(trailingRange.extractContents());
                trailingHtml = richTextToPlainText(holder.innerHTML).trim() ? holder.innerHTML : "";
                if (!content.textContent) content.innerHTML = "<br>";
            }
            const nextRow = createRow(clampDocumentLevel(Number(row.dataset.level)), trailingHtml);
            row.after(nextRow);
            placeCaret(nextRow.querySelector<HTMLElement>("[data-project-bullet-content]")!);
            readDocument();
            return;
        }
        const caretRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const caretInContent = Boolean(caretRange?.collapsed && content.contains(caretRange.startContainer));
        const textBeforeCaret = () => {
            const measure = document.createRange();
            measure.selectNodeContents(content);
            measure.setEnd(caretRange!.startContainer, caretRange!.startOffset);
            return measure.toString();
        };
        const textAfterCaret = () => {
            const measure = document.createRange();
            measure.selectNodeContents(content);
            measure.setStart(caretRange!.startContainer, caretRange!.startOffset);
            return measure.toString();
        };
        // 내용이 있는 불릿을 앞뒤 불릿과 합칠 때 글자를 잃지 않도록 직접 옮긴다.
        const mergeRows = (target: HTMLElement, source: HTMLElement) => {
            const targetContent = target.querySelector<HTMLElement>("[data-project-bullet-content]");
            const sourceContent = source.querySelector<HTMLElement>("[data-project-bullet-content]");
            if (!targetContent || !sourceContent) return;
            const joinOffset = (targetContent.textContent || "").length;
            if (!targetContent.textContent) targetContent.replaceChildren();
            if (sourceContent.textContent) targetContent.append(...Array.from(sourceContent.childNodes));
            source.remove();
            setActiveContent(targetContent);
            const walker = document.createTreeWalker(targetContent, NodeFilter.SHOW_TEXT);
            let remaining = joinOffset;
            let node = walker.nextNode();
            while (node) {
                const length = node.textContent?.length ?? 0;
                if (remaining <= length) break;
                remaining -= length;
                node = walker.nextNode();
            }
            const range = document.createRange();
            if (node) range.setStart(node, remaining);
            else range.selectNodeContents(targetContent);
            range.collapse(!node ? false : true);
            selection?.removeAllRanges();
            selection?.addRange(range);
            readDocument();
        };
        if (event.key === "Backspace" && content.textContent && caretInContent && textBeforeCaret() === "") {
            const level = clampDocumentLevel(Number(row.dataset.level));
            if (level > 1) {
                event.preventDefault();
                setRowLevel(row, level - 1);
                readDocument();
                return;
            }
            const previousRow = row.previousElementSibling as HTMLElement | null;
            if (!previousRow) return;
            event.preventDefault();
            mergeRows(previousRow, row);
            return;
        }
        if (event.key === "Delete" && caretInContent && textAfterCaret() === "") {
            const nextRow = row.nextElementSibling as HTMLElement | null;
            if (!nextRow) return;
            event.preventDefault();
            mergeRows(row, nextRow);
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
            const previousContent = row.previousElementSibling?.querySelector<HTMLElement>(
                "[data-project-bullet-content]",
            );
            if (previousContent) {
                row.remove();
                placeCaret(previousContent, true);
                readDocument();
            }
        }
    };

    return (
        <>
        {variant === "resume" ? <ul
            ref={(node) => { editorRef.current = node; }}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            className={`project-bullet-document-editor resume-project-bullets ${className}`}
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
            onPaste={readOnly ? undefined : handlePaste}
            onInput={readOnly ? undefined : readDocument}
            onBlur={() => {
                setActiveContent(null);
                readDocument();
            }}
            onKeyDown={readOnly ? undefined : handleEditorKeyDown}
        /> : <div
            ref={(node) => { editorRef.current = node; }}
            contentEditable
            suppressContentEditableWarning
            className="project-bullet-document-editor project-bullet-editor"
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
            onKeyDown={(event) => handleEditorKeyDown(event)}
        />}
        {!readOnly && <RichTextBubbleToolbar
            editorRef={editorRef}
            onFormat={readDocument}
            allowBold={allowBold}
        />}
        </>
    );
}
