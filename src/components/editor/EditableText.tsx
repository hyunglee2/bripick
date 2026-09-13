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
}

export default function EditableText({
    value,
    onChange,
    className = "",
    placeholder = "입력하세요",
    multiline = false,
    style = {},
    tag: Tag = "span",
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
                style={style}
                className={`w-full bg-white/90 border border-blue-500 rounded px-1.5 py-0.5 outline-none text-neutral-900 shadow-inner ${className}`}
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
            title="클릭하여 즉시 수정"
            className={`cursor-text hover:bg-neutral-100/80 rounded px-1 -mx-1 transition duration-150 group-hover:border-dashed group-hover:border-b group-hover:border-neutral-300 ${className}`}
        >
            {value ? value : <span className="text-neutral-400 italic font-normal">{placeholder}</span>}
        </Tag>
    );
}