import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, assertSameOrigin } from "@/server/http/api-error";
import { listDrafts, replaceDrafts } from "@/server/resumes/resume-draft.service";
import { validateResumePayload } from "@/server/resumes/resume.validator";
import type { ResumeDocument } from "@/types/resume";

export const runtime = "nodejs";

export async function GET() {
    try {
        return NextResponse.json(await listDrafts(), {
            headers: { "Cache-Control": "private, no-store" },
        });
    } catch (error) {
        return apiErrorResponse(error);
    }
}

export async function PUT(request: NextRequest) {
    try {
        assertSameOrigin(request);
        const length = Number(request.headers.get("content-length") || 0);
        if (length > 10_500_000) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "저장할 이력서 용량이 너무 큽니다.");
        const body = await request.json();
        if (!Array.isArray(body?.resumes) || body.resumes.length < 1 || body.resumes.length > 25) {
            throw new ApiError(400, "INVALID_WORKSPACE", "이력서 목록이 올바르지 않습니다.");
        }
        const resumes: ResumeDocument[] = (body.resumes as unknown[])
            .map((value) => validateResumePayload(value));
        const ids = new Set(resumes.map((resume) => resume.id));
        if (ids.size !== resumes.length) throw new ApiError(400, "DUPLICATE_RESUME", "중복된 이력서 ID가 있습니다.");
        const activeResumeId = typeof body.activeResumeId === "string" && ids.has(body.activeResumeId)
            ? body.activeResumeId
            : resumes[0].id;
        return NextResponse.json(await replaceDrafts(resumes, activeResumeId));
    } catch (error) {
        return apiErrorResponse(error);
    }
}
