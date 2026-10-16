export type AnalyticsEventName =
    | "feedback_submit"
    | "login_start"
    | "pdf_download"
    | "public_link_copy"
    | "resume_create"
    | "resume_duplicate"
    | "resume_publish"
    | "resume_unpublish"
    | "resume_update";

type AnalyticsEventParameters = Record<string, string | number | boolean | undefined>;

export const ANALYTICS_CONSENT_STORAGE_KEY = "bripick-analytics-consent";
export type AnalyticsConsent = "granted" | "denied";

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}

export function trackAnalyticsEvent(
    eventName: AnalyticsEventName,
    parameters: AnalyticsEventParameters = {},
) {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;

    if (window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) !== "granted") return;

    if (window.gtag) {
        window.gtag("event", eventName, parameters);
        return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(["event", eventName, parameters]);
}
