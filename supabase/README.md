# Supabase 게시 기능 설정

1. Supabase 프로젝트의 Authentication 설정에서 Anonymous Sign-Ins를 활성화합니다.
2. SQL Editor에서 `schema.sql`을 실행합니다.
3. 저장소 루트에 `.env.local`을 만들고 `.env.example`의 두 값을 채웁니다.
4. 다시 빌드·배포합니다. 두 값은 Next.js 서버에서만 읽으며 브라우저 번들에는 포함되지 않습니다.

운영 서버에서는 같은 값을 `/etc/bripick.env`에 저장합니다.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

환경 파일은 저장소나 배포 압축 파일에 포함하지 않습니다.

공개 링크는 `/r/{slug}` 형식을 사용합니다. 공개 문서는 누구나 읽을 수 있고, 게시·업데이트·삭제는 해당 문서를 게시한 사용자 세션만 가능합니다. 현재는 익명 세션을 사용하지만 이후 정식 로그인 계정으로 확장할 수 있습니다.
