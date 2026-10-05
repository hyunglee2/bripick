import "server-only";
import { NextRequest, NextResponse } from "next/server";
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export function assertSameOrigin(request: NextRequest) { const origin = request.headers.get("origin"); if (origin && origin !== request.nextUrl.origin) throw new ApiError(403, "INVALID_ORIGIN", "허용되지 않은 출처의 요청입니다."); }
export function apiErrorResponse(error: unknown) {
    if (error instanceof ApiError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_JSON", message: "JSON 요청 본문이 올바르지 않습니다." } }, { status: 400 });
    console.error(error); return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "서버에서 요청을 처리하지 못했습니다." } }, { status: 500 });
}
