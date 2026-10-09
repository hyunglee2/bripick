import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

function env() {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
        process.env.SUPABASE_PUBLISHABLE_KEY ??
        process.env.SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey) {
        throw new Error("SUPABASE_URL과 SUPABASE_PUBLISHABLE_KEY가 필요합니다.");
    }

    return { url, publishableKey };
}
export async function createAuthenticatedSupabaseClient() {
    const { url, publishableKey } = env();
    const cookieStore = await cookies();
    return createServerClient(url, publishableKey, { cookies: { getAll: () => cookieStore.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, httpOnly: true, sameSite: "lax", path: "/" })) } });
}

type PendingCookie = { name: string; value: string; options: CookieOptions };

/**
 * Route Handler에서 인증 상태를 변경할 때 사용한다.
 * Supabase가 만든 PKCE/session 쿠키를 최종 NextResponse에 명시적으로 복사해
 * redirect/json 응답을 새로 만들어도 Set-Cookie가 유실되지 않게 한다.
 */
export function createSupabaseRouteClient(request: NextRequest) {
    const { url, publishableKey } = env();
    const pendingCookies: PendingCookie[] = [];
    const supabase = createServerClient(url, publishableKey, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (values) => {
                values.forEach(({ name, value, options }) => {
                    request.cookies.set(name, value);
                    pendingCookies.push({ name, value, options });
                });
            },
        },
    });

    const applyCookies = <T extends NextResponse>(response: T) => {
        pendingCookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                path: "/",
            });
        });
        response.headers.set("Cache-Control", "private, no-store");
        return response;
    };

    const getPendingCookieNames = () => pendingCookies.map(({ name }) => name);

    return { supabase, applyCookies, getPendingCookieNames };
}
export function createPublicSupabaseClient() {
    const { url, publishableKey } = env();
    return createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
