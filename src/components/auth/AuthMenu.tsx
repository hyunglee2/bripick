"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, UserRound, X } from "lucide-react";
import { clearAuthSessionCache, getAuthSession, type AuthUser } from "@/lib/authSession";
import { useResumeStore } from "@/store/useResumeStore";

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

        if (params.has("auth")) {
            params.delete("auth");
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
            {user ? (
                <button
                    type="button"
                    className="auth-menu__trigger auth-menu__trigger--signed-in"
                    onClick={() => setIsOpen((current) => !current)}
                    disabled={isLoading}
                    aria-expanded={isOpen}
                    aria-label={`${displayName} 계정 메뉴`}
                >
                {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                    <span className="auth-menu__initial">{displayName.slice(0, 1).toUpperCase()}</span>
                )}
                </button>
            ) : isLoading ? (
                <button type="button" className="auth-menu__trigger" disabled aria-label="로그인 상태 확인 중">
                    <LogIn size={14} /><span>로그인</span>
                </button>
            ) : (
                <Link className="auth-menu__trigger" href="/login?next=%2Feditor" aria-label="로그인 페이지로 이동">
                    <LogIn size={14} /><span>로그인</span>
                </Link>
            )}

            {isOpen && user && (
                <div className="auth-menu__popover">
                    <div className="auth-menu__popover-heading">
                        <div>
                            <strong>{user ? displayName : "Bripick 로그인"}</strong>
                            <span>{user ? "이 계정으로 이력서를 관리하고 있어요." : "작성한 이력서를 계정에 안전하게 연결하세요."}</span>
                        </div>
                        <button type="button" onClick={() => setIsOpen(false)} aria-label="닫기"><X size={15} /></button>
                    </div>

                    {errorMessage && <p className="auth-menu__error">{errorMessage}</p>}

                    <div className="auth-menu__account">
                        <UserRound size={16} />
                        <div><strong>{user.name || "이름 없음"}</strong><span>{user.email}</span></div>
                    </div>
                    <button type="button" className="auth-menu__logout" onClick={logout} disabled={isLoading}>
                        <LogOut size={15} /> 로그아웃
                    </button>
                </div>
            )}
        </div>
    );
}
