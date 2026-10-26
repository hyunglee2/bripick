"use client";

import { useLayoutEffect, useRef } from "react";
import { richTextToPlainText, sanitizeInlineRichText } from "@/lib/richText";
import RichTextBubbleToolbar from "@/components/editor/RichTextBubbleToolbar";

type RichTextEditableProps = {
    html: string;
    onChange: (html: string) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    className?: string;
    ariaLabel?: string;
    editorId?: string;
    readOnly?: boolean;
    placeholder?: string;
};

export default function RichTextEditable({
    html,
    onChange,
    onKeyDown,
    className = "",
    ariaLabel,
    editorId,
    readOnly = false,
    placeholder = "내용을 입력하세요",
}: RichTextEditableProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const isEmpty = richTextToPlainText(sanitizeInlineRichText(html)).trim().length === 0;

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const sanitizedHtml = sanitizeInlineRichText(html);
        // 입력 중에는 내가 친 내용과 같으면 그대로 둔다. 불릿을 나누거나 합쳐 내용이 바뀐 경우에만 다시 채운다.
        if (document.activeElement === editor && sanitizeInlineRichText(editor.innerHTML) === sanitizedHtml) return;
        if (editor.innerHTML !== sanitizedHtml) editor.innerHTML = sanitizedHtml;
    }, [html]);

    const emitChange = () => {
        const editor = editorRef.current;
        if (editor) onChange(sanitizeInlineRichText(editor.innerHTML));
    };

    if (readOnly) {
        return (
            <div
                className={className}
                aria-label={ariaLabel}
                dangerouslySetInnerHTML={{ __html: sanitizeInlineRichText(html) }}
            />
        );
    }

    return (
        <>
        <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label={ariaLabel}
            data-project-bullet-editor={editorId}
            data-placeholder={placeholder}
            data-empty={isEmpty ? "true" : "false"}
            className={`resume-rich-text-editor ${className}`}
            onInput={(event) => onChange(sanitizeInlineRichText(event.currentTarget.innerHTML))}
            onBlur={(event) => {
                const sanitizedHtml = sanitizeInlineRichText(event.currentTarget.innerHTML);
                if (event.currentTarget.innerHTML !== sanitizedHtml) event.currentTarget.innerHTML = sanitizedHtml;
                onChange(sanitizedHtml);
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
            onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
                    event.preventDefault();
                    document.execCommand("bold");
                    emitChange();
                    return;
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
                    event.preventDefault();
                    document.execCommand("underline");
                    emitChange();
                    return;
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                    event.preventDefault();
                    editorRef.current?.dispatchEvent(new CustomEvent("open-rich-text-link"));
                    return;
                }
                onKeyDown?.(event);
            }}
        />
        <RichTextBubbleToolbar editorRef={editorRef} onFormat={emitChange} />
        </>
    );
}
