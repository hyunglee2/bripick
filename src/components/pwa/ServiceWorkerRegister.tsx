"use client";

import { useEffect } from "react";

// 배포 환경에서만 /sw.js를 등록한다. 개발 중(next dev)에는 캐시가 헷갈림을 만들 수 있어 건너뛴다.
export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") return;
        if (!("serviceWorker" in navigator)) return;

        const register = () => {
            navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
                // 등록에 실패해도 사이트 사용에는 지장이 없으므로 조용히 넘어간다.
            });
        };

        if (document.readyState === "complete") {
            register();
            return;
        }
        window.addEventListener("load", register, { once: true });
        return () => window.removeEventListener("load", register);
    }, []);

    return null;
}
