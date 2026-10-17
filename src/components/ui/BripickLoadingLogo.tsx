const BRAND_COLOR = "#6392ff";
const MORPH_COLOR = "#40c7d4";
const ACCENT_COLOR = "#395ba8";

type BripickLoadingLogoProps = {
    size?: number;
    label?: string;
};

export default function BripickLoadingLogo({
    size = 88,
    label,
}: BripickLoadingLogoProps) {
    const duration = "2.2s";

    return (
        <div className="bripick-loading" role="status" aria-live="polite">
            <svg
                className="bripick-loading-logo"
                width={size}
                height={size}
                viewBox="-28 -28 296 296"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <g className="bripick-loading-logo__animated">
                    <animateTransform
                        attributeName="transform"
                        type="rotate"
                        dur={duration}
                        repeatCount="indefinite"
                        values="0 120 120; 0 120 120; -90 120 120; 0 120 120; 0 120 120"
                        keyTimes="0; 0.2; 0.5; 0.8; 1"
                        calcMode="spline"
                        keySplines="0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1"
                    />
                    <animateTransform
                        attributeName="transform"
                        additive="sum"
                        type="scale"
                        dur={duration}
                        repeatCount="indefinite"
                        values="1 1; 1 1; 1.03 0.97; 1 1; 1 1"
                        keyTimes="0; 0.2; 0.5; 0.8; 1"
                        calcMode="spline"
                        keySplines="0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1"
                    />

                    <rect rx="60" fill={BRAND_COLOR} x="0" y="0" width="120" height="240">
                        <animate attributeName="width" dur={duration} repeatCount="indefinite" values="120; 120; 240; 240; 120" keyTimes="0; 0.2; 0.5; 0.8; 1" calcMode="spline" keySplines="0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1" />
                        <animate attributeName="height" dur={duration} repeatCount="indefinite" values="240; 240; 120; 120; 240" keyTimes="0; 0.2; 0.5; 0.8; 1" calcMode="spline" keySplines="0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1" />
                        <animate attributeName="fill" dur={duration} repeatCount="indefinite" values={`${BRAND_COLOR}; ${BRAND_COLOR}; ${MORPH_COLOR}; ${MORPH_COLOR}; ${BRAND_COLOR}`} keyTimes="0; 0.2; 0.5; 0.8; 1" />
                    </rect>
                    <rect x="0" y="119" width="240" height="121" rx="60" fill={BRAND_COLOR}>
                        <animate attributeName="fill" dur={duration} repeatCount="indefinite" values={`${BRAND_COLOR}; ${BRAND_COLOR}; ${MORPH_COLOR}; ${MORPH_COLOR}; ${BRAND_COLOR}`} keyTimes="0; 0.2; 0.5; 0.8; 1" />
                    </rect>
                    <rect x="119" y="0" width="121" height="240" rx="60" fill={BRAND_COLOR} opacity="1">
                        <animate attributeName="opacity" dur={duration} repeatCount="indefinite" values="1; 1; 0; 0; 1" keyTimes="0; 0.2; 0.5; 0.8; 1" calcMode="spline" keySplines="0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1; 0.2 0.8 0.2 1" />
                        <animate attributeName="fill" dur={duration} repeatCount="indefinite" values={`${BRAND_COLOR}; ${BRAND_COLOR}; ${MORPH_COLOR}; ${MORPH_COLOR}; ${BRAND_COLOR}`} keyTimes="0; 0.2; 0.5; 0.8; 1" />
                    </rect>

                    <g>
                        <animate attributeName="opacity" dur={duration} repeatCount="indefinite" values="1; 0; 0" keyTimes="0; 0.2; 1" calcMode="discrete" />
                        <ellipse cx="145" cy="142" rx="19" ry="28" fill="white" />
                        <ellipse cx="180" cy="142" rx="19" ry="28" fill="white" />
                        <ellipse cx="153" cy="141" rx="9" ry="14" fill="#18181b" />
                        <ellipse cx="188" cy="141" rx="9" ry="14" fill="#18181b" />
                        <path d="M59 63c7-1 12-6 13-13 1 7 6 12 13 13-7 1-12 6-13 13-1-7-6-12-13-13Z" fill={ACCENT_COLOR} />
                    </g>
                </g>

                <g className="bripick-loading-logo__static">
                    <rect x="0" y="0" width="120" height="240" rx="60" fill={BRAND_COLOR} />
                    <rect x="0" y="119" width="240" height="121" rx="60" fill={BRAND_COLOR} />
                    <rect x="119" y="0" width="121" height="240" rx="60" fill={BRAND_COLOR} />
                    <ellipse cx="145" cy="142" rx="19" ry="28" fill="white" />
                    <ellipse cx="180" cy="142" rx="19" ry="28" fill="white" />
                    <ellipse cx="153" cy="141" rx="9" ry="14" fill="#18181b" />
                    <ellipse cx="188" cy="141" rx="9" ry="14" fill="#18181b" />
                    <path d="M59 63c7-1 12-6 13-13 1 7 6 12 13 13-7 1-12 6-13 13-1-7-6-12-13-13Z" fill={ACCENT_COLOR} />
                </g>
            </svg>
            {label && <span className="bripick-loading__label">{label}</span>}
        </div>
    );
}
