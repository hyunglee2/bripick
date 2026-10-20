"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import styles from "./landing.module.css";

const TEMPLATES = [
  { id: "modern", label: "모던" },
  { id: "minimal", label: "미니멀" },
  { id: "creative", label: "크리에이티브" },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

// 히어로의 이력서 미리보기. 템플릿 탭을 누르거나 가만히 두면 스타일이 바뀐다.
export default function TemplatePreview() {
  const [template, setTemplate] = useState<TemplateId>("modern");
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setTemplate((current) => {
        const index = TEMPLATES.findIndex((item) => item.id === current);
        return TEMPLATES[(index + 1) % TEMPLATES.length].id;
      });
    }, 3200);
    return () => window.clearInterval(timer);
  }, [autoplay]);

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
            onClick={() => {
              setAutoplay(false);
              setTemplate(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.paper} data-template={template} aria-label="이력서 예시">
        <div className={styles.paperAside} />
        <div className={styles.paperBody}>
          <div className={styles.paperHead}>
            <div className={styles.paperAvatar} />
            <div>
              <p className={styles.paperName}>김지원</p>
              <p className={styles.paperRole}>프론트엔드 엔지니어 · 5년차</p>
            </div>
          </div>

          <div className={styles.paperBlock}>
            <p className={styles.paperLabel}>경력</p>
            <div className={styles.paperRow}>
              <strong>핀테크 스타트업</strong>
              <span>2022 – 현재</span>
            </div>
            <ul>
              <li>결제 페이지 LCP 3.1초 → 1.2초 개선</li>
              <li>디자인 시스템 구축, 화면 개발 속도 40% 향상</li>
            </ul>
          </div>

          <div className={styles.paperBlock}>
            <p className={styles.paperLabel}>기술 스택</p>
            <div className={styles.paperChips}>
              <span>TypeScript</span>
              <span>React</span>
              <span>Next.js</span>
              <span>Node.js</span>
            </div>
          </div>

          <div className={styles.paperBlock}>
            <p className={styles.paperLabel}>프로젝트</p>
            <div className={styles.paperLines}>
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
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
