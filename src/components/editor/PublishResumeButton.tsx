"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, EyeOff, Globe, LoaderCircle, RefreshCw } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { getPublicResumeUrl, publishResume, unpublishResume } from "@/lib/resumePublishing";

export default function PublishResumeButton() {
    const resume = useResumeStore((state) => state.resume);
    const updatePublication = useResumeStore((state) => state.updatePublication);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<{ id: number; message: string; variant: "success" | "error" } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const publicUrl = resume.publication ? getPublicResumeUrl(resume.publication.slug) : "";

    useEffect(() => {
        if (!open) return;
        const close = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        window.addEventListener("pointerdown", close);
        return () => window.removeEventListener("pointerdown", close);
    }, [open]);

    useEffect(() => {
        if (!toast) return;
        const timeoutId = window.setTimeout(() => setToast(null), 2400);
        return () => window.clearTimeout(timeoutId);
    }, [toast]);

    const showToast = (message: string, variant: "success" | "error" = "success") => {
        setToast({ id: Date.now(), message, variant });
    };

    const handlePublish = async () => {
        setBusy(true);
        const isUpdating = Boolean(resume.publication);
        try {
            const publication = await publishResume(resume);
            updatePublication(publication);
            showToast(isUpdating ? "변경사항을 게시했어요." : "이력서를 게시했어요.");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "게시하지 못했습니다.", "error");
        } finally {
            setBusy(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            showToast("공개 링크를 복사했어요.");
        } catch {
            showToast("공개 링크를 복사하지 못했습니다.", "error");
        }
    };

    const handleUnpublish = async () => {
        if (!resume.publication) return;
        setBusy(true);
        try {
            await unpublishResume(resume.publication.slug);
            updatePublication(undefined);
            showToast("게시를 취소했어요.");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "게시를 취소하지 못했습니다.", "error");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="header-button header-button--outline flex h-8 items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-xs font-medium text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800"
                aria-expanded={open}
            >
                <Globe size={14} />
                <span className="hidden sm:inline">{resume.publication ? "게시됨" : "게시"}</span>
            </button>
            {open && (
                <div className="header-menu absolute right-0 top-10 z-[70] w-80 rounded-xl border border-neutral-700 bg-neutral-900 p-4 shadow-2xl">
                    <div className="mb-3">
                        <strong className="block text-sm text-neutral-100">인터넷에 게시</strong>
                        <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                            링크를 가진 누구나 이 이력서를 읽기 전용으로 볼 수 있습니다.
                        </p>
                    </div>
                    {resume.publication ? (
                        <div className="space-y-2">
                            <div className="truncate rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-[11px] text-neutral-400">
                                {publicUrl}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={handleCopy} className="publish-action-button">
                                    <Copy size={13} /> 링크 복사
                                </button>
                                <a href={publicUrl} target="_blank" rel="noreferrer" className="publish-action-button">
                                    <ExternalLink size={13} /> 열어보기
                                </a>
                            </div>
                            <button type="button" onClick={handlePublish} disabled={busy} className="publish-primary-button">
                                {busy ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                변경사항 게시
                            </button>
                            <button type="button" onClick={handleUnpublish} disabled={busy} className="publish-danger-button">
                                <EyeOff size={13} /> 게시 취소
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={handlePublish} disabled={busy} className="publish-primary-button">
                            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Globe size={14} />}
                            이력서 게시하기
                        </button>
                    )}
                </div>
            )}
            {toast && (
                <div className="pointer-events-none fixed inset-x-0 top-16 z-[80] flex justify-center px-4">
                    <div
                        key={toast.id}
                        role={toast.variant === "error" ? "alert" : "status"}
                        aria-live={toast.variant === "error" ? "assertive" : "polite"}
                        className={`service-toast inline-flex w-fit max-w-full items-center gap-2.5 rounded-xl border bg-[#171c26] px-4 py-3 text-xs font-medium text-neutral-100 shadow-2xl ${
                            toast.variant === "error" ? "border-red-500/40" : "border-blue-500/35"
                        }`}
                    >
                        {toast.variant === "error" ? (
                            <AlertCircle size={17} className="shrink-0 text-red-400" aria-hidden="true" />
                        ) : (
                            <CheckCircle2 size={17} className="shrink-0 text-blue-400" aria-hidden="true" />
                        )}
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
}
