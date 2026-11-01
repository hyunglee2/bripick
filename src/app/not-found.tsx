import type { Metadata } from "next";
import Link from "next/link";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
    title: "페이지를 찾을 수 없음",
    robots: { index: false, follow: false },
};

export default function NotFound() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo} aria-label="Bripick 홈으로 이동">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/bripick_header_logo_light.svg" alt="Bripick" className={styles.logoOnLight} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/bripick_header_logo_dark.svg" alt="" className={styles.logoOnDark} />
                </Link>
            </header>

            <main className={styles.main}>
                <div className={styles.code} aria-hidden="true">
                    <span>4</span>
                    <svg className={styles.mascot} viewBox="40 40 320 320" xmlns="http://www.w3.org/2000/svg">
                        <rect x="60" y="60" width="140" height="280" rx="70" fill="#6392FF" />
                        <rect x="60" y="200" width="280" height="140" rx="70" fill="#6392FF" />
                        <rect x="200" y="60" width="140" height="280" rx="70" fill="#6392FF" />
                        <ellipse cx="219.666" cy="233.083" rx="26.8333" ry="40.25" fill="#fff" />
                        <ellipse cx="273.333" cy="233.083" rx="26.8333" ry="40.25" fill="#fff" />
                        <g className={styles.pupils}>
                            <ellipse cx="233.666" cy="231.333" rx="12.8333" ry="19.8333" fill="#0d1020" />
                            <ellipse cx="287.333" cy="231.333" rx="12.8333" ry="19.8333" fill="#0d1020" />
                        </g>
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M130.248 122.013C131.531 121.883 132.72 122.757 132.957 124.047C134.436 132.095 135.733 136.183 138.16 138.746C140.54 141.259 144.399 142.698 152.409 144.033C153.717 144.251 154.615 145.448 154.483 146.749C154.615 148.05 153.718 149.247 152.409 149.465C144.399 150.8 140.54 152.24 138.16 154.752C135.733 157.315 134.436 161.404 132.957 169.451C132.72 170.742 131.531 171.615 130.248 171.485C128.965 171.615 127.777 170.742 127.539 169.451C126.06 161.404 124.764 157.315 122.336 154.752C119.957 152.24 116.097 150.8 108.087 149.465C106.779 149.247 105.881 148.05 106.013 146.749C105.881 145.448 106.779 144.251 108.087 144.033C116.097 142.698 119.957 141.259 122.336 138.746C124.764 136.183 126.06 132.095 127.539 124.047C127.777 122.757 128.965 121.883 130.248 122.013Z"
                            fill="#395BA8"
                        />
                    </svg>
                    <span>4</span>
                </div>
                <h1 className={styles.title}>페이지를 찾을 수 없어요</h1>
                <p className={styles.lead}>주소가 바뀌었거나 삭제된 페이지예요.</p>
                <div className={styles.actions}>
                    <Link href="/" className={styles.primaryButton}>홈으로</Link>
                    <Link href="/editor" className={styles.textLink}>이력서 만들기</Link>
                </div>
            </main>
        </div>
    );
}
