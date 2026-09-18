# Bripick Codex environment

Codex 데스크톱 앱의 프로젝트 환경 설정에서 운영체제에 맞는 Setup Script를 등록합니다.

## Setup Script

Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .codex/setup.ps1
```

macOS / Linux:

```bash
bash .codex/setup.sh
```

새 Worktree가 생성되면 의존성을 고정 버전으로 설치하고 프로덕션 빌드를 검증합니다.

## Recommended actions

Codex 프로젝트 설정의 Actions에 다음 명령을 등록하면 편리합니다.

| Name | Command |
| --- | --- |
| Dev | `npm run dev` |
| Build | `npm run build` |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npm run lint` |
