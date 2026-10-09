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

const LEGACY_STORAGE_KEY = "bripick-resume-storage";
const GUEST_STORAGE_KEY = "bripick-resume-storage:guest";
const accountStorageKey = (userId: string) => `bripick-resume-storage:user:${userId}`;

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
    const [migration, setMigration] = useState<{
        user: SessionUser;
        workspace: StoredWorkspace;
    } | null>(null);
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
            if (drafts.resumes.length) {
                await activateAccountWorkspace(user, drafts, false);
                return;
            }

            const cached = readWorkspace(accountStorageKey(user.id));
            if (cached) {
                await activateAccountWorkspace(user, cached, true);
                return;
            }

            const legacy = readWorkspace(LEGACY_STORAGE_KEY);
            const migrationKey = `bripick-legacy-migration:${user.id}`;
            if (legacy && !window.localStorage.getItem(migrationKey)) {
                setMigration({ user, workspace: legacy });
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
        const migrationKey = `bripick-legacy-migration:${migration.user.id}`;
        window.localStorage.setItem(migrationKey, "imported");
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        void activateAccountWorkspace(migration.user, migration.workspace, true).catch(() => {
            setErrorMessage("기존 이력서를 계정으로 가져오지 못했습니다.");
            setMigration(null);
        });
    };

    const skipLegacy = () => {
        if (!migration) return;
        const migrationKey = `bripick-legacy-migration:${migration.user.id}`;
        window.localStorage.setItem(migrationKey, "skipped");
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
                title="기존 이력서를 가져올까요?"
                message={`이 브라우저에 저장된 이력서 ${migration?.workspace.resumes.length ?? 0}개를 ${migration?.user.email || "현재 계정"}에 저장할 수 있어요.`}
                confirmLabel="계정으로 가져오기"
                cancelLabel="새로 시작"
                onConfirm={importLegacy}
                onCancel={skipLegacy}
            />
        </>
    );
}
