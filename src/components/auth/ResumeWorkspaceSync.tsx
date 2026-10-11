"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ServiceDialog from "@/components/ui/ServiceDialog";
import { getAuthSession, type AuthUser } from "@/lib/authSession";
import { createSampleResume } from "@/lib/sampleResume";
import { useResumeStore } from "@/store/useResumeStore";
import type { ResumeDocument } from "@/types/resume";

type SessionUser = Pick<AuthUser, "id" | "email" | "isAnonymous">;
type DraftResponse = { resumes: ResumeDocument[]; activeResumeId: string | null };
type StoredWorkspace = { resumes: ResumeDocument[]; activeResumeId: string | null };
type WorkspaceMigration = {
    user: SessionUser;
    sourceKey: string;
    sourceLabel: "게스트" | "기존";
    sourceSignature: string;
    workspace: StoredWorkspace;
    accountWorkspace: StoredWorkspace | null;
};

const LEGACY_STORAGE_KEY = "bripick-resume-storage";
const GUEST_STORAGE_KEY = "bripick-resume-storage:guest";
const GUEST_BASELINE_KEY = "bripick-resume-storage:guest-baseline";
const accountStorageKey = (userId: string) => `bripick-resume-storage:user:${userId}`;

function workspaceSignature(workspace: StoredWorkspace) {
    const value = JSON.stringify(workspace);
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `${value.length}-${(hash >>> 0).toString(36)}`;
}

function mergeWorkspaces(account: StoredWorkspace | null, imported: StoredWorkspace): StoredWorkspace {
    if (!account?.resumes.length) return imported;

    const usedIds = new Set(account.resumes.map((resume) => resume.id));
    const importedIdMap = new Map<string, string>();
    const importedResumes = imported.resumes.map((resume) => {
        if (!usedIds.has(resume.id)) {
            usedIds.add(resume.id);
            importedIdMap.set(resume.id, resume.id);
            return resume;
        }

        let id = `resume-${crypto.randomUUID()}`;
        while (usedIds.has(id)) id = `resume-${crypto.randomUUID()}`;
        usedIds.add(id);
        importedIdMap.set(resume.id, id);
        return {
            ...resume,
            id,
            versionName: `${resume.versionName} (가져옴)`,
            updatedAt: new Date().toISOString(),
            publication: undefined,
        };
    });

    return {
        resumes: [...account.resumes, ...importedResumes],
        activeResumeId: imported.activeResumeId
            ? importedIdMap.get(imported.activeResumeId) ?? account.activeResumeId
            : account.activeResumeId,
    };
}

function readWorkspace(key: string): StoredWorkspace | null {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { state?: { resume?: ResumeDocument; resumeList?: ResumeDocument[] } };
        const resumes = parsed.state?.resumeList;
        if (!Array.isArray(resumes) || !resumes.length) return null;
        return { resumes, activeResumeId: parsed.state?.resume?.id ?? resumes[0].id };
    } catch {
        return null;
    }
}

async function saveWorkspace(resumes: ResumeDocument[], activeResumeId: string) {
    const response = await fetch("/api/resumes/drafts", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumes, activeResumeId }),
    });
    if (!response.ok) throw new Error("계정 이력서를 저장하지 못했습니다.");
}

