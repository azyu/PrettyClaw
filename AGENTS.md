# AGENTS.md — PrettyClaw

## Read First

- `docs/references.md` — 프로젝트 컨셉, 기술 스택, ADR, 파일 맵
- `docs/openclaw-persona-research.md` — OpenClaw 멀티에이전트 아키텍처 분석
- `docs/persona-override-guide.md` — 페르소나 오버라이드 방법 정리
- `.context/TASKS.md` — 태스크 목록 및 우선순위
- `.context/STEERING.md` — 에이전트 조율 규칙

## Project Structure

```
PrettyClaw/
├── src/
│   ├── app/page.tsx               # 진입점 (auto-connect, layout)
│   ├── app/layout.tsx             # 루트 레이아웃
│   ├── app/globals.css            # Tailwind 4 스타일
│   ├── app/api/characters/route.ts
│   ├── app/api/push-persona/route.ts  # deprecated
│   ├── components/                # UI 컴포넌트 (9개)
│   ├── stores/useAppStore.ts      # Zustand store (708 LOC) ⚠️
│   ├── lib/gateway-client.ts      # WebSocket RPC 클라이언트
│   ├── lib/characters.ts          # 캐릭터 기본 설정
│   └── types/index.ts             # 공유 타입
├── public/
│   ├── backgrounds/               # SVG 배경 (3개)
│   └── characters/                # 캐릭터 아바타/스프라이트
├── docs/                          # 프로젝트 문서
├── .context/                      # 멀티에이전트 조율
├── AGENTS.md                      # ← 이 파일
├── CLAUDE.md                      # → AGENTS.md symlink
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Commands

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript 타입 체크
```

## Code Standards

### Do

- **Immutable state**: `new Map(old)`, `[...arr, item]`, `{ ...obj, key: val }`
- **`"use client"`** 모든 클라이언트 컴포넌트 파일 최상단
- **Zustand selectors**: `useAppStore((s) => s.field)` — 전체 스토어 구독 금지
- **Korean UI text**: 모든 사용자 대면 텍스트는 한국어
- **파일당 400 LOC 이하**: 초과 시 slice/hook 분리
- **lib/ 순수 함수**: side-effect 없음, store 의존 금지
- **타입 안전**: strict TS, `as` 최소화, `unknown` → 타입 가드

### Don't

- ❌ state 직접 mutate (`state.field = val`)
- ❌ `console.log` 커밋 (디버그용은 `console.warn` 사용)
- ❌ 400 LOC 초과 단일 파일
- ❌ URL/토큰 하드코딩 (환경변수 사용)
- ❌ lib → store 의존 (lib는 순수)
- ❌ `useAppStore()` 전체 구독 (selector 사용)
- ❌ `any` 타입 (최소한 `unknown`)

### Patterns

```typescript
// Zustand selector
const status = useAppStore((s) => s.connectionStatus);

// Immutable Map update
const next = new Map(state.messages);
next.set(key, [...(next.get(key) || []), newMsg]);
set({ messages: next });

// Gateway RPC call
const result = await gatewayClient.call("method.name", { param: value });
```

## Verification

작업 완료 후 검증 순서:

```bash
npx tsc --noEmit     # 1. 타입 체크
npm run lint         # 2. 린트
npm run build        # 3. 빌드
npm run dev          # 4. 스모크 테스트 (수동)
```

## Environment

```bash
# .env.local (커밋 금지)
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:18789
NEXT_PUBLIC_GATEWAY_TOKEN=your-token-here
```

## Testing (TBD)

계획: vitest + @testing-library/react + Playwright

```bash
# 설정 후:
npm test             # vitest 단위/통합
npm run test:e2e     # Playwright E2E
```

## Commit Conventions

```
<type>: <description>

feat:     새 기능
fix:      버그 수정
refactor: 리팩터링
test:     테스트 추가/수정
chore:    빌드, 설정, 문서
perf:     성능 개선
```

## Multi-Agent Coordination

- 태스크 목록: `.context/TASKS.md`
- 조율 규칙: `.context/STEERING.md`
- 태스크 할당: TASKS.md의 Priority/Phase 기반
- 에이전트 간 파일 충돌: store slice 단위로 분리 할당
- 완료 검증: 각 에이전트가 자체 `tsc + lint + build` 수행
