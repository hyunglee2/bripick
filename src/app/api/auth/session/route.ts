import { NextResponse } from "next/server";
import { createAuthenticatedSupabaseClient } from "@/server/supabase/server";

export const runtime = "nodejs";

export async function GET() {
    const supabase = await createAuthenticatedSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
    }

    const metadata = data.user.user_metadata || {};
    return NextResponse.json({
        user: {
            id: data.user.id,
            email: data.user.email || null,
            name: metadata.full_name || metadata.name || metadata.user_name || null,
            avatarUrl: metadata.avatar_url || metadata.picture || null,
            provider: data.user.app_metadata?.provider || null,
            isAnonymous: Boolean(data.user.is_anonymous),
        },
    }, { headers: { "Cache-Control": "no-store" } });
}
