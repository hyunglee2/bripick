import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CloudUpload,
  FileDown,
  GripVertical,
  LayoutTemplate,
  Link2,
  LogIn,
  ShieldCheck,
  Type,
  UserRound,
} from "lucide-react";
import LandingMotion from "./LandingMotion";
import TemplatePreview from "./TemplatePreview";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "블록으로 쌓는 개발자 이력서",
  description:
    "경력, 프로젝트, 기술 스택을 블록처럼 쌓아 이력서를 완성하세요. PDF 저장, 공개 링크, ATS 검사까지 Bripick 한 곳에서.",
  alternates: { canonical: "/landing" },
  // 새 랜딩페이지 시안이 확정될 때까지 검색 노출을 막는다.
  robots: { index: false, follow: false },
};

const START_HREF = "/editor";
const LOGIN_HREF = "/login?next=%2Feditor";

const BLOCK_NAMES = ["프로필", "경력", "프로젝트", "기술 스택", "학력", "자격증", "자유 텍스트", "페이지 나누기"];

const ATS_CHECKS = [
  { label: "이름 · 직무 · 연락처", done: true },
  { label: "핵심 소개 30자 이상", done: true },
  { label: "기술 키워드 3개 이상", done: true },
  { label: "숫자로 증명한 성과", done: true },
  { label: "학력 정보", done: false },
];

const STEPS = [
  {
    no: "01",
    title: "블록을 고르세요",
    body: "프로필, 경력, 프로젝트처럼 필요한 블록만 꺼내 쌓습니다. 빈 문서 앞에서 막막할 일이 없어요.",
  },
  {
    no: "02",
    title: "내용만 채우세요",
    body: "여백, 정렬, 서체는 템플릿이 맞춥니다. 당신은 무엇을 해냈는지에만 집중하면 됩니다.",
  },
  {
    no: "03",
    title: "내보내고 공유하세요",
    body: "제출 전 ATS 검사로 빠진 곳을 확인하고, PDF로 저장하거나 공개 링크로 바로 보내세요.",
  },
];

