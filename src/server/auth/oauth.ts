import "server-only";

import type { NextRequest } from "next/server";
import type { Provider } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

export const SOCIAL_PROVIDERS = ["google", "kakao"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export function parseSocialProvider(value: string): SocialProvider | null {
    return SOCIAL_PROVIDERS.includes(value as SocialProvider)
        ? value as SocialProvider
        : null;
}

export function asSupabaseProvider(provider: SocialProvider): Provider {
    return provider;
}

export function safeNextPath(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
    return value;
}

export function authOrigin(request: NextRequest) {
    // Reverse proxy 뒤에서는 request.url이 내부 upstream 주소
    // (예: https://localhost:3001)로 보일 수 있으므로, 운영 환경의
    // OAuth 리디렉션에는 항상 공개 사이트 주소를 사용한다.
    if (process.env.NODE_ENV === "production") return SITE_URL;

    return request.nextUrl.origin;
}
