import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, assertSameOrigin, ApiError } from "@/server/http/api-error";
import { validateResumePayload, validateSlug } from "@/server/resumes/resume.validator";
import { deletePublication, findPublicResume, updatePublication } from "@/server/resumes/resume-publication.service";
export const runtime = "nodejs";
type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: NextRequest, context: Context) { try { const slug = validateSlug((await context.params).slug); const resume = await findPublicResume(slug); if (!resume) throw new ApiError(404, "NOT_FOUND", "게시된 이력서를 찾을 수 없습니다."); return NextResponse.json({ resume }); } catch (error) { return apiErrorResponse(error); } }
export async function PUT(request: NextRequest, context: Context) { try { assertSameOrigin(request); const slug = validateSlug((await context.params).slug); const length = Number(request.headers.get("content-length") || 0); if (length > 2_100_000) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "요청 크기가 너무 큽니다."); const body = await request.json(); const resume = validateResumePayload(body?.resume); const result = await updatePublication(slug, resume); return NextResponse.json({ publication: result }); } catch (error) { return apiErrorResponse(error); } }
export async function DELETE(request: NextRequest, context: Context) { try { assertSameOrigin(request); const slug = validateSlug((await context.params).slug); await deletePublication(slug); return NextResponse.json({ success: true }); } catch (error) { return apiErrorResponse(error); } }
