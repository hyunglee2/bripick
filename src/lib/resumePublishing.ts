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

export function getPublicResumeUrl(slug: string) {
    if (typeof window === "undefined") return `/r/${encodeURIComponent(slug)}`;
    return `${window.location.origin}/r/${encodeURIComponent(slug)}`;
}
