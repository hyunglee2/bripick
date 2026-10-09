import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import type { ResumeDocument } from "@/types/resume";
import { getRequiredRegisteredUser } from "@/server/auth/auth.service";
import { ApiError } from "@/server/http/api-error";

function databaseError(error: PostgrestError, publicMessage: string) {
    console.error("[resume-draft] Supabase request failed", JSON.stringify({
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
    }));
    return new ApiError(502, "DATABASE_ERROR", publicMessage);
}

export async function listDrafts() {
    const { supabase, user } = await getRequiredRegisteredUser();
    const { data, error } = await supabase
        .from("resumes")
        .select("document,is_active")
        .eq("owner_id", user.id)
        .order("position", { ascending: true });

    if (error) throw databaseError(error, "계정의 이력서를 불러오지 못했습니다.");
    const rows = data ?? [];
    return {
        resumes: rows.map((row) => row.document as ResumeDocument),
        activeResumeId: (rows.find((row) => row.is_active)?.document as ResumeDocument | undefined)?.id ?? null,
    };
}

export async function replaceDrafts(resumes: ResumeDocument[], activeResumeId: string | null) {
    const { supabase, user } = await getRequiredRegisteredUser();
    const now = new Date().toISOString();
    const rows = resumes.map((resume, position) => ({
        owner_id: user.id,
        id: resume.id,
        title: resume.versionName || "이력서",
        document: resume,
        position,
        is_active: resume.id === activeResumeId,
        updated_at: now,
    }));

    const { error: upsertError } = await supabase
        .from("resumes")
        .upsert(rows, { onConflict: "owner_id,id" });
    if (upsertError) throw databaseError(upsertError, "이력서를 저장하지 못했습니다.");

    const { data: existing, error: selectError } = await supabase
        .from("resumes")
        .select("id")
        .eq("owner_id", user.id);
    if (selectError) throw databaseError(selectError, "저장된 이력서를 확인하지 못했습니다.");

    const incomingIds = new Set(resumes.map((resume) => resume.id));
    const staleIds = (existing ?? []).map((row) => row.id as string).filter((id) => !incomingIds.has(id));
    if (staleIds.length) {
        const { error: deleteError } = await supabase
            .from("resumes")
            .delete()
            .eq("owner_id", user.id)
            .in("id", staleIds);
        if (deleteError) throw databaseError(deleteError, "삭제된 이력서를 동기화하지 못했습니다.");
    }

    return { savedAt: now };
}
