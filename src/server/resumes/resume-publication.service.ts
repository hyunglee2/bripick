import "server-only";
import { ResumeDocument } from "@/types/resume";
import { ApiError } from "@/server/http/api-error";
import { getRequiredUser } from "@/server/auth/auth.service";
import { createPublicSupabaseClient } from "@/server/supabase/server";

function createSlug() { return Array.from(crypto.getRandomValues(new Uint8Array(9)), (byte) => byte.toString(36).padStart(2, "0")).join(""); }
function publication(slug: string, publishedAt: string) { return { slug, publishedAt }; }

export async function createPublication(resume: ResumeDocument) {
    const { supabase, user } = await getRequiredUser();
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const slug = createSlug(); const publishedAt = new Date().toISOString();
        const document = { ...resume, publication: publication(slug, publishedAt) };
        const { error } = await supabase.from("published_resumes").insert({ slug, owner_id: user.id, title: resume.versionName || "이력서", document, published_at: publishedAt, updated_at: publishedAt });
        if (!error) return publication(slug, publishedAt);
        if (error.code !== "23505") throw new ApiError(502, "DATABASE_ERROR", "이력서를 게시하지 못했습니다.");
    }
    throw new ApiError(503, "SLUG_UNAVAILABLE", "공개 주소를 생성하지 못했습니다.");
}

async function assertOwner(slug: string) {
    const { supabase, user } = await getRequiredUser();
    const { data, error } = await supabase.from("published_resumes").select("owner_id").eq("slug", slug).maybeSingle();
    if (error) throw new ApiError(502, "DATABASE_ERROR", "게시 정보를 확인하지 못했습니다.");
    if (!data) throw new ApiError(404, "NOT_FOUND", "게시된 이력서를 찾을 수 없습니다.");
    if (data.owner_id !== user.id) throw new ApiError(403, "FORBIDDEN", "이 게시물을 수정할 권한이 없습니다.");
    return { supabase, user };
}

export async function updatePublication(slug: string, resume: ResumeDocument) {
    const { supabase, user } = await assertOwner(slug); const publishedAt = new Date().toISOString();
    const document = { ...resume, publication: publication(slug, publishedAt) };
    const { error } = await supabase.from("published_resumes").update({ title: resume.versionName || "이력서", document, published_at: publishedAt, updated_at: publishedAt }).eq("slug", slug).eq("owner_id", user.id);
    if (error) throw new ApiError(502, "DATABASE_ERROR", "변경사항을 게시하지 못했습니다.");
    return publication(slug, publishedAt);
}

export async function deletePublication(slug: string) {
    const { supabase, user } = await assertOwner(slug);
    const { error } = await supabase.from("published_resumes").delete().eq("slug", slug).eq("owner_id", user.id);
    if (error) throw new ApiError(502, "DATABASE_ERROR", "게시를 취소하지 못했습니다.");
}

export async function findPublicResume(slug: string) {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("published_resumes").select("document").eq("slug", slug).maybeSingle();
    if (error) throw new ApiError(502, "DATABASE_ERROR", "공개 이력서를 불러오지 못했습니다.");
    return (data?.document as ResumeDocument | undefined) ?? null;
}
