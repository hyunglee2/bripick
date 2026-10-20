import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  Globe2,
  Link2,
  ListChecks,
  MousePointer2,
  Plus,
  Redo2,
  Rows3,
  Send,
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

const differences = [
  {
    icon: MousePointer2,
    label: "작성",
    title: "문서와 설정을 오가지 않고",
    description: "미리보기에서 텍스트를 바로 고치고, 선택한 블록의 세부 설정은 작업 패널에서 이어서 편집하세요.",
  },
  {
    icon: Rows3,
    label: "구성",
    title: "페이지가 늘어나도 자연스럽게",
    description: "A4 경계에 맞춰 내용이 이어집니다. 필요한 항목만 새 페이지에서 시작하도록 세부적으로 조정할 수 있어요.",
  },
  {
    icon: Send,
    label: "제출",
    title: "완성한 모습 그대로 전달",
    description: "PDF 파일로 저장하거나 공개 링크로 공유해 지원 방식에 맞는 결과물을 바로 준비하세요.",
  },
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
          <nav className="landing-nav" aria-label="주요 메뉴"><a href="#difference">특징</a><a href="#features">기능</a><a href="#workflow">사용 방법</a></nav>
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
            <div className="landing-eyebrow landing-hero__intro" style={{ "--intro-delay": "90ms" } as CSSProperties}><Sparkles size={14} /> 개발자를 위한 이력서 편집기</div>
            <h1 className="landing-hero__intro" style={{ "--intro-delay": "180ms" } as CSSProperties}>개발 경험을 쓰는 순간,<br /><span>이력서가 완성됩니다</span></h1>
            <p className="landing-hero__intro" style={{ "--intro-delay": "270ms" } as CSSProperties}>복잡한 서식 대신 경력과 프로젝트에 집중하세요.<br className="landing-desktop-break" /> 미리보기에서 바로 고치고, A4 페이지 그대로 PDF 또는 링크로 제출할 수 있어요.</p>
            <div className="landing-hero__actions landing-hero__intro" style={{ "--intro-delay": "360ms" } as CSSProperties}>
              <Link href="/editor" className="landing-primary-button">무료로 이력서 만들기 <ArrowRight size={18} /></Link>
              <a href="#workflow" className="landing-secondary-button">어떻게 작동하나요?</a>
            </div>
            <div className="landing-hero__trust landing-hero__intro" style={{ "--intro-delay": "450ms" } as CSSProperties}>
              <span><Check size={14} /> 비로그인으로 바로 시작</span><span><Check size={14} /> 브라우저 자동 저장</span><span><Check size={14} /> 필요할 때 계정 연동</span>
            </div>
          </div>

          <div className="landing-product" data-reveal="scale">
            <div className="landing-product__caption"><span><i /> 실제 Bripick 편집 화면</span><small>작성과 미리보기를 한 화면에서</small></div>
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
          <div className="landing-product__summary" data-reveal>
            <span><Check size={15} /> 미리보기에서 바로 편집</span>
            <span><Check size={15} /> A4 페이지 자동 구성</span>
            <span><Check size={15} /> PDF 저장과 링크 공유</span>
          </div>
        </div>
      </section>

      <section id="difference" className="landing-section landing-difference"><div className="landing-shell landing-difference__grid">
        <div className="landing-section__heading landing-section__heading--left landing-difference__heading" data-reveal="left">
          <span>이력서에 맞춘 편집 경험</span>
          <h2>서식을 만지는 시간보다 경험을 설명하는 시간에 집중하세요.</h2>
          <p>일반 문서 편집기의 자유로움은 유지하고, 개발자 이력서에 필요한 구조와 제출 흐름은 Bripick이 정리합니다.</p>
        </div>
        <div className="landing-difference__list">
          {differences.map(({ icon: Icon, label, title, description }, index) => (
            <article key={label} data-reveal="right">
              <div className="landing-difference__number">0{index + 1}</div>
              <div className="landing-difference__icon"><Icon size={20} /></div>
              <div><span>{label}</span><h3>{title}</h3><p>{description}</p></div>
            </article>
          ))}
        </div>
      </div></section>

      <section className="landing-showcase" aria-label="Bripick 주요 편집 기능">
        <article className="landing-showcase__row landing-shell">
          <div className="landing-showcase__visual landing-showcase__visual--edit" data-reveal="left" aria-hidden="true">
            <div className="landing-mock-window">
              <div className="landing-mock-window__bar"><span /><span /><span /><small>Bripick Editor</small></div>
              <div className="landing-edit-mock">
                <div className="landing-edit-mock__page">
                  <div className="landing-edit-mock__profile"><i /><div><small>복잡한 문제를 이해하기 쉬운 화면으로 풀어내는</small><strong>Frontend Engineer <em>김브릭</em>입니다.</strong></div></div>
                  <h4>Work Experience</h4>
                  <div className="landing-edit-mock__company"><b>Bripick</b><span>Frontend Engineer</span></div>
                  <p>사용자 흐름과 서비스 목표를 연결해 아이디어를 실제 기능으로 구현합니다.</p>
                  <div className="landing-edit-mock__selected">미리보기에서 텍스트를 선택하고 바로 수정할 수 있어요.</div>
                </div>
                <div className="landing-edit-mock__toolbar"><b>B</b><i>I</i><u>U</u><span>A</span><span>•••</span></div>
                <div className="landing-edit-mock__cursor"><MousePointer2 size={21} /><span>바로 편집</span></div>
              </div>
            </div>
          </div>
          <div className="landing-showcase__copy" data-reveal="right"><span>DIRECT EDITING</span><h2>보이는 문서에서<br />바로 고치세요.</h2><p>텍스트는 미리보기에서 직접 수정하고, 블록을 선택하면 세부 설정이 작업 패널에 열립니다. 결과를 상상할 필요 없이 완성되는 모습을 보며 작성하세요.</p><Link href="/editor" className="landing-text-link">직접 편집해 보기 <ArrowRight size={16} /></Link></div>
        </article>

        <article className="landing-showcase__row landing-showcase__row--reverse landing-shell">
          <div className="landing-showcase__visual landing-showcase__visual--pages" data-reveal="right" aria-hidden="true">
            <div className="landing-pages-mock">
              <div className="landing-pages-mock__page landing-pages-mock__page--back"><span>A4 · Page 1</span><i /><i /><i /><strong>Work Experience</strong><i /><i /></div>
              <div className="landing-pages-mock__page landing-pages-mock__page--front"><span>A4 · Page 2</span><i /><i /><strong>Project Experience</strong><i /><i /><i /></div>
              <div className="landing-pages-mock__flow"><Rows3 size={18} /> 내용이 다음 페이지로 자연스럽게 이어져요</div>
            </div>
          </div>
          <div className="landing-showcase__copy" data-reveal="left"><span>SMART PAGINATION</span><h2>페이지가 늘어나도<br />흐름은 그대로.</h2><p>내용은 A4 여백 안에서 자연스럽게 다음 페이지로 이어집니다. 회사나 프로젝트처럼 꼭 구분하고 싶은 항목만 새 페이지에서 시작할 수 있어요.</p></div>
        </article>

        <article className="landing-showcase__row landing-shell">
          <div className="landing-showcase__visual landing-showcase__visual--share" data-reveal="left" aria-hidden="true">
            <div className="landing-share-mock">
              <div className="landing-share-mock__resume"><div><FileText size={22} /><span><b>김브릭 이력서</b><small>최종 편집 방금 전</small></span></div><div className="landing-share-mock__preview"><Image src="/landing-resume-preview.png" width={1389} height={1003} alt="" /></div></div>
              <div className="landing-share-mock__actions"><div><span><Download size={18} /></span><b>PDF로 저장</b><small>지원서에 바로 첨부하세요</small></div><div><span><Link2 size={18} /></span><b>링크로 공유</b><small>수정해도 같은 주소로</small></div></div>
              <div className="landing-share-mock__link"><Eye size={15} /><span>bripick.coreluma.kr/r/kimbrick</span><Copy size={15} /></div>
            </div>
          </div>
          <div className="landing-showcase__copy" data-reveal="right"><span>READY TO SHARE</span><h2>완성한 이력서를<br />원하는 방식으로.</h2><p>정해진 양식이 필요할 때는 PDF로, 최신 내용을 계속 보여주고 싶을 때는 공개 링크로 공유하세요. 작성부터 제출까지 한곳에서 끝낼 수 있습니다.</p></div>
        </article>
      </section>

      <section id="features" className="landing-section landing-features"><div className="landing-shell">
        <div className="landing-section__heading" data-reveal><span>필요한 기능만, 한곳에</span><h2>작성부터 제출까지<br />흐름이 끊기지 않도록</h2><p>문서 도구와 디자인 도구를 오가지 않아도 됩니다.</p></div>
        <div className="landing-feature-grid">{features.map(({ icon: Icon, label, title, description }) => <article key={label} className="landing-feature-card" data-reveal><div className="landing-feature-card__icon"><Icon size={21} /></div><span>{label}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </div></section>

      <section id="workflow" className="landing-section landing-workflow"><div className="landing-shell landing-workflow__grid">
        <div className="landing-section__heading landing-section__heading--left" data-reveal="left"><span>간단한 작업 흐름</span><h2>빈 문서 앞에서<br />막히지 않도록</h2><p>준비된 구조에서 내용을 채우고, 필요한 만큼 다듬은 뒤 바로 제출하세요.</p><Link href="/editor" className="landing-text-link">편집기에서 직접 확인하기 <ArrowRight size={16} /></Link></div>
        <ol className="landing-steps"><li data-reveal="right"><b>01</b><div><h3>필요한 블록을 선택하세요</h3><p>프로필, 경력, 프로젝트 등 필요한 항목을 원하는 순서로 구성합니다.</p></div></li><li data-reveal="right"><b>02</b><div><h3>미리보기에서 바로 다듬으세요</h3><p>텍스트는 문서에서 직접 수정하고, 선택한 영역의 세부 설정은 작업 패널에서 조정합니다.</p></div></li><li data-reveal="right"><b>03</b><div><h3>PDF 또는 링크로 제출하세요</h3><p>지원 방식에 맞춰 파일로 저장하거나 공개 주소를 전달합니다.</p></div></li></ol>
      </div></section>

      <section className="landing-section landing-storage"><div className="landing-shell" data-reveal>
        <div className="landing-storage__heading"><span>로그인해서 이어서 쓰기</span><h2>어디서든<br />이어서 작성하세요.</h2><p>로그인하면 작성한 이력서가 계정에 저장돼요. 다른 기기에서도 그대로 열어보고 수정할 수 있습니다.</p></div>
        <div className="landing-storage__options">
          <article><div><ListChecks size={19} /><span>01</span></div><h3>이력서를 계정에 저장</h3><p>만든 이력서를 계정에서 확인하고 필요할 때 바로 수정할 수 있어요.</p></article>
          <article><div><ShieldCheck size={19} /><span>02</span></div><h3>다른 기기에서 계속 작성</h3><p>쓰던 기기가 아니어도 로그인하면 마지막으로 작성한 내용을 이어서 쓸 수 있어요.</p></article>
        </div>
      </div></section>

      <section className="landing-cta"><div className="landing-shell landing-cta__inner" data-reveal><h2>당신의 경험이,<br />더 선명하게 읽히도록.</h2><p>복잡한 서식은 덜어내고, 지금까지의 경험을 설득력 있는 이력서로 완성해 보세요.</p><Link href="/editor" className="landing-primary-button">무료로 시작하기 <ArrowRight size={18} /></Link></div></section>

      <footer className="landing-footer"><div className="landing-shell landing-footer__inner"><Image src="/bripick_header_logo_dark.svg" width={106} height={30} alt="Bripick" /><p>경험을 더 명확하게 보여주는 개발자 이력서 빌더</p><div><Link href="/editor">편집기</Link><Link href="/login?next=%2Feditor">로그인</Link></div></div></footer>
    </main>
  );
}
