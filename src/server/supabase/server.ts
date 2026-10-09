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
    const pendingCookies = new Map<string, PendingCookie>();
    const supabase = createServerClient(url, publishableKey, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (values) => {
                values.forEach(({ name, value, options }) => {
                    request.cookies.set(name, value);
                    // exchangeCodeForSession/getUser 과정에서 같은 인증 쿠키가
                    // 여러 번 갱신될 수 있다. 응답에는 최종 값 하나만 전달해
                    // Set-Cookie 헤더가 불필요하게 커지는 것을 막는다.
                    pendingCookies.set(name, { name, value, options });
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
        const cookieBytes = [...pendingCookies.values()].map(({ name, value }) => ({
            name,
            bytes: Buffer.byteLength(`${name}=${value}`, "utf8"),
        }));
        const responseHeaderBytes = [...response.headers.entries()].reduce(
            (total, [name, value]) => total + Buffer.byteLength(`${name}: ${value}\r\n`, "utf8"),
            0,
        );
        console.info("[auth:cookies:response]", {
            cookies: cookieBytes,
            cookieBytes: cookieBytes.reduce((total, cookie) => total + cookie.bytes, 0),
            responseHeaderBytes,
        });
        return response;
    };

    const getPendingCookieNames = () => [...pendingCookies.keys()];

    return { supabase, applyCookies, getPendingCookieNames };
}
export function createPublicSupabaseClient() {
    const { url, publishableKey } = env();
    return createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
