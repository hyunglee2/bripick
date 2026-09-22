import { SkillCategory, SkillsData } from "@/types/resume";

export function getSkillCategories(data: SkillsData | undefined): SkillCategory[] {
    if (Array.isArray(data?.categories)) {
        return data.categories.map((category, index) => ({
            id: category.id || `skill-category-${index}`,
            name: category.name || "",
            skills: Array.isArray(category.skills) ? category.skills : [],
        }));
    }

    const legacySkills = Array.isArray(data?.skills) ? data.skills : [];
    return legacySkills.length > 0
        ? [{ id: "skill-category-default", name: "", skills: legacySkills }]
        : [];
}

export function withSkillCategories(data: SkillsData | undefined, categories: SkillCategory[]): SkillsData {
    return {
        ...(data || {}),
        skills: undefined,
        categories,
    };
}
