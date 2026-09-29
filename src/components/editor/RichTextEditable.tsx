"use client";

import { useLayoutEffect, useRef } from "react";
import { sanitizeInlineRichText } from "@/lib/richText";

type RichTextEditableProps = {
    html: string;
    onChange: (html: string) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    className?: string;
    ariaLabel?: string;
    editorId?: string;
};

export default function RichTextEditable({
    html,
    onChange,
    onKeyDown,
    className = "",
    ariaLabel,
    editorId,
}: RichTextEditableProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (!editor || document.activeElement === editor) return;
        const sanitizedHtml = sanitizeInlineRichText(html);
        if (editor.innerHTML !== sanitizedHtml) editor.innerHTML = sanitizedHtml;
    }, [html]);

    return (
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
            onKeyDown={onKeyDown}
        />
    );
}
