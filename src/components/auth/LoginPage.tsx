"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/lib/authSession";
import { trackAnalyticsEvent } from "@/lib/analytics";

export default function LoginPage({
    initialErrorMessage,
    nextPath,
}: {
    initialErrorMessage: string | null;
    nextPath: string;
}) {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        let active = true;
        getAuthSession()
            .then((user) => {
                if (active && user) router.replace(nextPath);
            })
            .catch(() => null)
            .finally(() => {
                if (active) setIsChecking(false);
            });
        return () => { active = false; };
    }, [nextPath, router]);

    return (
        <main className="login-page">
            <div className="login-page__glow login-page__glow--one" />
            <div className="login-page__glow login-page__glow--two" />
            <Link href="/" className="login-page__back"><ArrowLeft size={17} /> 홈으로 돌아가기</Link>

            <div className="login-page__content">
                <Link href="/" className="login-page__brand" aria-label="Bripick 홈으로 이동">
                    <Image src="/bripick_header_logo_dark.svg" width={142} height={40} alt="Bripick" priority />
                </Link>
                <section className="login-card" aria-labelledby="login-title">
                    <div className="login-card__heading">
                        <h1 id="login-title">
                            <strong>작성하던 이력서, 어디서든 그대로</strong>
                            <span>로그인하고 편리하게 관리하세요</span>
                        </h1>
                    </div>

                    {initialErrorMessage && <p className="login-card__error" role="alert">{initialErrorMessage}</p>}

                    <div className="login-card__providers">
                        <form action="/api/auth/oauth/google" method="get">
                            <input type="hidden" name="next" value={nextPath} />
                            <button
                                type="submit"
                                className="auth-provider auth-provider--google"
                                disabled={isChecking}
                                onClick={() => trackAnalyticsEvent("login_start", { method: "google" })}
                            >
                                <Image
                                    className="auth-provider__icon"
                                    src="/google-g-logo.png"
                                    width={18}
                                    height={18}
                                    alt=""
                                    aria-hidden="true"
                                />
                                <span>Google로 계속하기</span>
                            </button>
                        </form>
                        <form action="/api/auth/oauth/kakao" method="get">
                            <input type="hidden" name="next" value={nextPath} />
                            <button
                                type="submit"
                                className="auth-provider auth-provider--kakao"
                                disabled={isChecking}
                                aria-label="카카오 로그인"
                                onClick={() => trackAnalyticsEvent("login_start", { method: "kakao" })}
                            >
                                <Image
                                    className="auth-provider__kakao-asset"
                                    src="/kakao-login-complete-ko.svg"
                                    width={224}
                                    height={46}
                                    alt=""
                                    aria-hidden="true"
                                />
                            </button>
                        </form>
                    </div>

                    <div className="login-card__notice">
                        {/* <ShieldCheck size={16} /> */}
                        <p>로그인하면 비로그인 상태에서 작성한 이력서를 계정으로 가져올 수 있어요.</p>
                    </div>
                </section>
            </div>
        </main>
    );
}
