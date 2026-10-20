"use client";

import { useEffect } from "react";

// 스크롤 진입 애니메이션과 헤더 상태만 담당한다. JS가 없으면 모든 요소가 그대로 보인다.
export default function LandingMotion() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-landing-header]")?.parentElement;
    const header = document.querySelector<HTMLElement>("[data-landing-header]");
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onScroll = () => header?.toggleAttribute("data-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.setAttribute("data-shown", ""));
      return () => window.removeEventListener("scroll", onScroll);
    }

    page?.setAttribute("data-motion", "ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-shown", "");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
