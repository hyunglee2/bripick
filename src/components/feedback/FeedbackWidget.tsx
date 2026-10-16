"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, MessageCircle, Send, X } from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics";

const feedbackTypes = [
    { value: "bug", label: "오류 제보" },
    { value: "suggestion", label: "기능 제안" },
    { value: "question", label: "기타 문의" },
] as const;

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [submitState, setSubmitState] = useState<SubmitState>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const closeWithEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", closeWithEscape);
        dialogRef.current?.querySelector<HTMLElement>("select, textarea, input")?.focus();
        return () => window.removeEventListener("keydown", closeWithEscape);
    }, [isOpen]);

    const open = () => {
        setSubmitState("idle");
        setErrorMessage("");
        setIsOpen(true);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitState("submitting");
        setErrorMessage("");

        const form = event.currentTarget;
        const formData = new FormData(form);
        const payload = {
            type: formData.get("type"),
            message: formData.get("message"),
            email: formData.get("email"),
            website: formData.get("website"),
            pageUrl: window.location.href,
        };

        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(body?.error?.message || "피드백을 보내지 못했습니다.");
            }
            trackAnalyticsEvent("feedback_submit", {
                feedback_type: String(payload.type || "unknown"),
            });
            form.reset();
            setSubmitState("success");
        } catch (error) {
            setSubmitState("error");
            setErrorMessage(error instanceof Error ? error.message : "피드백을 보내지 못했습니다.");
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={open}
                className="feedback-launcher print:hidden"
                aria-label="피드백 보내기"
            >
                <MessageCircle size={17} aria-hidden="true" />
                <span>피드백</span>
            </button>

            {isOpen && (
                <div className="feedback-overlay print:hidden" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setIsOpen(false);
                }}>
                    <div
                        ref={dialogRef}
                        className="feedback-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="feedback-title"
                    >
                        <div className="feedback-dialog__header">
                            <div>
                                <p className="feedback-dialog__eyebrow">FEEDBACK</p>
                                <h2 id="feedback-title">의견을 들려주세요</h2>
                                <p>불편한 점이나 필요한 기능을 편하게 남겨주세요.</p>
                            </div>
                            <button type="button" onClick={() => setIsOpen(false)} aria-label="닫기">
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>

                        {submitState === "success" ? (
                            <div className="feedback-success" role="status">
                                <CheckCircle2 size={34} aria-hidden="true" />
                                <strong>소중한 의견 감사합니다.</strong>
                                <p>확인 후 더 나은 Bripick을 만드는 데 반영할게요.</p>
                                <button type="button" onClick={() => setIsOpen(false)}>닫기</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="feedback-form">
                                <label>
                                    <span>문의 유형</span>
                                    <select name="type" defaultValue="suggestion">
                                        {feedbackTypes.map((type) => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    <span>내용 <em>필수</em></span>
                                    <textarea
                                        name="message"
                                        required
                                        minLength={5}
                                        maxLength={3000}
                                        rows={6}
                                        placeholder="어떤 점이 불편했거나, 무엇이 필요했는지 알려주세요."
                                    />
                                </label>

                                <label>
                                    <span>답변받을 이메일 <small>선택</small></span>
                                    <input name="email" type="email" maxLength={254} placeholder="name@example.com" />
                                </label>

                                <label className="feedback-honeypot" aria-hidden="true">
                                    웹사이트
                                    <input name="website" type="text" tabIndex={-1} autoComplete="off" />
                                </label>

                                {submitState === "error" && <p className="feedback-error" role="alert">{errorMessage}</p>}

                                <p className="feedback-privacy-note">
                                    오류 확인을 위해 현재 페이지 주소와 브라우저 정보가 함께 전송됩니다.
                                </p>

                                <button className="feedback-submit" type="submit" disabled={submitState === "submitting"}>
                                    <Send size={15} aria-hidden="true" />
                                    {submitState === "submitting" ? "보내는 중…" : "피드백 보내기"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
