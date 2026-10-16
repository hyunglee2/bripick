import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, assertSameOrigin } from "@/server/http/api-error";

export const runtime = "nodejs";

const FEEDBACK_TYPES = {
    bug: "오류 제보",
    suggestion: "기능 제안",
    question: "기타 문의",
} as const;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const requestHistory = new Map<string, number[]>();

function escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        "\"": "&quot;",
    })[character] || character);
}

function clientAddress(request: NextRequest) {
    return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
        || request.headers.get("x-real-ip")
        || "unknown";
}

function enforceRateLimit(address: string) {
    const now = Date.now();
    const recent = (requestHistory.get(address) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
        throw new ApiError(429, "RATE_LIMITED", "잠시 후 다시 보내주세요.");
    }
    recent.push(now);
    requestHistory.set(address, recent);
}

function optionalString(value: unknown, maxLength: number) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
    try {
        assertSameOrigin(request);
        const contentLength = Number(request.headers.get("content-length") || 0);
        if (contentLength > 20_000) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "요청 내용이 너무 깁니다.");

        const body = await request.json();
        if (optionalString(body?.website, 200)) return NextResponse.json({ sent: true });

        const type = optionalString(body?.type, 20) as keyof typeof FEEDBACK_TYPES;
        const message = optionalString(body?.message, 3000);
        const email = optionalString(body?.email, 254);
        const pageUrl = optionalString(body?.pageUrl, 1000);

        if (!FEEDBACK_TYPES[type]) throw new ApiError(400, "INVALID_TYPE", "문의 유형을 선택해주세요.");
        if (message.length < 5) throw new ApiError(400, "MESSAGE_TOO_SHORT", "내용을 5자 이상 입력해주세요.");
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new ApiError(400, "INVALID_EMAIL", "이메일 주소를 확인해주세요.");
        }

        enforceRateLimit(clientAddress(request));

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) throw new ApiError(503, "FEEDBACK_NOT_CONFIGURED", "피드백 메일 기능을 준비 중입니다.");

        const recipient = process.env.FEEDBACK_TO_EMAIL || "hihylee2@gmail.com";
        const sender = process.env.FEEDBACK_FROM_EMAIL || "Bripick <feedback@mail.coreluma.kr>";
        const typeLabel = FEEDBACK_TYPES[type];
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: sender,
                to: [recipient],
                ...(email ? { reply_to: email } : {}),
                subject: `[Bripick 피드백] ${typeLabel}`,
                html: `
                    <h2>${escapeHtml(typeLabel)}</h2>
                    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
                    <hr />
                    <p><strong>회신 이메일:</strong> ${email ? escapeHtml(email) : "입력하지 않음"}</p>
                    <p><strong>페이지:</strong> ${pageUrl ? escapeHtml(pageUrl) : "확인 불가"}</p>
                    <p><strong>User-Agent:</strong> ${escapeHtml(request.headers.get("user-agent") || "확인 불가")}</p>
                `,
                text: `${typeLabel}\n\n${message}\n\n회신 이메일: ${email || "입력하지 않음"}\n페이지: ${pageUrl || "확인 불가"}`,
            }),
        });

        if (!response.ok) {
            console.error("[feedback:resend]", response.status, await response.text());
            throw new ApiError(502, "EMAIL_SEND_FAILED", "피드백을 보내지 못했습니다. 잠시 후 다시 시도해주세요.");
        }

        return NextResponse.json({ sent: true }, { status: 201 });
    } catch (error) {
        return apiErrorResponse(error);
    }
}
