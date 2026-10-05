import { NextRequest, NextResponse } from "next/server";
import { ensureAnonymousUser } from "@/server/auth/auth.service";
import { apiErrorResponse, assertSameOrigin } from "@/server/http/api-error";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { try { assertSameOrigin(request); await ensureAnonymousUser(); return NextResponse.json({ authenticated: true }); } catch (error) { return apiErrorResponse(error); } }
