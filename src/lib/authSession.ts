export type AuthUser = {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    provider: string | null;
    isAnonymous: boolean;
};

type SessionResponse = { user: AuthUser | null };

let sessionRequest: Promise<AuthUser | null> | null = null;

export function getAuthSession() {
    if (!sessionRequest) {
        sessionRequest = fetch("/api/auth/session", {
            cache: "no-store",
            credentials: "same-origin",
        }).then(async (response) => {
            if (!response.ok) throw new Error("세션을 확인하지 못했습니다.");
            const body = await response.json() as SessionResponse;
            return body.user?.isAnonymous ? null : body.user;
        }).catch((error) => {
            sessionRequest = null;
            throw error;
        });
    }
    return sessionRequest;
}

export function clearAuthSessionCache() {
    sessionRequest = null;
}
