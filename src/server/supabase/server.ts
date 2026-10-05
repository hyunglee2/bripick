import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function env() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error("SUPABASE_URL과 SUPABASE_ANON_KEY가 필요합니다.");
    return { url, anonKey };
}
export async function createAuthenticatedSupabaseClient() {
    const { url, anonKey } = env();
    const cookieStore = await cookies();
    return createServerClient(url, anonKey, { cookies: { getAll: () => cookieStore.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, httpOnly: true, sameSite: "lax", path: "/" })) } });
}
export function createPublicSupabaseClient() {
    const { url, anonKey } = env();
    return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
