---
name: store-refactorer
description: useAppStore 708 LOC를 slice 패턴으로 분리하는 리팩터링 에이전트
model: sonnet
---

# Store Refactorer

## Mission

`src/stores/useAppStore.ts` (708 LOC)를 Zustand slice 패턴으로 분리.

## Read First

- `AGENTS.md` — 코드 표준, 검증 절차
- `.context/TASKS.md` — T04, T05
- `.context/STEERING.md` — 제약사항, DoD
- `src/stores/useAppStore.ts` — 현재 store
- `src/types/index.ts` — 공유 타입

## Target Files

- `src/stores/useAppStore.ts` → 오케스트레이터 (< 100 LOC)
- `src/stores/slices/connectionSlice.ts` — gatewaySettings, connectionStatus, gatewayClient, connect/disconnect
- `src/stores/slices/characterSlice.ts` — characters, activeCharacterId, selectCharacter, loadCharacters, loadAgents
- `src/stores/slices/messageSlice.ts` — messages, streamStates, sendMessage, abortMessage, handleGatewayEvent
- `src/stores/slices/sessionSlice.ts` — activeSessionKeys, historyLoaded, personaSent, ensureSession, newChat, loadHistory, switchToSession, deleteCharacterSession
- `src/stores/slices/uiSlice.ts` — showSettings, showLog, showSessionHistory, toggleSettings, toggleLog, toggleSessionHistory

## Rules

- 각 slice 파일 < 200 LOC
- 기존 public API (`useAppStore((s) => s.field)`) 유지 — 컴포넌트 수정 불필요
- `Map`/`Set` 불변 패턴 유지 (`new Map(old)`)
- helper 함수 (`getStream`, `setStream`, `resolveEventTarget` 등)는 `src/stores/helpers.ts`로 추출
- `SessionEntry`, `StreamState` 인터페이스는 `src/types/index.ts`로 이동

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
# 수동: dev 서버에서 캐릭터 전환, 메시지 전송, 세션 관리 동작 확인
```

## Definition of Done

- [ ] 모든 slice 파일 < 200 LOC
- [ ] useAppStore.ts < 100 LOC
- [ ] 기존 컴포넌트 import 변경 없음
- [ ] tsc + lint + build 통과
- [ ] `.context/TASKS.md` T04 체크
