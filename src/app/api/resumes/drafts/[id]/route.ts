import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, assertSameOrigin } from "@/server/http/api-error";
import { deleteResumeWithPublications } from "@/server/resumes/resume-publication.service";
import { validateResumeId, validateSlug } from "@/server/resumes/resume.validator";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Context) {
    try {
        assertSameOrigin(request);
        const id = validateResumeId((await context.params).id);
        const body = await request.json().catch(() => ({}));
        const slug = typeof body?.slug === "string" ? validateSlug(body.slug) : null;
        await deleteResumeWithPublications(id, slug);
        return NextResponse.json({ success: true });
    } catch (error) {
        return apiErrorResponse(error);
    }
}
