"use client";

import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, UserRound, X } from "lucide-react";
import { clearAuthSessionCache, getAuthSession, type AuthUser } from "@/lib/authSession";
import { useResumeStore } from "@/store/useResumeStore";

const authErrorMessages: Record<string, string> = {
    unsupported_provider: "지원하지 않는 로그인 방식입니다.",
    oauth_start_failed: "로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    missing_code: "로그인 인증 코드가 전달되지 않았습니다.",
    callback_failed: "로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요.",
    provider_callback_failed: "로그인 제공자 인증에 실패했습니다. 설정을 확인한 뒤 다시 시도해 주세요.",
};

export default function AuthMenu() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const oauthCode = params.get("code");
        const oauthError = params.get("error");

        // Supabase가 허용되지 않은 redirectTo를 Site URL로 대체한 경우에도
        // 루트에 전달된 OAuth 결과를 서버 콜백으로 넘겨 세션 교환을 완료한다.
        if (oauthCode || oauthError) {
            const callbackUrl = new URL("/auth/callback", window.location.origin);
            ["code", "error", "error_code", "error_description"].forEach((key) => {
                const value = params.get(key);
                if (value) callbackUrl.searchParams.set(key, value);
            });
            window.location.replace(callbackUrl.toString());
            return;
        }

        let isActive = true;
        getAuthSession()
            .then((sessionUser) => {
                if (isActive) setUser(sessionUser);
            })
            .catch(() => {
                // 세션 조회 실패는 로그인하지 않은 상태와 동일하게 취급한다.
                // 게스트 편집은 인증 서버 상태와 무관하게 계속 사용할 수 있어야 한다.
                if (isActive) setUser(null);
            })
            .finally(() => {
                if (isActive) setIsLoading(false);
            });

        const authError = params.get("authError");
        const authTrace = params.get("authTrace");
        if (authError) {
            const message = authErrorMessages[authError] || "로그인 중 오류가 발생했습니다.";
            setErrorMessage(authTrace ? `${message} 오류 ID: ${authTrace}` : message);
            setIsOpen(true);
        }
        if (params.has("auth") || authError) {
            params.delete("auth");
            params.delete("authError");
            params.delete("authTrace");
            const query = params.toString();
            window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
        }

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        const close = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        window.addEventListener("pointerdown", close);
        return () => window.removeEventListener("pointerdown", close);
    }, []);

    const startLogin = (provider: "google" | "kakao") => {
        setErrorMessage(null);
        window.location.assign(`/api/auth/oauth/${provider}?next=${encodeURIComponent(window.location.pathname)}`);
    };

    const logout = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            if (user) {
                const workspace = useResumeStore.getState();
                await fetch("/api/resumes/drafts", {
                    method: "PUT",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        resumes: workspace.resumeList,
                        activeResumeId: workspace.resume.id,
                    }),
                }).catch(() => null);
            }
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin",
            });
            if (!response.ok) throw new Error();
            clearAuthSessionCache();
            setUser(null);
            setIsOpen(false);
            window.dispatchEvent(new Event("bripick:auth-changed"));
        } catch {
            setErrorMessage("로그아웃하지 못했습니다. 다시 시도해 주세요.");
        } finally {
            setIsLoading(false);
        }
    };

    const displayName = user?.name || user?.email || "내 계정";

    return (
        <div ref={containerRef} className="auth-menu">
            <button
                type="button"
                className={`auth-menu__trigger${user ? " auth-menu__trigger--signed-in" : ""}`}
                onClick={() => setIsOpen((current) => !current)}
                disabled={isLoading}
                aria-expanded={isOpen}
                aria-label={user ? `${displayName} 계정 메뉴` : "로그인"}
            >
                {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
                ) : user ? (
                    <span className="auth-menu__initial">{displayName.slice(0, 1).toUpperCase()}</span>
                ) : (
                    <><LogIn size={14} /><span>로그인</span></>
                )}
            </button>

            {isOpen && (
                <>
                {!user && (
                    <button
                        type="button"
                        className="auth-menu__backdrop"
                        onClick={() => setIsOpen(false)}
                        aria-label="로그인 창 닫기"
                    />
                )}
                <div className="auth-menu__popover">
                    <div className="auth-menu__popover-heading">
                        <div>
                            <strong>{user ? displayName : "Bripick 로그인"}</strong>
                            <span>{user ? "이 계정으로 이력서를 관리하고 있어요." : "작성한 이력서를 계정에 안전하게 연결하세요."}</span>
                        </div>
                        <button type="button" onClick={() => setIsOpen(false)} aria-label="닫기"><X size={15} /></button>
                    </div>

                    {errorMessage && <p className="auth-menu__error">{errorMessage}</p>}

                    {user ? (
                        <>
                            <div className="auth-menu__account">
                                <UserRound size={16} />
                                <div><strong>{user.name || "이름 없음"}</strong><span>{user.email}</span></div>
                            </div>
                            <button type="button" className="auth-menu__logout" onClick={logout} disabled={isLoading}>
                                <LogOut size={15} /> 로그아웃
                            </button>
                        </>
                    ) : (
                        <div className="auth-menu__providers">
                            <button type="button" className="auth-provider auth-provider--google" onClick={() => startLogin("google")}>
                                <span aria-hidden="true">G</span> Google로 계속하기
                            </button>
                            <button type="button" className="auth-provider auth-provider--kakao" onClick={() => startLogin("kakao")}>
                                <span aria-hidden="true">K</span> 카카오로 계속하기
                            </button>
                            <p>로그인하면 이력서를 계정에 저장하고 다른 기기에서도 이어서 관리할 수 있어요.</p>
                        </div>
                    )}
                </div>
                </>
            )}
        </div>
    );
}
