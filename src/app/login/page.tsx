import type { Metadata } from "next";
import LoginPage from "@/components/auth/LoginPage";

export const metadata: Metadata = {
    title: "로그인",
    description: "Google 또는 카카오 계정으로 Bripick에 로그인하세요.",
    alternates: { canonical: "/login" },
    robots: { index: false, follow: false },
};

const authErrorMessages: Record<string, string> = {
    unsupported_provider: "지원하지 않는 로그인 방식입니다.",
    oauth_start_failed: "로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    missing_code: "로그인 인증 코드가 전달되지 않았습니다.",
    callback_failed: "로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요.",
    provider_callback_failed: "로그인 제공자 인증에 실패했습니다. 설정을 확인한 뒤 다시 시도해 주세요.",
};

type LoginSearchParams = Promise<{
    authError?: string | string[];
    authTrace?: string | string[];
    next?: string | string[];
}>;

function safeNextPath(value: string | string[] | undefined) {
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
        ? value
        : "/editor";
}

export default async function Page({ searchParams }: { searchParams: LoginSearchParams }) {
    const query = await searchParams;
    const nextPath = safeNextPath(query.next);
    const authError = typeof query.authError === "string" ? query.authError : null;
    const authTrace = typeof query.authTrace === "string" ? query.authTrace : null;
    const message = authError
        ? authErrorMessages[authError] || "로그인 중 오류가 발생했습니다."
        : null;
    const errorMessage = message && authTrace ? `${message} 오류 ID: ${authTrace}` : message;

    return <LoginPage initialErrorMessage={errorMessage} nextPath={nextPath} />;
}
