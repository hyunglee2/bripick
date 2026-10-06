import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
export function createPublicSupabaseClient() {
    const { url, publishableKey } = env();
    return createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
