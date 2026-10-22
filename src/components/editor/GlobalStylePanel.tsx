"use client";

import type { CSSProperties, ReactNode } from "react";
import { Check, Minus, Plus, RotateCcw } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import type { GlobalStyle, TemplateStyle } from "@/types/resume";

export const DEFAULT_GLOBAL_STYLE = {
    fontFamily: "'Pretendard', sans-serif",
    primaryColor: "#2f80c3",
    contentWidth: 800,
    basePadding: 48,
    blockGap: 18,
    projectDividerGap: 28,
    displayTitleFontSize: 24,
    sectionTitleFontSize: 24,
    itemTitleFontSize: 19,
    bodyFontSize: 14,
    captionFontSize: 14,
};

const TEMPLATE_OPTIONS: { value: TemplateStyle; label: string; description: string }[] = [
    { value: "modern", label: "Modern", description: "카드형 섹션" },
    { value: "minimal", label: "Minimal", description: "선과 여백 중심" },
];

const FONT_OPTIONS = [
    { label: "Pretendard", value: "'Pretendard', -apple-system, sans-serif" },
    { label: "나눔고딕", value: "'Nanum Gothic', sans-serif" },
    { label: "IBM Plex", value: "'IBM Plex Sans KR', sans-serif" },
    { label: "본명조", value: "'Noto Serif KR', serif" },
]

// 기본 블루 외에는 흰 종이 위 글자색으로도 읽기 좋은(대비 4.5:1 이상) 색만 둔다.
const ACCENT_COLORS = [
    { value: "#2f80c3", label: "클래식 블루" },
    { value: "#1e3a8a", label: "네이비" },
    { value: "#0f766e", label: "딥 틸" },
    { value: "#166534", label: "포레스트 그린" },
    { value: "#c2410c", label: "테라코타" },
    { value: "#9f1239", label: "버건디" },
    { value: "#7e22ce", label: "플럼" },
    { value: "#374151", label: "차콜" },
]

const TYPOGRAPHY_CONTROLS = [
    { key: "displayTitleFontSize", label: "이름", min: 20, max: 38 },
    { key: "sectionTitleFontSize", label: "섹션 제목", min: 16, max: 32 },
    { key: "itemTitleFontSize", label: "항목 제목", min: 14, max: 22 },
    { key: "bodyFontSize", label: "본문", min: 14, max: 20 },
    { key: "captionFontSize", label: "날짜 · 보조 정보", min: 14, max: 18 },
] as const;

const SPACING_CONTROLS = [
    { key: "basePadding", label: "용지 안쪽 여백", min: 20, max: 64, step: 4 },
    { key: "blockGap", label: "섹션 사이 간격", min: 0, max: 40, step: 2 },
    { key: "projectDividerGap", label: "프로젝트 사이 간격", min: 0, max: 120, step: 2 },
    { key: "contentWidth", label: "문서 가로 너비", min: 720, max: 900, step: 20 },
] as const;

// 폰트 값은 저장 시점마다 fallback 목록이 다를 수 있어 첫 번째 서체 이름으로 비교한다.
const getPrimaryFontName = (fontFamily: string) => fontFamily.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="doc-settings__section">
            <h3 className="doc-settings__section-title">{title}</h3>
            {children}
        </section>
    );
}

