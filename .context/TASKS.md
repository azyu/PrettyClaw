# PrettyClaw Tasks

## Critical

- [ ] T01: vitest + @testing-library/react 설정 — `vitest.config.ts`, test scripts, 샘플 테스트
- [ ] T02: gateway-client.ts 단위 테스트 — WebSocket mock, RPC req/res, 재연결, 타임아웃
- [ ] T03: useAppStore 단위 테스트 — connect/disconnect, sendMessage, loadHistory, session 관리
- [ ] T04: useAppStore slice 분리 (708 LOC) — connection, character, message, session, ui 슬라이스
- [ ] T05: 중복 hook 추출 — 컴포넌트 내 useAppStore 반복 패턴 → `useActiveCharacter`, `useStreamState` 등

## High

- [ ] T08: Error Boundary 추가 — 루트 + 컴포넌트별 fallback UI
- [ ] T09: dead code 제거 — `push-persona/route.ts` (deprecated), `pushActivePersona` no-op
- [ ] T10: 구조화된 logger — `console.log/warn/error` → logger 유틸 (레벨, 컨텍스트)
- [ ] T11: CI 파이프라인 — GitHub Actions: tsc → lint → test → build
- [ ] T12: README.md 작성 — 설치, 실행, 아키텍처, 스크린샷

## Medium

- [ ] T13: 공유 hooks 추출 — `useGatewayConnection`, `useCharacterMessages`, `useSessionManager`
- [ ] T14: E2E 테스트 — Playwright: 연결 → 캐릭터 전환 → 메시지 전송 flow
- [ ] T15: 반응형 레이아웃 — 모바일 breakpoint, 사이드바 토글, 대화창 조정
- [ ] T16: 접근성(a11y) — aria-labels, keyboard navigation, focus management
- [ ] T17: zod validation — Gateway 응답, 캐릭터 설정, 환경변수 스키마 검증
- [ ] T24: shadcn/ui overlay 표준화 — `SettingsPanel`, `ChatLog`, `SessionHistoryPanel`를 `Dialog`/`Sheet` 기반으로 통일
- [ ] T25: shadcn form primitives 확장 — `Textarea`, 필요 시 `Label` 및 autosize 패턴 정리
- [ ] T26: 앱 전반 action UI 통일 — 남은 버튼/입력/아이콘 액션을 공용 primitives와 `Lucide React`로 정리
- [ ] T27: UI theme token 정리 — VN 커스텀 변수와 shadcn semantic token 매핑 구조 문서화

## Low

- [ ] T18: 테마 시스템 — 캐릭터별 테마 전환 애니메이션
- [ ] T19: 사운드 — BGM, SE (메시지 수신, 캐릭터 전환)
- [ ] T20: 표정 시스템 — 캐릭터 감정 상태에 따른 스프라이트 변경
- [ ] T21: 채팅 내보내기 — JSON/텍스트 형식 대화 저장
- [ ] T22: 키보드 단축키 — 캐릭터 전환(1/2/3), 설정 토글, 로그 토글
- [ ] T23: 로딩/스켈레톤 UI — 연결 중, 히스토리 로딩 상태 표시
- [ ] T28: motion + shadcn 통합 패턴 정리 — `Framer Motion` 오버레이와 shadcn primitives 공존 규칙 정리
