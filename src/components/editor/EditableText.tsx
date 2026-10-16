// src/components/editor/EditableText.tsx
"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

interface EditableTextProps {
    value: string;
    onChange: (newValue: string) => void;
    className?: string;
    placeholder?: string;
    multiline?: boolean;
    style?: React.CSSProperties;
    tag?: "h1" | "h2" | "h3" | "p" | "span" | "div";
    width?: "content" | "short" | "full";
    appearance?: "default" | "plain";
    editorId?: string;
    onTabNext?: () => void;
    onEditEnd?: (value: string) => void;
}

export default function EditableText({
    value,
    onChange,
    className = "",
    placeholder = "입력하세요",
    multiline = false,
    style = {},
    tag: Tag = "span",
    width = "content",
    appearance = "default",
    editorId,
    onTabNext,
    onEditEnd,
}: EditableTextProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentText, setCurrentText] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const usesTextarea = multiline || width !== "short";

    useEffect(() => {
        setCurrentText(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    useLayoutEffect(() => {
        if (!isEditing || !usesTextarea || !(inputRef.current instanceof HTMLTextAreaElement)) return;
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }, [currentText, isEditing, usesTextarea]);

    const handleBlur = () => {
        setIsEditing(false);
        if (currentText !== value) {
            onChange(currentText);
        }
        onEditEnd?.(currentText);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Tab" && !e.shiftKey && onTabNext) {
            e.preventDefault();
            if (currentText !== value) onChange(currentText);
            setIsEditing(false);
            window.setTimeout(onTabNext, 0);
        } else if (!multiline && e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
        } else if (e.key === "Escape") {
            setCurrentText(value);
            setIsEditing(false);
            onEditEnd?.(value);
        }
    };

    const contentVisualLength = Array.from(currentText || placeholder).reduce((length, character) => (
        length + (/[^\u0000-\u00ff]/.test(character) ? 2 : 1)
    ), 0);
    const maxVisualLength = 120;
    const contentWidth = `${Math.min(Math.max(contentVisualLength + 1, 6), maxVisualLength)}ch`;
    const editorStyle: React.CSSProperties = {
        ...style,
        ...(width === "content" ? { width: contentWidth, maxWidth: "100%" } : {}),
        ...(width === "short" ? { width: "11ch", maxWidth: "100%" } : {}),
        ...(width === "full" || multiline ? { width: "100%", maxWidth: "100%" } : {}),
    };

    if (isEditing) {
        if (usesTextarea) {
            return (
                <textarea
                    id={editorId}
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={currentText}
                    onChange={(e) => setCurrentText(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    style={editorStyle}
                    className={`resume-inline-editor min-w-0 max-w-full overflow-hidden rounded-sm border-0 bg-blue-50 p-0 text-neutral-900 shadow-none outline-none resize-none ${className}`}
                    rows={Math.max(1, currentText.split("\n").length)}
                />
            );
        }

        return (
            <input
                id={editorId}
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                style={editorStyle}
                className={`resume-inline-editor min-w-0 max-w-full rounded-sm border-0 bg-blue-50 p-0 text-neutral-900 shadow-none outline-none ${className}`}
            />
        );
    }

    return (
        <Tag
            id={editorId}
            style={style}
            onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            className={`resume-editable-text cursor-text border-b border-dashed border-transparent transition duration-150 ${appearance === "plain"
                ? "hover:opacity-75"
                : "rounded px-1 -mx-1"
                } ${className}`}
        >
            {value ? value : <span className="editable-placeholder no-print text-neutral-400 italic font-normal">{placeholder}</span>}
        </Tag>
    );
}
