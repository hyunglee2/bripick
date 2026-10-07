import EditorHeader from "@/components/editor/EditorHeader";
import ResumeCanvas from "@/components/editor/ResumeCanvas";
import InspectorPanel from "@/components/editor/InspectorPanel";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

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
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  featureList: [
    "블록형 개발자 이력서 편집",
    "PDF 저장",
    "공개 링크 공유",
    "ATS 이력서 진단",
  ],
};

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <h1 className="sr-only">Bripick 개발자 이력서 빌더</h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <EditorHeader />
      <div className="flex flex-1 overflow-hidden">
        <ResumeCanvas />
        <InspectorPanel />
      </div>
    </div>
  );
}
