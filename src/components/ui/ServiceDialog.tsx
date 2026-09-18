"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export type ServiceDialogVariant = "info" | "success" | "warning" | "danger";

interface ServiceDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    variant?: ServiceDialogVariant;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

const variantStyles = {
    info: {
        buttonClass: "bg-blue-600 hover:bg-blue-500 text-white",
    },
    success: {
        buttonClass: "bg-blue-600 hover:bg-blue-500 text-white",
    },
    warning: {
        buttonClass: "bg-blue-600 hover:bg-blue-500 text-white",
    },
    danger: {
        buttonClass: "bg-red-600 hover:bg-red-500 text-white",
    },
} as const;

export default function ServiceDialog({
    isOpen,
    title,
    message,
    variant = "info",
    confirmLabel = "확인",
    cancelLabel,
    onConfirm,
    onCancel,
}: ServiceDialogProps) {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        confirmButtonRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") (onCancel || onConfirm)();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onCancel, onConfirm]);

    if (!isOpen) return null;

    const style = variantStyles[variant];

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) (onCancel || onConfirm)();
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="service-dialog-title"
                aria-describedby="service-dialog-description"
                className="service-dialog w-full max-w-[420px] rounded-2xl border border-neutral-700 bg-[#161722] p-6 text-neutral-100 shadow-2xl"
            >
                <div className="flex items-center justify-between">
                    <div className="min-w-0">
                        <h2 id="service-dialog-title" className="truncate text-base font-bold tracking-tight text-white">
                            {title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel || onConfirm}
                        className="rounded p-1 text-neutral-500 transition hover:bg-neutral-800 hover:text-white"
                        aria-label="다이얼로그 닫기"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-4 px-0.5">
                    <p id="service-dialog-description" className="text-sm leading-relaxed text-neutral-300">
                        {message}
                    </p>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    {cancelLabel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-lg border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        onClick={onConfirm}
                        className={`rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition active:scale-[0.98] ${style.buttonClass}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
