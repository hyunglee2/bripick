import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CloudUpload,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  Link2,
  LogIn,
  Type,
  UserRound,
  X,
} from "lucide-react";
import LandingMotion from "./LandingMotion";
import TemplatePreview from "./TemplatePreview";
import styles from "./landing.module.css";
import { OPEN_GRAPH_IMAGE, SITE_NAME } from "@/lib/site";

const LANDING_TITLE = "개발자를 위한 블록형 이력서 빌더";
const LANDING_DESCRIPTION =
  "경력, 프로젝트, 기술 스택을 블록처럼 쌓아 이력서를 완성하세요. Bripick의 템플릿으로 경험을 더 돋보이게 정리하고, 완성한 이력서는 PDF나 링크로 바로 공유할 수 있어요.";

export const metadata: Metadata = {
  title: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `$${SITE_NAME} | {LANDING_TITLE}`,
    description: LANDING_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [OPEN_GRAPH_IMAGE],
  },
  twitter: {
    title: `$${SITE_NAME} | {LANDING_TITLE}`,
    description: LANDING_DESCRIPTION,
    images: [OPEN_GRAPH_IMAGE.url],
  },
};

const START_HREF = "/editor";
const LOGIN_HREF = "/login?next=%2Feditor";

const BLOCK_NAMES = ["프로필", "경력", "프로젝트", "기술 스택", "학력", "자격증", "자유 텍스트", "페이지 나누기"];

const STEPS = [
  {
    no: "01",
    title: "필요한 블록 추가",
    body: "프로필, 경력, 프로젝트 중 필요한 블록을 추가하세요. 예시가 미리 채워져 있어서 어디에 뭘 쓸지 바로 보여요.",
  },
  {
    no: "02",
    title: "내 경력 채워넣기",
    body: "내용을 입력하면 이력서에 바로 반영됩니다. 분량과 페이지가 나뉘는 위치도 함께 확인할 수 있어요.",
  },
  {
    no: "03",
    title: "PDF 저장 또는 링크 공유",
    body: "화면에 보이는 그대로 PDF로 저장하거나 링크로 내 이력서를 공유하세요.",
  },
];

