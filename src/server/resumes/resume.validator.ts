import "server-only";
import { ResumeDocument } from "@/types/resume";
import { ApiError } from "@/server/http/api-error";
export const PUBLIC_SLUG_PATTERN = /^[a-z0-9]{16,64}$/;
export function validateSlug(slug: string) { if (!PUBLIC_SLUG_PATTERN.test(slug)) throw new ApiError(400, "INVALID_SLUG", "공개 주소 형식이 올바르지 않습니다."); return slug; }
export function validateResumePayload(value: unknown): ResumeDocument {
    const encoded = JSON.stringify(value);
    if (typeof encoded !== "string") throw new ApiError(400, "INVALID_DOCUMENT", "이력서 데이터가 올바르지 않습니다.");
    if (encoded.length > 2_000_000) throw new ApiError(413, "DOCUMENT_TOO_LARGE", "이력서 용량은 2MB를 넘을 수 없습니다.");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "INVALID_DOCUMENT", "이력서 데이터가 올바르지 않습니다.");
    const resume = value as Partial<ResumeDocument>;
    if (typeof resume.id !== "string" || !resume.id.trim()) throw new ApiError(400, "INVALID_DOCUMENT", "이력서 ID가 필요합니다.");
    if (typeof resume.versionName !== "string" || resume.versionName.trim().length > 120) throw new ApiError(400, "INVALID_DOCUMENT", "이력서 제목이 올바르지 않습니다.");
    if (!resume.globalStyle || typeof resume.globalStyle !== "object" || !Array.isArray(resume.blocks) || resume.blocks.length > 50) throw new ApiError(400, "INVALID_DOCUMENT", "이력서 구조가 올바르지 않습니다.");
    for (const block of resume.blocks) if (!block || typeof block.id !== "string" || typeof block.type !== "string" || typeof block.title !== "string") throw new ApiError(400, "INVALID_DOCUMENT", "올바르지 않은 블록이 포함되어 있습니다.");
    return JSON.parse(encoded) as ResumeDocument;
}
