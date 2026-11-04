// 이력서 목업 뒤 배경: 파란 번짐 이미지. 순수 장식이라 스크린리더에서 숨긴다.
export default function HeroSpace({ className, hazeClassName }: {
  className: string;
  hazeClassName: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      <div className={hazeClassName} />
    </div>
  );
}