const FAQS = [
  {
    q: "가입해야 쓸 수 있나요?",
    a: "아니요. 가입 없이 바로 작성을 시작할 수 있어요. 나중에 Google이나 카카오로 로그인하면 작성하던 이력서를 계정으로 그대로 불러올 수 있습니다. 계정간 이동은 JSON 백업 기능을 활용해보세요.",
  },
  {
    q: "PDF로 저장하면 레이아웃이 깨지지 않나요?",
    a: "화면에서 보이는 페이지 그대로 저장됩니다. 페이지 나누기 블록과 블록 묶어두기 옵션으로 원하는 위치에서 페이지를 넘길 수 있어요.",
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
          <Link href="/" className={styles.logo} aria-label="Bripick 홈으로 이동">
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
            <p className={`${styles.badge} ${styles.intro}`}>
              <span className={styles.badgeDot} />
              개발자를 위한 블록형 이력서 빌더
            </p>
            <h1 className={styles.heroTitle}>
              <span className={styles.titleLine}>
                <span>끝까지 읽히는</span>
              </span>
              <span className={styles.titleLine}>
                <span className={styles.gradientText}>이력서<span className="font-light">를 쌓다.</span></span>
              </span>
            </h1>
            <p className={`${styles.heroLead} ${styles.intro}`}>
              {/* 경력, 프로젝트, 기술 스택을 원하는 순서대로 쌓아보세요.<br /> */}
              Bripick의 템플릿으로 경험을 더 돋보이게 정리하고, 완성한 이력서는 PDF나 링크로 바로 공유할 수 있어요.
            </p>
            <div className={`${styles.heroActions} ${styles.intro}`}>
              <Link href={START_HREF} className={styles.primaryButton}>
                지금 바로 만들기
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href={LOGIN_HREF} className={styles.secondaryButton}>
                <LogIn size={17} aria-hidden="true" />
                로그인하고 이어 쓰기
              </Link>
            </div>
            <ul className={`${styles.heroPoints} ${styles.intro}`}>
              <li>
                <Check size={15} aria-hidden="true" /> 가입 없이 시작
              </li>
              <li>
                <Check size={15} aria-hidden="true" /> 이력서 링크 공유
              </li>
              <li>
                <Check size={15} aria-hidden="true" /> 화면 그대로 PDF로 저장
              </li>
            </ul>
          </div>

          <div className={styles.heroVisual}>
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

        {/* Why: A4 위에서 쓰는 편집기 */}
        <section id="why" className={styles.section}>
          <div className={`${styles.sectionHead} ${styles.reveal}`} data-reveal>
            <h2 className={styles.sectionTitle}>
              내 이력서 분량,
              <br />
              <span className={styles.gradientText}>쓰면서 바로</span> 확인하세요.
            </h2>
            <p className={styles.sectionLead}>
              PDF로 저장했더니 생각보다 페이지가 늘어나서 당황한 적, 있으시죠?<br />
              Bripick에서는 항목 하나가 얼마나 차지하는지, 어디서 다음 장으로 넘어가는지
              작성하는 동시에 확인하고, 보이는 그대로 PDF화 할 수 있어요.
            </p>
          </div>

          <div className={styles.compare}>
            <figure className={`${styles.compareCard} ${styles.reveal}`} data-kind="before" data-reveal>
              <figcaption className={styles.compareLabel}>다른 곳에서 작성하고 PDF로 저장하면</figcaption>
              <div className={styles.sheets} aria-hidden="true">
                <div className={styles.sheet}>
                  <span className={styles.sheetHead} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} data-short />
                  <span className={styles.sheetHead} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} data-short />
                  <span className={styles.sheetWaste}>빈 공간</span>
                </div>
                <div className={styles.sheet}>
                  <span className={styles.sheetCut}>
                    <span className={styles.sheetLine} />
                    <span className={styles.sheetLine} data-short />
                  </span>
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} data-short />
                  <span className={styles.sheetWaste}>빈 공간</span>
                </div>
              </div>
              <ul className={styles.compareList}>
                <li>
                  <X size={14} aria-hidden="true" /> 저장해 보기 전엔 몇 장이 될지 몰라요
                </li>
                <li>
                  <X size={14} aria-hidden="true" /> 항목이 애매한 곳에서 다음 장으로 잘려요
                </li>
                <li>
                  <X size={14} aria-hidden="true" /> 쓸모없는 여백 때문에 분량만 늘어나요
                </li>
              </ul>
            </figure>

            <figure className={`${styles.compareCard} ${styles.reveal}`} data-kind="after" data-reveal>
              <figcaption className={styles.compareLabel}>Bripick에서 작성하는 이력서는</figcaption>
              <div className={styles.sheets} aria-hidden="true">
                <div className={styles.sheet}>
                  <span className={styles.sheetHead} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} data-short />
                  <span className={styles.sheetHead} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} data-short />
                  <span className={styles.sheetHead} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} data-short />
                  <span className={styles.sheetHead} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} data-short />
                  <span className={styles.sheetPage}>1 / 2</span>
                </div>
                <div className={styles.sheet}>
                  <span className={styles.sheetHead} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} data-short />
                  <span className={styles.sheetHead} />
                  <span className={styles.sheetLine} />
                  <span className={styles.sheetLine} data-short />
                  <span className={styles.sheetPage}>2 / 2</span>
                </div>
              </div>
              <ul className={styles.compareList}>
                <li>
                  <Check size={14} aria-hidden="true" /> 쓰는 동안 A4 기준으로 페이지가 나뉘어요
                </li>
                <li>
                  <Check size={14} aria-hidden="true" /> 어디서 넘어갈지 보고, 원하면 항목을 통째로 묶어 둬요
                </li>
                <li>
                  <Check size={14} aria-hidden="true" /> 화면의 페이지가 그대로 PDF가 돼요
                </li>
              </ul>
            </figure>
          </div>
        </section>

        {/* Features */}
        <section id="features" className={styles.section}>
          <div className={`${styles.sectionHead} ${styles.reveal}`} data-reveal>
            <p className={styles.eyebrow}>Features</p>
            <h2 className={styles.sectionTitle}>
              이력서 작성에 필요한 건
              <br />
              <span className={styles.gradientText}>Bripick</span>이 모두 준비했어요
            </h2>
          </div>

          <div className={styles.bento}>
            <article className={`${styles.card} ${styles.cardWide} ${styles.cardFull} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <GripVertical size={18} aria-hidden="true" />
                </span>
                <h3>블록 단위 편집</h3>
                <p>
                  섹션을 통째로 끌어 순서를 바꾸고, 필요 없는 블록은 빼거나 숨김처리 하세요. 지원하는 회사마다 구성을 바꾸는 데
                  몇 초면 충분해요.
                </p>
              </div>
              <div className={styles.blockStack} aria-hidden="true">
                <div className={styles.stackItem}>
                  <GripVertical size={14} /> 프로필
                </div>
                <div className={`${styles.stackItem} ${styles.stackItemLifted}`}>
                  <GripVertical size={14} /> 프로젝트
                  <span className={styles.stackHint}>순서 변경하기</span>
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
                  <Link2 size={18} aria-hidden="true" />
                </span>
                <h3>링크 하나로 공유</h3>
                <p>게시 버튼을 눌러 내 이력서를 첨부 파일 대신 URL로 보낼 수 있어요.</p>
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
                  <EyeOff size={18} aria-hidden="true" />
                </span>
                <h3>지우지 말고 숨기기</h3>
                <p>지원하는 곳에 맞지 않는 경력이나 프로젝트는 숨겨 두세요. 숨긴 항목은 자리를 차지하지 않고, 필요할 때 다시 꺼내 쓰면 돼요.</p>
              </div>
              <div className={styles.hideList} aria-hidden="true">
                <div className={styles.hideRow}>
                  <span>쇼핑몰 결제 개선</span>
                  <Eye size={14} />
                </div>
                <div className={`${styles.hideRow} ${styles.hideRowHidden}`}>
                  <span>
                    사내 해커톤 <em>숨김</em>
                  </span>
                  <EyeOff size={14} />
                </div>
                <div className={styles.hideRow}>
                  <span>디자인 시스템 구축</span>
                  <Eye size={14} />
                </div>
              </div>
            </article>

            <article className={`${styles.card} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <LayoutTemplate size={18} aria-hidden="true" />
                </span>
                <h3>마음에 드는 템플릿 선택</h3>
                <p>내 이력서의 내용은 그대로 두고 스타일만 손쉽게 바꿔요.</p>
              </div>
              <div className={styles.swatches} aria-hidden="true">
                <div className={styles.swatch} data-kind="modern">
                  <div className={styles.swatchSheet}>
                    <i className={styles.swatchHead} />
                    <i className={styles.swatchBox} />
                    <i className={styles.swatchBox} />
                  </div>
                  <span>Modern</span>
                </div>
                <div className={styles.swatch} data-kind="minimal">
                  <div className={styles.swatchSheet}>
                    <i className={styles.swatchHead} />
                    <i className={styles.swatchRule} />
                    <i className={styles.swatchRule} />
                  </div>
                  <span>Minimal</span>
                </div>
              </div>
            </article>

            <article className={`${styles.card} ${styles.reveal}`} data-reveal>
              <div className={styles.cardText}>
                <span className={styles.cardIcon}>
                  <CloudUpload size={18} aria-hidden="true" />
                </span>
                <h3>어디서든 이어 쓰기</h3>
                <p>로그인하면 다른 기기에서도 이력서를 이어 쓸 수 있어요. 로그인 전에 작성한 이력서도 계정으로 간편하게 가져오세요.</p>
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
            <h2 className={styles.sectionTitle}>
              <span className={styles.gradientText}>세 단계</span>면 이력서 완성!
            </h2>
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
              <span className="block font-light">
                내 <span className="font-bold">다음 이력서</span>는
              </span>

              <span className="block">
                Bripick
                <span className="font-light">
                  으로 <span className="font-bold">간편</span>하게
                </span>
              </span>
            </h2>
            <p>당신의 경험을 설득력 있는 이력서로 바꿔보세요.</p>
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
