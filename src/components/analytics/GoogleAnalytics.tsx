"use client";

import Script from "next/script";
import { X } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
    ANALYTICS_CONSENT_STORAGE_KEY,
    type AnalyticsConsent,
} from "@/lib/analytics";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const isValidMeasurementId = Boolean(measurementId && /^G-[A-Z0-9]+$/i.test(measurementId));
const consentChangeEventName = "bripick:analytics-consent-change";
const consentDismissedSessionKey = "bripick-analytics-consent-dismissed";
const consentDismissedEventName = "bripick:analytics-consent-dismissed";

function getSavedConsent(): AnalyticsConsent | null {
    const savedConsent = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return savedConsent === "granted" || savedConsent === "denied" ? savedConsent : null;
}

function subscribeToConsent(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(consentChangeEventName, onStoreChange);

    return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(consentChangeEventName, onStoreChange);
    };
}

function getSessionDismissed() {
    return window.sessionStorage.getItem(consentDismissedSessionKey) === "true";
}

function subscribeToSessionDismissed(onStoreChange: () => void) {
    window.addEventListener(consentDismissedEventName, onStoreChange);
    return () => window.removeEventListener(consentDismissedEventName, onStoreChange);
}

export default function GoogleAnalytics() {
    if (!isValidMeasurementId || !measurementId) return null;

    return <AnalyticsConsentManager measurementId={measurementId} />;
}

function AnalyticsConsentManager({ measurementId }: { measurementId: string }) {
    const consent = useSyncExternalStore(subscribeToConsent, getSavedConsent, () => null);
    const sessionDismissed = useSyncExternalStore(
        subscribeToSessionDismissed,
        getSessionDismissed,
        () => false,
    );

    const handleConsent = (nextConsent: AnalyticsConsent) => {
        window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, nextConsent);
        window.dispatchEvent(new Event(consentChangeEventName));
    };

    const handleDismiss = () => {
        window.sessionStorage.setItem(consentDismissedSessionKey, "true");
        window.dispatchEvent(new Event(consentDismissedEventName));
    };

    return (
        <>
            {consent === "granted" && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
                        strategy="afterInteractive"
                    />
                    <Script id="bripick-google-analytics" strategy="afterInteractive">
                        {`
                            window.dataLayer = window.dataLayer || [];
                            function gtag(){dataLayer.push(arguments);}
                            window.gtag = gtag;
                            gtag('js', new Date());
                            gtag('config', '${measurementId}', { 'anonymize_ip': true });
                        `}
                    </Script>
                </>
            )}

            {consent === null && !sessionDismissed && (
                <section className="analytics-consent" aria-label="분석 데이터 수집 안내">
                    <p>
                        Bripick은 서비스 이용 현황 분석과 품질 개선을 위해 Google Analytics를 사용합니다.
                    </p>
                    <div className="analytics-consent__actions">
                        <button type="button" onClick={() => handleConsent("denied")}>거부</button>
                        <button
                            type="button"
                            className="analytics-consent__accept"
                            onClick={() => handleConsent("granted")}
                        >
                            동의
                        </button>
                        <button
                            type="button"
                            className="analytics-consent__close"
                            aria-label="이번 방문에는 닫기"
                            title="이번 방문에는 닫기"
                            onClick={handleDismiss}
                        >
                            <X size={15} aria-hidden="true" />
                        </button>
                    </div>
                </section>
            )}
        </>
    );
}
