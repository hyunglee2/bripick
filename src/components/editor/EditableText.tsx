// src/components/editor/EditableText.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";

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
}: EditableTextProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentText, setCurrentText] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    useEffect(() => {
        setCurrentText(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (currentText !== value) {
            onChange(currentText);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
        } else if (e.key === "Escape") {
            setCurrentText(value);
            setIsEditing(false);
        }
    };

    const contentVisualLength = Array.from(currentText || placeholder).reduce((length, character) => (
        length + (/[^\u0000-\u00ff]/.test(character) ? 2 : 1)
    ), 0);
    const contentWidth = `${Math.min(Math.max(contentVisualLength + 3, 10), 42)}ch`;
    const editorStyle: React.CSSProperties = {
        ...style,
        ...(width === "content" ? { width: contentWidth, maxWidth: "100%" } : {}),
        ...(width === "short" ? { width: "11ch", maxWidth: "100%" } : {}),
    };

    if (isEditing) {
        if (multiline) {
            return (
                <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={currentText}
                    onChange={(e) => setCurrentText(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    style={style}
                    className={`w-full bg-white/90 border border-blue-500 rounded p-1 outline-none text-neutral-900 shadow-inner resize-none ${className}`}
                    rows={3}
                />
            );
        }

        return (
            <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                style={editorStyle}
                className={`${width === "full" ? "w-full" : "w-auto"} min-w-0 max-w-full bg-white/90 border border-blue-500 rounded px-1.5 py-0.5 outline-none text-neutral-900 shadow-inner ${className}`}
            />
        );
    }

    return (
        <Tag
            style={style}
            onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            className={`cursor-text transition duration-150 ${appearance === "plain"
                ? "hover:opacity-75"
                : "hover:bg-neutral-100/80 rounded px-1 -mx-1 group-hover:border-dashed group-hover:border-b group-hover:border-neutral-300"
                } ${className}`}
        >
            {value ? value : <span className="editable-placeholder no-print text-neutral-400 italic font-normal">{placeholder}</span>}
        </Tag>
    );
}
