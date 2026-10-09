import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/server/supabase/server";
import { authOrigin, safeNextPath } from "@/server/auth/oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const traceId = crypto.randomUUID().slice(0, 8);
    const origin = authOrigin(request);
    const code = request.nextUrl.searchParams.get("code");
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    const providerError = request.nextUrl.searchParams.get("error");
    const providerErrorCode = request.nextUrl.searchParams.get("error_code");
    const providerErrorDescription = request.nextUrl.searchParams.get("error_description");

    console.info("[auth:callback:received]", {
        traceId,
        hasCode: Boolean(code),
        providerError,
        providerErrorCode,
        providerErrorDescription,
        origin,
        cookieNames: request.cookies.getAll().map(({ name }) => name),
    });

    if (providerError) {
        console.error("[auth:callback:provider-failed]", { traceId, providerError, providerErrorCode, providerErrorDescription });
        return NextResponse.redirect(new URL(`/?authError=provider_callback_failed&authTrace=${traceId}`, origin));
    }

    if (!code) {
        console.error("[auth:callback:missing-code]", { traceId });
        return NextResponse.redirect(new URL(`/?authError=missing_code&authTrace=${traceId}`, origin));
    }

    const { supabase, applyCookies, getPendingCookieNames } = createSupabaseRouteClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        console.error("[auth:callback:exchange-failed]", {
            traceId,
            message: error.message,
            status: error.status,
            code: error.code || null,
            pendingCookies: getPendingCookieNames(),
        });
        return applyCookies(NextResponse.redirect(new URL(`/?authError=callback_failed&authTrace=${traceId}`, origin)));
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.info("[auth:callback:success]", {
        traceId,
        userId: userData.user?.id || null,
        provider: userData.user?.app_metadata?.provider || null,
        isAnonymous: Boolean(userData.user?.is_anonymous),
        userLookupError: userError?.message || null,
        pendingCookies: getPendingCookieNames(),
    });

    const redirectUrl = new URL(next, origin);
    redirectUrl.searchParams.set("auth", "success");
    redirectUrl.searchParams.set("authTrace", traceId);
    return applyCookies(NextResponse.redirect(redirectUrl, 303));
}
