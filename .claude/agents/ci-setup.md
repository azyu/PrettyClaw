---
name: ci-setup
description: GitHub Actions CI + vitest + Playwright 설정
model: sonnet
---

# CI Setup

## Mission

테스트 인프라(vitest) 설정 + GitHub Actions CI 파이프라인 구축.

## Read First

- `AGENTS.md` — 프로젝트 구조, 커맨드
- `.context/TASKS.md` — T01, T11, T14
- `package.json` — 현재 의존성
- `tsconfig.json` — TS 설정

## Task 1: vitest 설정 (T01)

### 패키지 설치
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.test.*'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### `src/test/setup.ts`
```typescript
import '@testing-library/jest-dom/vitest';
```

### package.json scripts 추가
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

### 샘플 테스트
`src/lib/__tests__/characters.test.ts` — DEFAULT_CHARACTERS 구조 검증

## Task 2: GitHub Actions (T11)

### `.github/workflows/ci.yml`
```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## Task 3: Playwright 준비 (T14, 나중)

설치만 진행, E2E 테스트는 별도 에이전트가 작성:
```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

## Rules

- vitest 설정은 Next.js 16 + React 19 호환 확인
- `@/*` path alias가 vitest에서도 동작해야 함
- CI는 최소한으로 — tsc → lint → test → build

## Verification

```bash
npm test                  # vitest 실행
npx tsc --noEmit
npm run lint
npm run build
```

## Definition of Done

- [ ] `npm test` 동작
- [ ] 샘플 테스트 1개 이상 통과
- [ ] CI workflow 파일 존재
- [ ] tsc + lint + build 통과
- [ ] `.context/TASKS.md` T01, T11 체크
