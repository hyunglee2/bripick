import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/server/supabase/server";
import {
    asSupabaseProvider,
    authOrigin,
    parseSocialProvider,
    safeNextPath,
} from "@/server/auth/oauth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ provider: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
    const traceId = crypto.randomUUID().slice(0, 8);
    const { provider: providerValue } = await context.params;
    const provider = parseSocialProvider(providerValue);
    const origin = authOrigin(request);
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));

    if (!provider) {
        return NextResponse.redirect(new URL("/?authError=unsupported_provider", origin));
    }

    const { supabase, applyCookies, getPendingCookieNames } = createSupabaseRouteClient(request);
    console.info("[auth:oauth:start]", {
        traceId,
        provider,
        mode: "sign-in",
    });
    const options = {
        // Supabase Redirect URLs에 등록한 주소와 정확히 일치시킨다.
        // 로그인 후 이동 경로는 callback이 기본값(`/`)으로 처리한다.
        redirectTo: `${origin}/auth/callback`,
    };
    // 게스트 작업공간은 브라우저 로컬 저장소로 관리한다. 여기서 getUser()를
    // 호출하면 만료된 기존 세션을 갱신하며 큰 Set-Cookie 헤더가 함께 생성될 수
    // 있으므로 OAuth 시작에는 필요한 PKCE 검증 쿠키만 발급한다.
    const result = await supabase.auth.signInWithOAuth({
        provider: asSupabaseProvider(provider),
        options,
    });

    if (result.error || !result.data.url) {
        console.error("[auth:oauth:start:failed]", {
            traceId,
            provider,
            mode: "sign-in",
            message: result.error?.message || "OAuth URL 없음",
            status: result.error?.status || null,
            code: result.error?.code || null,
            pendingCookies: getPendingCookieNames(),
        });
        return applyCookies(NextResponse.redirect(new URL(`/?authError=oauth_start_failed&authTrace=${traceId}`, origin)));
    }

    console.info("[auth:oauth:start:redirect]", {
        traceId,
        provider,
        mode: "sign-in",
        next,
        destination: new URL(result.data.url).hostname,
        pendingCookies: getPendingCookieNames(),
    });
    return applyCookies(NextResponse.redirect(result.data.url, 303));
}
