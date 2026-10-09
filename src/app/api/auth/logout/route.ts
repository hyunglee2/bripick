import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/server/supabase/server";
import { apiErrorResponse, assertSameOrigin } from "@/server/http/api-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        assertSameOrigin(request);
        const { supabase, applyCookies } = createSupabaseRouteClient(request);
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) throw error;
        return applyCookies(NextResponse.json({ signedOut: true }));
    } catch (error) {
        return apiErrorResponse(error);
    }
}
