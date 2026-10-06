# Supabase 게시 기능 설정

1. Supabase 프로젝트의 Authentication 설정에서 Anonymous Sign-Ins를 활성화합니다.
2. SQL Editor에서 `schema.sql`을 실행합니다.
3. 저장소 루트에 `.env.local`을 만들고 `.env.example`의 두 값을 채웁니다.
4. 다시 빌드·배포합니다. 두 값은 Next.js 서버에서만 읽으며 브라우저 번들에는 포함되지 않습니다.

`npm run deploy`는 `.env.local`에서 이 두 값을 읽어 암호화된 SSH/SFTP 연결로
운영 서버에 전송하고, `/etc/bripick.env`에 소유자 전용 권한(`600`)으로 설치합니다.
환경 값은 배포 압축 파일에 포함되지 않으며 전송용 임시 파일은 배포 후 삭제됩니다.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Supabase Connect 화면에서 복사한 `NEXT_PUBLIC_SUPABASE_URL`과
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`도 호환됩니다. 다만 이 프로젝트는 Supabase를
서버에서만 호출하므로 운영 환경에서는 위처럼 `NEXT_PUBLIC_`이 없는 서버 전용 이름을
권장합니다. 기존 프로젝트의 legacy anon key도 `SUPABASE_ANON_KEY` 이름으로 사용할 수 있습니다.

환경 파일은 저장소나 배포 압축 파일에 포함하지 않습니다.

공개 링크는 `/r/{slug}` 형식을 사용합니다. 공개 문서는 누구나 읽을 수 있고, 게시·업데이트·삭제는 해당 문서를 게시한 사용자 세션만 가능합니다. 현재는 익명 세션을 사용하지만 이후 정식 로그인 계정으로 확장할 수 있습니다.
