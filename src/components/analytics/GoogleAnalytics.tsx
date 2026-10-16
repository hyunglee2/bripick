"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import {
    ANALYTICS_CONSENT_STORAGE_KEY,
    type AnalyticsConsent,
} from "@/lib/analytics";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const isValidMeasurementId = Boolean(measurementId && /^G-[A-Z0-9]+$/i.test(measurementId));
const consentChangeEventName = "bripick:analytics-consent-change";

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

export default function GoogleAnalytics() {
    if (!isValidMeasurementId || !measurementId) return null;

    return <AnalyticsConsentManager measurementId={measurementId} />;
}

function AnalyticsConsentManager({ measurementId }: { measurementId: string }) {
    const consent = useSyncExternalStore(subscribeToConsent, getSavedConsent, () => null);

    const handleConsent = (nextConsent: AnalyticsConsent) => {
        window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, nextConsent);
        window.dispatchEvent(new Event(consentChangeEventName));
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

            {consent === null && (
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
                    </div>
                </section>
            )}
        </>
    );
}
