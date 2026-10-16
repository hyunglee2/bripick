import type { ResumeDocument } from "@/types/resume";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isResumeBackup(value: unknown): value is ResumeDocument {
    if (!isRecord(value)) return false;
    if (!Array.isArray(value.blocks) || !isRecord(value.globalStyle)) return false;

    return value.blocks.every((block) => (
        isRecord(block)
        && typeof block.id === "string"
        && typeof block.type === "string"
        && typeof block.title === "string"
        && isRecord(block.style)
    ));
}

export function prepareImportedResume(backup: ResumeDocument): ResumeDocument {
    const importedAt = new Date().toISOString();
    const sourceName = backup.versionName?.trim() || "이력서";
    const uniquePart = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return {
        ...backup,
        id: `resume-imported-${uniquePart}`,
        versionName: `${sourceName} (가져온 이력서)`,
        updatedAt: importedAt,
        publication: undefined,
    };
}
