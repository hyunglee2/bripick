import styles from "./landing.module.css";

const STAR = "M12 0C12.6 6.6 17.4 11.4 24 12C17.4 12.6 12.6 17.4 12 24C11.4 17.4 6.6 12.6 0 12C6.6 11.4 11.4 6.6 12 0Z";

// 히어로 가로 전체 배경: 파랑·보라 번짐 이미지(public/landing/hero-wave.png)와
// 번짐 위에 얹는 작은 흰 장식(별 세 개, 점 격자). 순수 장식이다.
export default function HeroWave() {
  return (
    <>
      <div className={styles.wave} aria-hidden="true" />
      <div className={styles.heroDeco} aria-hidden="true">
        <DecoStars />
        <DecoGrid />
      </div>
    </>
  );
}

// 작은 흰 별 세 개(가운데는 45도 기울임). 히어로와 하단 CTA에서 함께 쓴다.
export function DecoStars() {
  return (
    <span className={styles.decoStars} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" data-tilt={i === 1 ? "" : undefined}>
          <path d={STAR} fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

// 흰 점 격자 3x5
export function DecoGrid() {
  return (
    <span className={styles.decoGrid} aria-hidden="true">
      {Array.from({ length: 15 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}