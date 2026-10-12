import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Check,
  ChevronDown,
  Download,
  FileCheck2,
  FileDown,
  Globe2,
  Link2,
  ListChecks,
  Plus,
  Redo2,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  Undo2,
} from "lucide-react";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import ScrollReveal from "@/components/landing/ScrollReveal";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: ["브리픽", "bripick.coreluma.kr"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "ko-KR",
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  alternateName: "브리픽",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  browserRequirements: "JavaScript를 지원하는 최신 웹 브라우저",
  inLanguage: "ko-KR",
  offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
  featureList: ["블록형 이력서 편집", "PDF 저장", "공개 링크 공유", "ATS 이력서 진단"],
};

const features = [
  { icon: Blocks, label: "블록형 편집", title: "내용에만 집중하는 편집", description: "경력, 프로젝트, 기술을 필요한 순서대로 배치하고 미리보기에서 결과를 바로 확인하세요." },
  { icon: FileDown, label: "PDF 저장", title: "완성된 모습 그대로 제출", description: "페이지 구성을 확인하면서 이력서를 다듬고, 제출 가능한 PDF로 바로 저장할 수 있어요." },
  { icon: Link2, label: "링크 공유", title: "최신 이력서를 하나의 링크로", description: "수정할 때마다 파일을 다시 보낼 필요 없이 공개 링크로 최신 이력서를 공유하세요." },
  { icon: FileCheck2, label: "ATS 검사", title: "제출 전에 한 번 더 점검", description: "이력서의 기본 구성과 읽기 어려운 부분을 확인하고 지원 전에 보완할 수 있어요." },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <ScrollReveal />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd).replace(/</g, "\\u003c") }} />

      <header className="landing-header">
        <div className="landing-shell landing-header__inner">
          <Link href="/" className="landing-brand" aria-label="Bripick 홈">
            <Image src="/bripick_header_logo_dark.svg" width={124} height={35} alt="Bripick" priority />
          </Link>
          <nav className="landing-nav" aria-label="주요 메뉴"><a href="#features">기능</a><a href="#workflow">사용 방법</a></nav>
          <div className="landing-header__actions">
            <Link href="/login?next=%2Feditor" className="landing-link-button">로그인</Link>
            <Link href="/editor" className="landing-primary-button landing-primary-button--small">이력서 만들기 <ArrowRight size={16} /></Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__glow landing-hero__glow--left" /><div className="landing-hero__glow landing-hero__glow--right" />
        <div className="landing-shell landing-hero__content">
          <div className="landing-hero__copy" data-reveal>
            <div className="landing-eyebrow landing-hero__intro" style={{ "--intro-delay": "90ms" } as CSSProperties}><Sparkles size={14} /> 개발자를 위한 이력서 빌더</div>
            <h1 className="landing-hero__intro" style={{ "--intro-delay": "180ms" } as CSSProperties}>개발자의 경험이<br /><span>제대로 읽히는 이력서</span></h1>
            <p className="landing-hero__intro" style={{ "--intro-delay": "270ms" } as CSSProperties}>경력과 프로젝트를 블록으로 정리하고 결과를 바로 확인하세요.<br className="landing-desktop-break" /> 완성한 이력서는 PDF로 저장하거나 링크로 공유할 수 있습니다.</p>
            <div className="landing-hero__actions landing-hero__intro" style={{ "--intro-delay": "360ms" } as CSSProperties}>
              <Link href="/editor" className="landing-primary-button">무료로 이력서 만들기 <ArrowRight size={18} /></Link>
              <a href="#workflow" className="landing-secondary-button">어떻게 작동하나요?</a>
            </div>
            <div className="landing-hero__trust landing-hero__intro" style={{ "--intro-delay": "450ms" } as CSSProperties}>
              <span><Check size={14} /> 비로그인으로 바로 시작</span><span><Check size={14} /> 브라우저 자동 저장</span><span><Check size={14} /> 필요할 때 계정 연동</span>
            </div>
          </div>

          <div className="landing-product" data-reveal="scale">
            <div className="landing-demo__header">
              <Image src="/bripick_header_logo_dark.svg" width={92} height={26} alt="" />
              <div className="landing-demo__document">샘플 이력서 <ChevronDown size={13} /></div>
              <div className="landing-demo__history"><Undo2 size={15} /><Redo2 size={15} /></div>
              <div className="landing-demo__add"><Plus size={15} /> 블록 추가 <ChevronDown size={13} /></div>
              <div className="landing-demo__actions"><span><Globe2 size={14} /> 게시</span><strong><Download size={14} /> PDF 저장</strong><i>•••</i></div>
            </div>
            <div className="landing-demo__workspace">
              <div className="landing-demo__stage">
                <div className="landing-demo__page-info"><span>▧ A4&nbsp; | &nbsp;Page 1</span><small>210 × 297 mm</small></div>
                <div className="landing-demo__resume">
                  <Image
                    src="/landing-resume-preview.png"
                    width={1389}
                    height={1003}
                    sizes="(max-width: 680px) calc(100vw - 60px), 760px"
                    alt="Bripick으로 제작한 개발자 이력서 예시"
                  />
                </div>
              </div>
              <aside className="landing-demo__inspector">
                <div className="landing-demo__inspector-title"><SlidersHorizontal size={15} /> 문서 전역 설정 <button>기본값 복원</button></div>
                <div className="landing-demo__tip"><Sparkles size={14} /> 캔버스의 빈 영역을 클릭하면 언제든 전역 설정으로 돌아올 수 있어요.</div>
                <label>국문/영문 서체</label><div className="landing-demo__select">Pretendard (기본 / 깔끔한 고딕)<ChevronDown size={13} /></div>
                <div className="landing-demo__setting-row">글자 크기 <ChevronDown size={13} /></div>
                <label>테마 포인트 컬러</label><div className="landing-demo__colors"><i /><i /><i /><i /><i /><i /></div>
                <label>용지 안쪽 여백 <small>36px</small></label><div className="landing-demo__range"><i /></div>
                <label>블록 사이 간격 <small>18px</small></label><div className="landing-demo__range landing-demo__range--wide"><i /></div>
                <label>캔버스 가로 너비 <small>800px</small></label><div className="landing-demo__range landing-demo__range--last"><i /></div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section landing-features"><div className="landing-shell">
        <div className="landing-section__heading" data-reveal><span>필요한 기능만, 한곳에</span><h2>작성부터 제출까지<br />흐름이 끊기지 않도록</h2><p>문서 도구와 디자인 도구를 오가지 않아도 됩니다.</p></div>
        <div className="landing-feature-grid">{features.map(({ icon: Icon, label, title, description }) => <article key={label} className="landing-feature-card" data-reveal><div className="landing-feature-card__icon"><Icon size={21} /></div><span>{label}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </div></section>

      <section id="workflow" className="landing-section landing-workflow"><div className="landing-shell landing-workflow__grid">
        <div className="landing-section__heading landing-section__heading--left" data-reveal="left"><span>간단한 작업 흐름</span><h2>빈 문서 앞에서<br />막히지 않도록</h2><p>준비된 구조에서 내용을 채우고, 필요한 만큼 다듬은 뒤 바로 제출하세요.</p><Link href="/editor" className="landing-text-link">편집기에서 직접 확인하기 <ArrowRight size={16} /></Link></div>
        <ol className="landing-steps"><li data-reveal="right"><b>01</b><div><h3>블록을 선택하세요</h3><p>프로필, 경력, 프로젝트 등 필요한 항목을 원하는 순서로 구성합니다.</p></div></li><li data-reveal="right"><b>02</b><div><h3>내용을 채우고 바로 확인하세요</h3><p>오른쪽에서 편집한 내용이 실제 이력서 모습에 즉시 반영됩니다.</p></div></li><li data-reveal="right"><b>03</b><div><h3>PDF 또는 링크로 제출하세요</h3><p>지원 방식에 맞춰 파일로 저장하거나 공개 주소를 전달합니다.</p></div></li></ol>
      </div></section>

      <section className="landing-section landing-storage"><div className="landing-shell" data-reveal>
        <div className="landing-storage__heading"><span>저장과 계정 연결</span><h2>먼저 써보고,<br />필요할 때 로그인하세요.</h2><p>작성 중인 이력서는 브라우저에 자동 저장됩니다. 로그인하면 그대로 계정에 가져올 수 있어요.</p></div>
        <div className="landing-storage__options">
          <article><div><ListChecks size={19} /><span>01</span></div><h3>로그인 없이 작성</h3><p>회원가입을 기다릴 필요 없이 바로 시작하고, 현재 브라우저에서 계속 작업합니다.</p></article>
          <article><div><ShieldCheck size={19} /><span>02</span></div><h3>필요할 때 계정 연결</h3><p>작성하던 이력서를 계정으로 가져와 다른 기기에서도 이어서 관리합니다.</p></article>
        </div>
      </div></section>

      <section className="landing-cta"><div className="landing-shell landing-cta__inner" data-reveal><h2>지금, 이력서 작성을 시작하세요.</h2><p>로그인 없이 바로 사용할 수 있고, 작성한 내용은 브라우저에 자동 저장됩니다.</p><Link href="/editor" className="landing-primary-button">무료로 시작하기 <ArrowRight size={18} /></Link></div></section>

      <footer className="landing-footer"><div className="landing-shell landing-footer__inner"><Image src="/bripick_header_logo_dark.svg" width={106} height={30} alt="Bripick" /><p>경험을 더 명확하게 보여주는 개발자 이력서 빌더</p><div><Link href="/editor">편집기</Link><Link href="/login?next=%2Feditor">로그인</Link></div></div></footer>
    </main>
  );
}
