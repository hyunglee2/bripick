import "server-only";
import { ApiError } from "@/server/http/api-error";
import { createAuthenticatedSupabaseClient } from "@/server/supabase/server";
export async function getRequiredUser() { const supabase = await createAuthenticatedSupabaseClient(); const { data, error } = await supabase.auth.getUser(); if (error || !data.user) throw new ApiError(401, "UNAUTHENTICATED", "인증이 필요합니다."); return { supabase, user: data.user }; }
export async function getRequiredRegisteredUser() {
    const result = await getRequiredUser();
    if (result.user.is_anonymous) {
        throw new ApiError(401, "LOGIN_REQUIRED", "로그인 후 이력서를 계정에 저장할 수 있습니다.");
    }
    return result;
}
export async function ensureAnonymousUser() { const supabase = await createAuthenticatedSupabaseClient(); const { data: current } = await supabase.auth.getUser(); if (current.user) return current.user; const { data, error } = await supabase.auth.signInAnonymously(); if (error || !data.user) throw new ApiError(503, "AUTH_UNAVAILABLE", "익명 사용자 세션을 만들지 못했습니다."); return data.user; }
