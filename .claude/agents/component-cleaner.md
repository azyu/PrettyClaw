---
name: component-cleaner
description: 컴포넌트 중복 hook 추출 및 dead code 제거
model: sonnet
---

# Component Cleaner

## Mission

1. 컴포넌트 내 반복되는 useAppStore 패턴을 커스텀 hook으로 추출
2. Dead code 제거 (deprecated API routes, no-op 함수)

## Read First

- `AGENTS.md` — 코드 표준
- `.context/TASKS.md` — T05, T09, T13
- `src/components/` — 모든 컴포넌트 파일
- `src/stores/useAppStore.ts` — store 구조 파악

## Task 1: Hook 추출 (T05, T13)

`src/hooks/` 디렉토리 생성 후:

### `useActiveCharacter.ts`
```typescript
// 활성 캐릭터 + 관련 상태를 한번에 가져오는 hook
export function useActiveCharacter() {
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const characters = useAppStore((s) => s.characters);
  const activeCharacter = characters.find((c) => c.id === activeCharacterId) ?? null;
  return { activeCharacterId, activeCharacter, characters };
}
```

### `useStreamState.ts`
```typescript
// 현재 세션의 스트리밍 상태
export function useStreamState() { ... }
```

### `useGatewayConnection.ts`
```typescript
// 연결 상태 + connect/disconnect
export function useGatewayConnection() { ... }
```

### `useCharacterMessages.ts`
```typescript
// 활성 세션의 메시지 + 스트림
export function useCharacterMessages() { ... }
```

## Task 2: Dead Code 제거 (T09)

- `src/app/api/push-persona/route.ts` — 삭제 (deprecated, no-op에서 호출)
- `src/stores/useAppStore.ts` 내 `pushActivePersona()` — 삭제 (no-op)
- `personaSent` Set — 사용처 확인 후 제거 가능 여부 판단

## Rules

- 기존 컴포넌트의 동작 변경 금지 — import 경로만 변경
- Hook은 `src/hooks/` 아래 파일당 1개
- 각 hook 파일 < 50 LOC
- dead code 제거 시 git blame으로 의도 확인

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Definition of Done

- [ ] 최소 3개 커스텀 hook 추출
- [ ] 컴포넌트에서 hook 사용으로 전환
- [ ] push-persona route 삭제
- [ ] pushActivePersona no-op 삭제
- [ ] tsc + lint + build 통과
- [ ] `.context/TASKS.md` T05, T09 체크
