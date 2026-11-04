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

    // 화면에 다시 들어올 때마다 안쪽의 한 번짜리 CSS 애니메이션을 처음부터 다시 재생한다.
    const replay = (target: Element) => {
      target.getAnimations({ subtree: true }).forEach((animation) => {
        if (!(animation instanceof CSSAnimation)) return;
        if (animation.effect?.getTiming().iterations === Infinity) return;
        animation.cancel();
        animation.play();
      });
    };

    const replayTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-replay]"));
    const left = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target;
          // 완전히 벗어나면 초기화해 두고, 다시 12% 이상 보이면 재생한다.
          if (!entry.isIntersecting) {
            target.removeAttribute("data-shown");
            left.add(target);
            return;
          }
          if (entry.intersectionRatio < 0.12) return;
          if (target.hasAttribute("data-reveal")) target.setAttribute("data-shown", "");
          if (left.has(target)) {
            left.delete(target);
            replay(target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: [0, 0.12] },
    );
    elements.forEach((element) => observer.observe(element));
    replayTargets.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
