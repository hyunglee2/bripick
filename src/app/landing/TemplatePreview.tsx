"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, GripVertical, Link2, MousePointer2 } from "lucide-react";
import styles from "./landing.module.css";

// 이미지는 에디터의 기본 샘플 이력서 첫 페이지를 템플릿별로 캡처한 것이다.
const TEMPLATES = [
  { id: "modern", label: "모던", image: "/landing/resume-modern.webp" },
  { id: "minimal", label: "미니멀", image: "/landing/resume-minimal.webp" },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

// 히어로의 이력서 미리보기. 스크롤하거나 템플릿 탭을 누르면 스타일이 바뀐다.
export default function TemplatePreview() {
  const [template, setTemplate] = useState<TemplateId>("modern");

  // 처음엔 모던, 스크롤을 조금 내리면 미니멀로 바뀐다. 기준선을 넘을 때만 바꾸므로 탭으로 고른 값은 유지된다.
  useEffect(() => {
    const threshold = () => Math.min(160, window.innerHeight * 0.18);
    let scrolled = window.scrollY > threshold();
    if (scrolled) setTemplate("minimal");
    const onScroll = () => {
      const next = window.scrollY > threshold();
      if (next === scrolled) return;
      scrolled = next;
      setTemplate(next ? "minimal" : "modern");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={styles.preview}>
      <div className={styles.tabs} role="tablist" aria-label="템플릿 미리보기">
        {TEMPLATES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={template === item.id}
            className={styles.tab}
            onClick={() => setTemplate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.paperStack}>
        <span className={styles.paperGlow} aria-hidden="true" />
        <div className={styles.paper}>
          {TEMPLATES.map((item, index) => (
            <Image
              key={item.id}
              src={item.image}
              alt={`${item.label} 템플릿으로 만든 샘플 이력서`}
              width={1000}
              height={1300}
              sizes="(max-width: 640px) 100vw, 440px"
              priority={index === 0}
              className={styles.paperShot}
              data-active={template === item.id}
              aria-hidden={template !== item.id}
            />
          ))}
          <span className={styles.paperScan} aria-hidden="true" />
        </div>
      </div>

      <div className={styles.dragChip} aria-hidden="true">
        <GripVertical size={14} />
        <span>프로젝트 블록</span>
        <MousePointer2 size={24} strokeWidth={1.75} className={styles.dragCursor} />
      </div>

      <div className={`${styles.floatCard} ${styles.floatAts}`} aria-hidden="true">
        <span className={styles.floatIcon}>
          <Check size={14} />
        </span>
        <div>
          <p>ATS 검사</p>
          <strong>합격 안정권</strong>
        </div>
      </div>

      <div className={`${styles.floatCard} ${styles.floatLink}`} aria-hidden="true">
        <span className={styles.floatIcon}>
          <Link2 size={14} />
        </span>
        <div>
          <p>공개 링크</p>
          <strong>/r/jiwon-kim</strong>
        </div>
      </div>
    </div>
  );
}