export default function ResumeWorkspaceSync() {
    const replaceWorkspace = useResumeStore((state) => state.replaceWorkspace);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [migration, setMigration] = useState<WorkspaceMigration | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const saveTimerRef = useRef<number | null>(null);
    const activeUserIdRef = useRef<string | null>(null);

    const stopSync = useCallback(() => {
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
        if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        activeUserIdRef.current = null;
    }, []);

    const startSync = useCallback((userId: string) => {
        stopSync();
        activeUserIdRef.current = userId;
        unsubscribeRef.current = useResumeStore.subscribe((state, previous) => {
            if (state.resume === previous.resume && state.resumeList === previous.resumeList) return;
            if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
            saveTimerRef.current = window.setTimeout(() => {
                if (activeUserIdRef.current !== userId) return;
                const latest = useResumeStore.getState();
                saveWorkspace(latest.resumeList, latest.resume.id)
                    .then(() => setErrorMessage(null))
                    .catch(() => {
                        setErrorMessage("변경사항을 계정에 저장하지 못했습니다. 네트워크 연결을 확인해 주세요.");
                    });
            }, 700);
        });
    }, [stopSync]);

    const activateAccountWorkspace = useCallback(async (
        user: SessionUser,
        workspace: StoredWorkspace,
        shouldSave: boolean,
    ) => {
        useResumeStore.persist.setOptions({ name: accountStorageKey(user.id) });
        replaceWorkspace(workspace.resumes, workspace.activeResumeId);
        if (shouldSave) await saveWorkspace(workspace.resumes, workspace.activeResumeId ?? workspace.resumes[0].id);
        startSync(user.id);
        setMigration(null);
        setIsLoading(false);
    }, [replaceWorkspace, startSync]);

    const activateGuestWorkspace = useCallback(() => {
        stopSync();
        useResumeStore.persist.setOptions({ name: GUEST_STORAGE_KEY });
        const guest = readWorkspace(GUEST_STORAGE_KEY);
        const workspace = guest ?? { resumes: [createSampleResume()], activeResumeId: "resume-sample" };
        if (!guest) window.localStorage.setItem(GUEST_BASELINE_KEY, workspaceSignature(workspace));
        replaceWorkspace(workspace.resumes, workspace.activeResumeId);
        setMigration(null);
        setErrorMessage(null);
        setIsLoading(false);
    }, [replaceWorkspace, stopSync]);

    const load = useCallback(async () => {
        stopSync();
        setIsLoading(true);
        setErrorMessage(null);
        setMigration(null);

        let user: SessionUser | null = null;
        try {
            user = await getAuthSession();
        } catch {
            // 인증 서버를 확인할 수 없어도 비로그인 편집은 로컬에서 계속 가능해야 한다.
        }

        if (!user || user.isAnonymous) {
            activateGuestWorkspace();
            return;
        }

        try {
            useResumeStore.persist.setOptions({ name: accountStorageKey(user.id) });
            const draftResponse = await fetch("/api/resumes/drafts", { cache: "no-store", credentials: "same-origin" });
            if (!draftResponse.ok) throw new Error();
            const drafts = await draftResponse.json() as DraftResponse;
            const cached = drafts.resumes.length ? null : readWorkspace(accountStorageKey(user.id));
            const accountWorkspace: StoredWorkspace | null = drafts.resumes.length ? drafts : cached;

            const guest = readWorkspace(GUEST_STORAGE_KEY);
            const legacy = guest ? null : readWorkspace(LEGACY_STORAGE_KEY);
            const importCandidate = guest
                ? { workspace: guest, sourceKey: GUEST_STORAGE_KEY, sourceLabel: "게스트" as const }
                : legacy
                    ? { workspace: legacy, sourceKey: LEGACY_STORAGE_KEY, sourceLabel: "기존" as const }
                    : null;

            if (importCandidate) {
                const sourceSignature = workspaceSignature(importCandidate.workspace);
                const migrationKey = `bripick-workspace-migration:${user.id}:${importCandidate.sourceLabel}`;
                const isUntouchedGuest = importCandidate.sourceKey === GUEST_STORAGE_KEY
                    && window.localStorage.getItem(GUEST_BASELINE_KEY) === sourceSignature;
                if (!isUntouchedGuest && window.localStorage.getItem(migrationKey) !== sourceSignature) {
                    setMigration({ user, accountWorkspace, sourceSignature, ...importCandidate });
                    return;
                }
            }

            if (accountWorkspace) {
                await activateAccountWorkspace(user, accountWorkspace, !drafts.resumes.length);
                return;
            }

            const fresh = createSampleResume();
            await activateAccountWorkspace(user, { resumes: [fresh], activeResumeId: fresh.id }, true);
        } catch {
            setErrorMessage("계정의 이력서를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.");
        }
    }, [activateAccountWorkspace, activateGuestWorkspace, stopSync]);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => void load(), 0);
        window.addEventListener("bripick:auth-changed", load);
        return () => {
            window.clearTimeout(initialLoad);
            window.removeEventListener("bripick:auth-changed", load);
            stopSync();
        };
    }, [load, stopSync]);

    const importLegacy = () => {
        if (!migration) return;
        const migrationKey = `bripick-workspace-migration:${migration.user.id}:${migration.sourceLabel}`;
        const merged = mergeWorkspaces(migration.accountWorkspace, migration.workspace);
        void activateAccountWorkspace(migration.user, merged, true).then(() => {
            window.localStorage.setItem(migrationKey, migration.sourceSignature);
            window.localStorage.removeItem(migration.sourceKey);
            if (migration.sourceKey === GUEST_STORAGE_KEY) {
                window.localStorage.removeItem(GUEST_BASELINE_KEY);
            }
        }).catch(() => {
            setErrorMessage("기존 이력서를 계정으로 가져오지 못했습니다.");
            setMigration(null);
        });
    };

    const skipLegacy = () => {
        if (!migration) return;
        const migrationKey = `bripick-workspace-migration:${migration.user.id}:${migration.sourceLabel}`;
        window.localStorage.setItem(migrationKey, migration.sourceSignature);
        if (migration.accountWorkspace) {
            void activateAccountWorkspace(migration.user, migration.accountWorkspace, true).catch(() => {
                setErrorMessage("계정 이력서를 불러오지 못했습니다.");
                setMigration(null);
            });
            return;
        }
        const fresh = createSampleResume();
        void activateAccountWorkspace(
            migration.user,
            { resumes: [fresh], activeResumeId: fresh.id },
            true,
        ).catch(() => {
            setErrorMessage("새 계정 작업공간을 만들지 못했습니다.");
            setMigration(null);
        });
    };

    return (
        <>
            {isLoading && !migration && (
                <div className="workspace-sync-state" role="status" aria-live="polite">
                    <span>계정 이력서를 불러오는 중…</span>
                </div>
            )}
            {errorMessage && (
                <div className="workspace-sync-error" role="alert">
                    <span>{errorMessage}</span>
                    <button type="button" onClick={() => void load()}>다시 시도</button>
                </div>
            )}
            <ServiceDialog
                isOpen={migration !== null}
                title={`${migration?.sourceLabel ?? "비로그인"} 이력서를 가져올까요?`}
                message={`이 브라우저에 저장된 이력서 ${migration?.workspace.resumes.length ?? 0}개를 ${migration?.user.email || "현재 계정"}에 ${migration?.accountWorkspace ? "추가" : "저장"}할 수 있어요.`}
                confirmLabel="계정으로 가져오기"
                cancelLabel={migration?.accountWorkspace ? "계정 이력서 사용" : "새로 시작"}
                onConfirm={importLegacy}
                onCancel={skipLegacy}
            />
        </>
    );
}
