import "server-only";
import { NextRequest, NextResponse } from "next/server";
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }

function firstForwardedValue(value: string | null) {
    return value?.split(",", 1)[0]?.trim() || null;
}

function requestOrigin(request: NextRequest) {
    const protocol = firstForwardedValue(request.headers.get("x-forwarded-proto"))
        ?? request.nextUrl.protocol.replace(":", "");
    const host = firstForwardedValue(request.headers.get("x-forwarded-host"))
        ?? request.headers.get("host")
        ?? request.nextUrl.host;

    return new URL(`${protocol}://${host}`).origin;
}

export function assertSameOrigin(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (!origin) return;

    try {
        if (new URL(origin).origin === requestOrigin(request)) return;
    } catch {
        // Malformed origin or proxy headers are rejected below.
    }

    throw new ApiError(403, "INVALID_ORIGIN", "허용되지 않은 출처의 요청입니다.");
}

export function apiErrorResponse(error: unknown) {
    if (error instanceof ApiError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_JSON", message: "JSON 요청 본문이 올바르지 않습니다." } }, { status: 400 });
    console.error(error); return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버에서 요청을 처리하지 못했습니다." } }, { status: 500 });
}
