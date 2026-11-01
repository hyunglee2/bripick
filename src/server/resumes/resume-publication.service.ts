import "server-only";
import { ResumeDocument } from "@/types/resume";
import { ApiError } from "@/server/http/api-error";
import { getRequiredUser } from "@/server/auth/auth.service";
import { createPublicSupabaseClient } from "@/server/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";

function createSlug() { return Array.from(crypto.getRandomValues(new Uint8Array(9)), (byte) => byte.toString(36).padStart(2, "0")).join(""); }
function publication(slug: string, publishedAt: string) { return { slug, publishedAt }; }

function databaseError(error: PostgrestError, publicMessage: string) {
    console.error("[resume-publication] Supabase request failed", JSON.stringify({
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
    }));
    return new ApiError(502, "DATABASE_ERROR", publicMessage);
}

export async function createPublication(resume: ResumeDocument) {
    const { supabase, user } = await getRequiredUser();
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const slug = createSlug(); const publishedAt = new Date().toISOString();
        const document = { ...resume, publication: publication(slug, publishedAt) };
        const { error } = await supabase.from("published_resumes").insert({ slug, owner_id: user.id, title: resume.versionName || "이력서", document, published_at: publishedAt, updated_at: publishedAt });
        if (!error) return publication(slug, publishedAt);
        if (error.code !== "23505") throw databaseError(error, "이력서를 게시하지 못했습니다.");
    }
    throw new ApiError(503, "SLUG_UNAVAILABLE", "공개 주소를 생성하지 못했습니다.");
}

async function assertOwner(slug: string) {
    const { supabase, user } = await getRequiredUser();
    const { data, error } = await supabase.from("published_resumes").select("owner_id").eq("slug", slug).maybeSingle();
    if (error) throw databaseError(error, "게시 정보를 확인하지 못했습니다.");
    if (!data) throw new ApiError(404, "NOT_FOUND", "게시된 이력서를 찾을 수 없습니다.");
    if (data.owner_id !== user.id) throw new ApiError(403, "FORBIDDEN", "이 게시물을 수정할 권한이 없습니다.");
    return { supabase, user };
}

export async function updatePublication(slug: string, resume: ResumeDocument) {
    const { supabase, user } = await assertOwner(slug); const publishedAt = new Date().toISOString();
    const document = { ...resume, publication: publication(slug, publishedAt) };
    const { error } = await supabase.from("published_resumes").update({ title: resume.versionName || "이력서", document, published_at: publishedAt, updated_at: publishedAt }).eq("slug", slug).eq("owner_id", user.id);
    if (error) throw databaseError(error, "변경사항을 게시하지 못했습니다.");
    return publication(slug, publishedAt);
}

export async function deletePublication(slug: string) {
    const { supabase, user } = await assertOwner(slug);
    const { error } = await supabase.from("published_resumes").delete().eq("slug", slug).eq("owner_id", user.id);
    if (error) throw databaseError(error, "게시를 취소하지 못했습니다.");
}

/**
 * 이력서 원본과 그 공개 게시물을 함께 지운다.
 * 게시물이 이미 지워졌으면 삭제된 것으로 보고 원본 삭제를 계속한다(멱등).
 * published_resumes에는 아직 원본을 가리키는 컬럼이 없어, slug와 게시 문서 안의 이력서 ID로 찾는다.
 */
export async function deleteResumeWithPublications(resumeId: string, slug: string | null) {
    const { supabase, user } = await getRequiredUser();

    if (slug) {
        const { data, error } = await supabase.from("published_resumes").select("owner_id").eq("slug", slug).maybeSingle();
        if (error) throw databaseError(error, "게시 정보를 확인하지 못했습니다.");
        if (data && data.owner_id !== user.id) throw new ApiError(403, "FORBIDDEN", "이 게시물을 삭제할 권한이 없습니다.");
        const { error: slugError } = await supabase.from("published_resumes").delete().eq("slug", slug).eq("owner_id", user.id);
        if (slugError) throw databaseError(slugError, "공개 이력서를 삭제하지 못했습니다.");
    }

    // 클라이언트가 게시 정보를 잃어버린 경우에도 같은 원본의 게시물이 남지 않게 한다.
    const { error: linkedError } = await supabase.from("published_resumes").delete().eq("owner_id", user.id).eq("document->>id", resumeId);
    if (linkedError) throw databaseError(linkedError, "공개 이력서를 삭제하지 못했습니다.");

    // 계정에 저장된 원본. 비로그인 사용자는 저장된 행이 없어 아무것도 지워지지 않는다.
    const { error: resumeError } = await supabase.from("resumes").delete().eq("owner_id", user.id).eq("id", resumeId);
    if (resumeError) throw databaseError(resumeError, "이력서를 삭제하지 못했습니다.");
}

export async function findPublicResume(slug: string) {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("published_resumes").select("document").eq("slug", slug).maybeSingle();
    if (error) throw databaseError(error, "공개 이력서를 불러오지 못했습니다.");
    return (data?.document as ResumeDocument | undefined) ?? null;
}

export async function findPublicResumeSitemapEntries() {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
        .from("published_resumes")
        .select("slug, updated_at")
        .order("updated_at", { ascending: false });
    if (error) throw databaseError(error, "공개 이력서 목록을 불러오지 못했습니다.");
    return data ?? [];
}
