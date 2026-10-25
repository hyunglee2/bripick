import type { ResumeBlock } from "@/types/resume";

type HideableItem = { isHidden?: boolean; projects?: HideableItem[] };

const isShown = (item: unknown) => !(item as HideableItem | null)?.isHidden;

// 숨긴 블록과 숨긴 회사·프로젝트를 뺀 블록 목록. 캔버스·PDF·공개 링크 모두 이 결과로 그린다.
export function stripHiddenBlocks(blocks: ResumeBlock[]): ResumeBlock[] {
    return blocks.flatMap((block) => {
        if (block.isVisible === false) return [];
        if ((block.type !== "experience" && block.type !== "project") || !Array.isArray(block.data)) return [block];

        const items = (block.data as HideableItem[])
            .filter(isShown)
            .map((item) => (
                Array.isArray(item.projects) && !item.projects.every(isShown)
                    ? { ...item, projects: item.projects.filter(isShown) }
                    : item
            ));
        // 항목을 전부 숨긴 블록은 제목만 남지 않도록 블록째 뺀다.
        if (items.length === 0 && block.data.length > 0) return [];
        return [{ ...block, data: items }];
    });
}

type IdItem = HideableItem & { id?: string };

// 캔버스는 숨긴 항목을 뺀 목록을 고쳐서 돌려준다. 숨긴 항목을 원래 자리(앞 항목 뒤)에 되돌려 넣는다.
export function mergeHiddenItems<T>(original: T[], edited: T[]): T[] {
    const source = original as IdItem[];
    if (!source.some((item) => item && (item.isHidden || item.projects?.some((p) => p?.isHidden)))) return edited;

    const byId = new Map(source.filter((item) => item?.id).map((item) => [item.id, item]));
    const result = (edited as IdItem[]).map((item) => {
        const prev = item?.id ? byId.get(item.id) : undefined;
        if (!prev || !Array.isArray(prev.projects) || !Array.isArray(item.projects)) return item;
        const projects = mergeHiddenItems(prev.projects, item.projects);
        return projects === item.projects ? item : { ...item, projects };
    });

    let leadingInsertAt = 0;
    source.forEach((item, index) => {
        if (!item?.isHidden) return;
        let anchor = -1;
        for (let i = index - 1; i >= 0 && anchor < 0; i -= 1) {
            const candidate = source[i];
            if (candidate?.isHidden) continue;
            anchor = result.findIndex((entry) => entry?.id && entry.id === candidate?.id);
        }
        if (anchor < 0) {
            result.splice(leadingInsertAt, 0, item);
            leadingInsertAt += 1;
            return;
        }
        let insertAt = anchor + 1;
        while (insertAt < result.length && result[insertAt]?.isHidden) insertAt += 1;
        result.splice(insertAt, 0, item);
    });
    return result as T[];
}
