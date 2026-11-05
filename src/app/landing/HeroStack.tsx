import { GripVertical } from "lucide-react";
import HeroSpace from "./HeroSpace";
import styles from "./landing.module.css";

// 히어로 오른쪽 장면: 블록이 하나씩 내려와 A4 한 장 위에 쌓이며 이력서가 된다.
// 내용은 에디터의 샘플 이력서에서 가져왔다. 순수 장식이라 스크린리더에서는 숨긴다.
const BLOCKS = [
  {
    kind: "profile",
    label: "프로필",
    body: (
      <div className={styles.sbProfile}>
        <span className={styles.sbAvatar} />
        <div>
          <p className={styles.sbEyebrow}>복잡한 문제를 이해하기 쉬운 화면으로 풀어내는</p>
          <p className={styles.sbName}>
            Frontend Engineer <b>김브릭</b>
          </p>
          <p className={styles.sbMeta}>birpick@coreluma.kr · github.com/bripick</p>
        </div>
      </div>
    ),
  },
  {
    kind: "skills",
    label: "기술 스택",
    body: (
      <>
        <p className={styles.sbTitle}>Core Skills</p>
        <div className={styles.sbChips}>
          {["React", "Next.js", "TypeScript", "TanStack Query", "Playwright"].map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </>
    ),
  },
  {
    kind: "experience",
    label: "경력",
    body: (
      <>
        <p className={styles.sbTitle}>Work Experience</p>
        <p className={styles.sbRow}>
          <b>루미노스 커머스</b>
          <span>2023.04 – 재직 중</span>
        </p>
        <ul className={styles.sbBullets}>
          <li>커머스 운영 도구와 고객용 웹 서비스 프론트엔드 개발</li>
          <li>디자이너·백엔드와 공통 UI 정책과 배포 프로세스 정립</li>
        </ul>
      </>
    ),
  },
  {
    kind: "project",
    label: "프로젝트",
    body: (
      <>
        <p className={styles.sbTitle}>Notable Projects</p>
        <p className={styles.sbRow}>
          <b>파트너 정산 대시보드</b>
          <span>2024.02 – 2024.08</span>
        </p>
        <ul className={styles.sbBullets}>
          <li>정산 화면 구조 설계로 조회 시간 35% 단축</li>
          <li>공통 테이블 컴포넌트로 신규 화면 개발 기간 절반으로 줄임</li>
        </ul>
      </>
    ),
  },
  {
    kind: "education",
    label: "학력",
    body: (
      <>
        <p className={styles.sbTitle}>Education</p>
        <p className={styles.sbRow}>
          <b>브릭대학교 컴퓨터공학과</b>
          <span>2016.03 – 2022.02</span>
        </p>
      </>
    ),
  },
];

export default function HeroStack() {
  return (
    <div className={styles.stackScene} aria-hidden="true">
      <HeroSpace
        className={styles.space}
        hazeClassName={styles.haze}
      />
      <div className={styles.stackSheet}>
        {BLOCKS.map((block, index) => (
          <div
            key={block.kind}
            className={styles.stackBlock}
            data-kind={block.kind}
            style={{ "--i": index } as React.CSSProperties}
          >
            <span className={styles.stackTag}>
              <GripVertical size={12} />
              {block.label}
            </span>
            {block.body}
          </div>
        ))}
        <span className={styles.stackPage}>A4 · 1 / 1</span>
      </div>
    </div>
  );
}
