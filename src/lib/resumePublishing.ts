"use client";

import { ResumeDocument } from "@/types/resume";

type ApiErrorBody = { error?: { message?: string } };
async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, credentials: "same-origin" });
    const body = await response.json().catch(() => ({})) as T & ApiErrorBody;
    if (!response.ok) throw new Error(body.error?.message || "요청을 처리하지 못했습니다.");
    return body;
}
async function ensureSession() { await request("/api/auth/anonymous", { method: "POST" }); }

export async function publishResume(resume: ResumeDocument) {
    await ensureSession();
    const url = resume.publication ? `/api/resumes/${encodeURIComponent(resume.publication.slug)}` : "/api/resumes";
    const result = await request<{ publication: NonNullable<ResumeDocument["publication"]> }>(url, { method: resume.publication ? "PUT" : "POST", body: JSON.stringify({ resume }) });
    return result.publication;
}

export async function unpublishResume(slug: string) {
    await ensureSession();
    await request(`/api/resumes/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

/** 이력서와 공개 게시물을 서버에서 함께 지운다. 로컬 목록 정리는 호출한 쪽에서 한다. */
export async function deleteResumeWithPublication(resume: Pick<ResumeDocument, "id" | "publication">) {
    await ensureSession();
    await request(`/api/resumes/drafts/${encodeURIComponent(resume.id)}`, {
        method: "DELETE",
        body: JSON.stringify({ slug: resume.publication?.slug ?? null }),
    });
}

export function getPublicResumeUrl(slug: string) {
    if (typeof window === "undefined") return `/resume/${encodeURIComponent(slug)}`;
    return `${window.location.origin}/resume/${encodeURIComponent(slug)}`;
}
