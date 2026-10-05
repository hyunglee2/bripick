# 이력서 게시 서버 구조

## 요청 흐름

```text
PublishResumeButton (브라우저)
  → /api/auth/anonymous (Route Handler, HttpOnly 세션 발급)
  → /api/resumes 또는 /api/resumes/[slug] (Route Handler)
  → resume-publication.service.ts (업무 규칙·소유권 확인)
  → server/supabase/server.ts (서버 전용 Supabase 클라이언트)
  → Supabase Auth / PostgreSQL / RLS
```

클라이언트는 Supabase SDK나 키를 사용하지 않는다. 같은 출처의 Next.js API만 호출한다.

## 계층별 책임

- `src/components/editor/PublishResumeButton.tsx`: 사용자 입력과 로딩·성공·실패 UI
- `src/lib/resumePublishing.ts`: 브라우저용 API 클라이언트. `fetch`만 담당
- `src/app/api/auth/anonymous/route.ts`: 익명 Supabase 사용자를 만들고 세션을 HttpOnly 쿠키에 저장
- `src/app/api/resumes/route.ts`: 최초 게시 API
- `src/app/api/resumes/[slug]/route.ts`: 공개 조회, 변경사항 게시, 게시 취소 API
- `src/server/resumes/resume.validator.ts`: 문서 크기·필수 필드·블록 수·slug 검증
- `src/server/resumes/resume-publication.service.ts`: slug 생성, 소유자 확인, DB 저장·조회·삭제
- `src/server/auth/auth.service.ts`: 현재 세션의 사용자를 검증하는 인증 경계
- `src/server/supabase/server.ts`: 환경변수와 쿠키를 사용하는 서버 전용 Supabase 클라이언트
- `src/app/r/[slug]/page.tsx`: 공개 문서를 서버에서 조회해 읽기 전용 화면으로 전달

## 인증과 인가

인증은 “누구인지 확인”하는 단계다. 현재는 익명 사용자지만 Supabase User ID와 세션이 존재한다. 세션 토큰은 JavaScript에서 읽을 수 없는 HttpOnly 쿠키에 저장한다. 추후 이메일·OAuth 로그인을 추가해도 Service의 `user.id` 기반 소유권 규칙은 유지할 수 있다.

인가는 “이 사용자가 이 문서를 바꿀 수 있는지 확인”하는 단계다. Service가 `owner_id === user.id`를 명시적으로 확인하고, Supabase RLS가 DB 계층에서 같은 규칙을 한 번 더 강제한다.

## 공개 조회

`GET /api/resumes/[slug]`와 `/r/[slug]`는 로그인 없이 접근할 수 있다. 생성·수정·삭제만 인증과 소유자 확인이 필요하다.

## 배포 변화

이전에는 `next build` 결과인 `out/` 정적 파일을 Nginx가 직접 제공했다. 이제 `output: "standalone"` 빌드를 배포하고 Node.js가 `server.js`를 계속 실행한다. Nginx는 HTTPS와 외부 요청을 받아 `127.0.0.1:3001`의 Next.js 서버로 전달한다. 서버에는 `/etc/bripick.env`와 systemd 서비스가 필요하다.
