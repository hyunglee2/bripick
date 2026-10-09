import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/server/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        return applyCookies(NextResponse.json({ user: null }));
    }

    const metadata = data.user.user_metadata || {};
    return applyCookies(NextResponse.json({
        user: {
            id: data.user.id,
            email: data.user.email || null,
            name: metadata.full_name || metadata.name || metadata.user_name || null,
            avatarUrl: metadata.avatar_url || metadata.picture || null,
            provider: data.user.app_metadata?.provider || null,
            isAnonymous: Boolean(data.user.is_anonymous),
        },
    }));
}