export default function GlobalStylePanel() {
    const globalStyle = useResumeStore((state) => state.resume.globalStyle);
    const updateGlobalStyle = useResumeStore((state) => state.updateGlobalStyle);
    const style = { ...DEFAULT_GLOBAL_STYLE, ...globalStyle } as GlobalStyle & typeof DEFAULT_GLOBAL_STYLE;
    const template = globalStyle?.template || "modern";
    const templateLabel = TEMPLATE_OPTIONS.find((option) => option.value === template)?.label ?? "Modern";
    const primaryColor = (style.primaryColor || DEFAULT_GLOBAL_STYLE.primaryColor).toLowerCase();
    const isPresetColor = ACCENT_COLORS.some((color) => color.value === primaryColor);
    const currentFontName = getPrimaryFontName(style.fontFamily || DEFAULT_GLOBAL_STYLE.fontFamily);

    return (
        <aside
            style={{ "--inspector-accent": primaryColor } as CSSProperties}
            className="inspector-panel inspector-panel--global doc-settings h-full w-full overflow-y-auto"
        >
            <header className="doc-settings__header">
                <div>
                    <h2 className="doc-settings__title">문서 전역 설정</h2>
                    <p className="doc-settings__subtitle">{templateLabel} 템플릿에만 적용돼요</p>
                </div>
                <button
                    type="button"
                    onClick={() => updateGlobalStyle(DEFAULT_GLOBAL_STYLE)}
                    className="doc-settings__reset"
                    data-tooltip="현재 템플릿의 전역 설정을 기본값으로 복원"
                >
                    <RotateCcw size={13} aria-hidden="true" />
                    초기화
                </button>
            </header>

            <Section title="템플릿">
                <div className="doc-settings__templates">
                    {TEMPLATE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => updateGlobalStyle({ template: option.value })}
                            aria-pressed={template === option.value}
                            className="inspector-template-card doc-settings__template"
                        >
                            <span className={`doc-settings__thumb doc-settings__thumb--${option.value}`} aria-hidden="true">
                                <i /><i /><i />
                            </span>
                            <span className="doc-settings__template-copy">
                                <span className="doc-settings__template-name">{option.label}</span>
                                <span className="doc-settings__template-description">{option.description}</span>
                            </span>
                            <Check className="doc-settings__template-check" size={14} aria-hidden="true" />
                        </button>
                    ))}
                </div>
            </Section>

            <Section title="서체">
                <div className="doc-settings__fonts" role="radiogroup" aria-label="서체">
                    {FONT_OPTIONS.map((font) => {
                        const isSelected = getPrimaryFontName(font.value) === currentFontName;
                        return (
                            <button
                                key={font.value}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => updateGlobalStyle({ fontFamily: font.value })}
                                className="doc-settings__font"
                            >
                                <span className="doc-settings__font-sample" style={{ fontFamily: font.value }}>가Aa</span>
                                <span className="doc-settings__font-name">{font.label}</span>
                            </button>
                        );
                    })}
                </div>
            </Section>

            <Section title="포인트 컬러">
                <div className="doc-settings__colors">
                    {ACCENT_COLORS.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => updateGlobalStyle({ primaryColor: color.value })}
                            aria-label={`${color.label} ${color.value}`}
                            aria-pressed={primaryColor === color.value}
                            data-tooltip={color.label}
                            className="doc-settings__swatch"
                            style={{ backgroundColor: color.value }}
                        >
                            <Check size={13} aria-hidden="true" />
                        </button>
                    ))}
                    <label
                        className="doc-settings__swatch doc-settings__swatch--custom"
                        data-selected={!isPresetColor}
                        data-tooltip="직접 고르기"
                        style={isPresetColor ? undefined : { backgroundColor: primaryColor }}
                    >
                        {isPresetColor ? <Plus size={14} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
                        <input
                            type="color"
                            value={primaryColor}
                            onChange={(event) => updateGlobalStyle({ primaryColor: event.target.value })}
                            aria-label="사용자 지정 포인트 컬러"
                        />
                    </label>
                </div>
            </Section>

            <Section title="글자 크기">
                <div className="doc-settings__rows">
                    {TYPOGRAPHY_CONTROLS.map(({ key, label, min, max }) => {
                        const value = style[key];
                        const setValue = (next: number) => updateGlobalStyle({ [key]: Math.min(max, Math.max(min, next)) });
                        return (
                            <div key={key} className="doc-settings__row">
                                <span className="doc-settings__row-label">{label}</span>
                                <div className="doc-settings__stepper">
                                    <button type="button" onClick={() => setValue(value - 1)} disabled={value <= min} aria-label={`${label} 작게`}>
                                        <Minus size={13} aria-hidden="true" />
                                    </button>
                                    <span aria-live="polite">{value}</span>
                                    <button type="button" onClick={() => setValue(value + 1)} disabled={value >= max} aria-label={`${label} 크게`}>
                                        <Plus size={13} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Section>

            <Section title="여백과 간격">
                <div className="doc-settings__sliders">
                    {SPACING_CONTROLS.map(({ key, label, min, max, step }) => {
                        const value = style[key];
                        return (
                            <label key={key} className="doc-settings__slider">
                                <span className="doc-settings__slider-head">
                                    <span>{label}</span>
                                    <output>{value}px</output>
                                </span>
                                <input
                                    type="range"
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={value}
                                    onChange={(event) => updateGlobalStyle({ [key]: Number(event.target.value) })}
                                    style={{ "--doc-settings-fill": `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
                                />
                            </label>
                        );
                    })}
                </div>
            </Section>

            <p className="doc-settings__hint">캔버스의 빈 곳을 누르면 언제든 이 설정으로 돌아와요.</p>
        </aside>
    );
}
