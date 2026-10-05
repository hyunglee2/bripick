import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, assertSameOrigin, ApiError } from "@/server/http/api-error";
import { validateResumePayload } from "@/server/resumes/resume.validator";
import { createPublication } from "@/server/resumes/resume-publication.service";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
    try { assertSameOrigin(request); const length = Number(request.headers.get("content-length") || 0); if (length > 2_100_000) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "요청 크기가 너무 큽니다."); const body = await request.json(); const resume = validateResumePayload(body?.resume); const result = await createPublication(resume); return NextResponse.json({ publication: result }, { status: 201 }); }
    catch (error) { return apiErrorResponse(error); }
}
