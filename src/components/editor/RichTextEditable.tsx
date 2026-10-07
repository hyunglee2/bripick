"use client";

import { useLayoutEffect, useRef } from "react";
import { sanitizeInlineRichText } from "@/lib/richText";
import RichTextBubbleToolbar from "@/components/editor/RichTextBubbleToolbar";

type RichTextEditableProps = {
    html: string;
    onChange: (html: string) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    className?: string;
    ariaLabel?: string;
    editorId?: string;
    readOnly?: boolean;
};

export default function RichTextEditable({
    html,
    onChange,
    onKeyDown,
    className = "",
    ariaLabel,
    editorId,
    readOnly = false,
}: RichTextEditableProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor || document.activeElement === editor) return;
        const sanitizedHtml = sanitizeInlineRichText(html);
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
            className={className}
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
