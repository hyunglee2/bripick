"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const header = document.querySelector<HTMLElement>(".landing-header");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastScrollY = window.scrollY;
    let frameId = 0;

    const updateHeader = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY <= 12) {
        header?.classList.remove("is-hidden");
      } else if (Math.abs(delta) >= 6) {
        header?.classList.toggle("is-hidden", delta > 0 && currentScrollY > 80);
      }

      lastScrollY = currentScrollY;
      frameId = 0;
    };

    const handleScroll = () => {
      if (!frameId) frameId = window.requestAnimationFrame(updateHeader);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return () => {
        window.removeEventListener("scroll", handleScroll);
        if (frameId) window.cancelAnimationFrame(frameId);
        header?.classList.remove("is-hidden");
      };
    }

    root.classList.add("landing-reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { rootMargin: "0px 0px -10%", threshold: 0.12 },
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
      header?.classList.remove("is-hidden");
      root.classList.remove("landing-reveal-ready");
    };
  }, []);

  return null;
}