const FAQS = [
  {
    q: "가입해야 쓸 수 있나요?",
    a: "아니요. 가입 없이 바로 작성을 시작할 수 있어요. 나중에 Google이나 카카오로 로그인하면 작성하던 이력서를 계정으로 그대로 가져옵니다.",
  },
  {
    q: "PDF로 저장하면 레이아웃이 깨지지 않나요?",
    a: "화면에서 보이는 페이지 그대로 저장됩니다. 페이지 나누기 블록과 블록 묶어두기 옵션으로 원하는 위치에서 페이지를 넘길 수 있어요.",
  },
  {
    q: "ATS 검사는 무엇을 확인하나요?",
    a: "기본 인적 사항, 핵심 소개, 기술 키워드, 숫자로 표현한 성과, 학력 정보를 점검해 100점 만점으로 알려 드리고, 보완할 부분을 짚어 줍니다.",
  },
  {
    q: "공유 링크는 언제든 내릴 수 있나요?",
    a: "네. 게시 버튼 하나로 공개 링크를 만들고, 수정한 내용을 다시 게시하거나 게시를 취소할 수 있어요.",
  },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <LandingMotion />
      <div className={styles.backdrop} aria-hidden="true" />

      <header className={styles.header} data-landing-header>
        <div className={styles.headerInner}>
          <Link href="/landing" className={styles.logo} aria-label="Bripick 랜딩으로 이동">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bripick_header_logo_light.svg" alt="Bripick" className={styles.logoOnLight} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bripick_header_logo_dark.svg" alt="" className={styles.logoOnDark} />
          </Link>
          <nav className={styles.nav} aria-label="랜딩 섹션">
            <a href="#features">기능</a>
            <a href="#how">사용 방법</a>
            <a href="#faq">자주 묻는 질문</a>
          </nav>
          <div className={styles.headerActions}>
            <Link href={LOGIN_HREF} className={styles.ghostLink}>
              로그인
            </Link>
            <Link href={START_HREF} className={styles.pillButton}>
              시작하기
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={`${styles.badge} ${styles.reveal}`} data-reveal>
              <span className={styles.badgeDot} />
              개발자를 위한 블록형 이력서 빌더
            </p>
            <h1 className={`${styles.heroTitle} ${styles.reveal}`} data-reveal>
              끝까지 읽히는
              <br />
              <span className={styles.gradientText}>이력서를 쌓다.</span>
            </h1>
            <p className={`${styles.heroLead} ${styles.reveal}`} data-reveal>
              경력, 프로젝트, 기술 스택을 블록처럼 쌓고 옮기세요. 디자인은 Bripick이 맞춰 드릴게요.
              PDF 저장부터 공개 링크, ATS 검사까지 한 화면에서 끝납니다.
            </p>
            <div className={`${styles.heroActions} ${styles.reveal}`} data-reveal>
              <Link href={START_HREF} className={styles.primaryButton}>
                지금 바로 만들기
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href={LOGIN_HREF} className={styles.secondaryButton}>
                <LogIn size={17} aria-hidden="true" />
                로그인하고 이어 쓰기
              </Link>
            </div>
            <ul className={`${styles.heroPoints} ${styles.reveal}`} data-reveal>
              <li>
                <Check size={15} aria-hidden="true" /> 가입 없이 시작
              </li>
              <li>
                <Check size={15} aria-hidden="true" /> 템플릿 3종
              </li>
              <li>
                <Check size={15} aria-hidden="true" /> PDF · 링크 공유
              </li>
            </ul>
          </div>

          <div className={`${styles.heroVisual} ${styles.reveal}`} data-reveal>
            <TemplatePreview />
          </div>
        </section>

        {/* Block marquee */}
        <section className={styles.marquee} aria-label="사용할 수 있는 블록">
          <div className={styles.marqueeTrack}>
            {[0, 1].map((loop) => (
              <ul key={loop} className={styles.marqueeGroup} aria-hidden={loop === 1}>
                {BLOCK_NAMES.map((name) => (
                  <li key={name}>
                    <GripVertical size={14} aria-hidden="true" />
                    {name}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className={styles.section}>
          <div className={`${styles.sectionHead} ${styles.reveal}`} data-reveal>
            <p className={styles.eyebrow}>Features</p>
            <h2 className={styles.sectionTitle}>
              이력서 작성에 필요한 건
              <br />
              전부 여기 있어요.
            </h2>
          </div>

          <div className={styles.bento}>
            <article className={`${styles.card} ${styles.cardWide} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <GripVertical size={18} aria-hidden="true" />
                </span>
                <h3>블록 단위 편집</h3>
                <p>
                  섹션을 통째로 끌어 순서를 바꾸고, 필요 없는 블록은 빼세요. 지원하는 회사마다 구성을 바꾸는 데
                  몇 초면 충분합니다.
                </p>
              </div>
              <div className={styles.blockStack} aria-hidden="true">
                <div className={styles.stackItem}>
                  <GripVertical size={14} /> 프로필
                </div>
                <div className={`${styles.stackItem} ${styles.stackItemLifted}`}>
                  <GripVertical size={14} /> 프로젝트
                  <span className={styles.stackHint}>드래그 중</span>
                </div>
                <div className={styles.stackItem}>
                  <GripVertical size={14} /> 경력
                </div>
                <div className={`${styles.stackItem} ${styles.stackItemGhost}`}>+ 블록 추가</div>
              </div>
            </article>

            <article className={`${styles.card} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <ShieldCheck size={18} aria-hidden="true" />
                </span>
                <h3>ATS 검사</h3>
                <p>채용 시스템이 놓치기 쉬운 항목을 제출 전에 점검해요.</p>
              </div>
              <div className={styles.atsBox} aria-label="ATS 검사 예시 결과">
                <div className={styles.atsScore}>
                  <svg viewBox="0 0 36 36" aria-hidden="true">
                    <circle cx="18" cy="18" r="15.5" className={styles.atsTrack} />
                    <circle cx="18" cy="18" r="15.5" className={styles.atsValue} pathLength={100} />
                  </svg>
                  <strong>80</strong>
                </div>
                <ul className={styles.atsList}>
                  {ATS_CHECKS.map((item) => (
                    <li key={item.label} data-done={item.done}>
                      <span>{item.done ? <Check size={11} aria-hidden="true" /> : null}</span>
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className={`${styles.card} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <Link2 size={18} aria-hidden="true" />
                </span>
                <h3>링크 하나로 공유</h3>
                <p>게시 버튼을 누르면 공개 링크가 생겨요. 첨부 파일 대신 URL을 보내세요.</p>
              </div>
              <div className={styles.urlPill} aria-hidden="true">
                <span className={styles.urlLock} />
                <span className={styles.urlText}>
                  bripick.coreluma.kr/r/<b>your-name</b>
                </span>
                <span className={styles.urlCopy}>복사됨</span>
              </div>
            </article>

            <article className={`${styles.card} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <FileDown size={18} aria-hidden="true" />
                </span>
                <h3>보이는 그대로 PDF</h3>
                <p>페이지 나누기와 블록 묶어두기로 인쇄 레이아웃까지 직접 다듬을 수 있어요.</p>
              </div>
              <div className={styles.pages} aria-hidden="true">
                <span />
                <span />
                <span className={styles.pagesBreak}>페이지 나누기</span>
              </div>
            </article>

            <article className={`${styles.card} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <LayoutTemplate size={18} aria-hidden="true" />
                </span>
                <h3>템플릿 3종</h3>
                <p>모던, 미니멀, 크리에이티브. 내용은 그대로 두고 분위기만 바꾸세요.</p>
              </div>
              <div className={styles.swatches} aria-hidden="true">
                <span data-kind="modern">Modern</span>
                <span data-kind="minimal">Minimal</span>
                <span data-kind="creative">Creative</span>
              </div>
            </article>

            <article className={`${styles.card} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <CloudUpload size={18} aria-hidden="true" />
                </span>
                <h3>어디서든 이어 쓰기</h3>
                <p>로그인하면 비로그인으로 쓰던 이력서도 계정으로 옮겨져요. 다른 기기에서 그대로 이어 쓰세요.</p>
              </div>
              <div className={styles.syncDemo} aria-hidden="true">
                <span>임시 초안</span>
                <i />
                <span className={styles.syncAccount}>
                  <UserRound size={13} /> 내 계정
                </span>
              </div>
            </article>

            <article className={`${styles.card} ${styles.cardWide} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <Type size={18} aria-hidden="true" />
                </span>
                <h3>문서처럼 편한 입력</h3>
                <p>텍스트를 선택하면 굵게, 링크, 목록 도구가 바로 떠요. 서식 때문에 흐름이 끊기지 않습니다.</p>
              </div>
              <div className={styles.toolbarDemo} aria-hidden="true">
                <div className={styles.toolbar}>
                  <b>B</b>
                  <i>I</i>
                  <u>U</u>
                  <span>
                    <Link2 size={12} />
                  </span>
                </div>
                <p>
                  결제 페이지 <mark>LCP 62% 개선</mark>
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className={styles.section}>
          <div className={`${styles.sectionHead} ${styles.reveal}`} data-reveal>
            <p className={styles.eyebrow}>How it works</p>
            <h2 className={styles.sectionTitle}>세 단계면 제출 준비 끝.</h2>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((step) => (
              <li key={step.no} className={`${styles.step} ${styles.reveal}`} data-reveal>
                <span className={styles.stepNo}>{step.no}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section id="faq" className={`${styles.section} ${styles.faqSection}`}>
          <div className={`${styles.sectionHead} ${styles.reveal}`} data-reveal>
            <p className={styles.eyebrow}>FAQ</p>
            <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
          </div>
          <div className={styles.faqList}>
            {FAQS.map((item) => (
              <details key={item.q} className={`${styles.faqItem} ${styles.reveal}`} data-reveal>
                <summary>
                  {item.q}
                  <span className={styles.faqIcon} aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className={styles.section}>
          <div className={`${styles.cta} ${styles.reveal}`} data-reveal>
            <h2>
              다음 지원서는
              <br />
              Bripick으로.
            </h2>
            <p>쓰던 이력서를 블록으로 옮겨 보세요. 가입 없이 바로 시작할 수 있어요.</p>
            <Link href={START_HREF} className={styles.ctaButton}>
              무료로 시작하기
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Bripick</span>
        <nav aria-label="바로가기">
          <Link href={START_HREF}>편집기</Link>
          <Link href={LOGIN_HREF}>로그인</Link>
        </nav>
      </footer>
    </div>
  );
}
