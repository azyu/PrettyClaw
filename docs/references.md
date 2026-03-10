# PrettyClaw — Project References

## Project Concept

PrettyClaw는 OpenClaw Gateway용 **비주얼 노벨(VN) 스타일 에이전트 UI**.

- 3명의 캐릭터(유키, 사쿠라, 린)가 각각 독립된 OpenClaw 에이전트로 동작
- WebSocket RPC 프로토콜로 Gateway와 통신 (Protocol v3)
- 캐릭터별 독립 세션, 페르소나 격리, 스트리밍 응답
- VN 레이아웃: 사이드바 → 배경 + 스프라이트 → 대화창 + 입력

## Tech Stack

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Framework | Next.js | 16.1 | App Router, React 19 지원 |
| UI | React | 19.2 | Server Components, use() hook |
| Language | TypeScript | 5.9 | strict mode, satisfies, decorators |
| State | Zustand | 5.0 | 단일 스토어, 불변 패턴, 미들웨어 |
| Styling | Tailwind CSS | 4.2 | PostCSS 플러그인, JIT |
| Animation | Framer Motion | 12.35 | AnimatePresence, layout |
| Markdown | react-markdown | 10.1 | 어시스턴트 응답 렌더링 |
| ID | uuid | 13.0 | 메시지/리퀘스트 ID 생성 |

## Architecture Decisions

### ADR-001: WebSocket RPC Envelope

Gateway는 `{ type: "req" | "res" | "event", ... }` envelope 사용. `GatewayClient` 클래스가 req/res 매칭, 이벤트 디스패치, 자동 재연결 담당. 세션 키 형식: `agent:<agentId>:<scope>`.

### ADR-005: Browser Device Auth

PrettyClaw는 OpenClaw Control UI와 같은 방식으로 브라우저 `device identity`를 생성해 Gateway에 연결한다. device key와 device token은 브라우저 저장소에 보관하며, v1 pairing 승인은 CLI로 처리한다.

### ADR-002: Multi-Agent Persona Isolation

캐릭터별 독립 OpenClaw 에이전트. 각 에이전트는 자체 workspace(SOUL.md, IDENTITY.md)를 가지며, main workspace는 비워둠으로써 페르소나 상속 방지. 단일 에이전트 + 동적 파일 교체 방식은 race condition 및 세션 격리 실패로 기각.

상세: [persona-override-guide.md](./persona-override-guide.md), [openclaw-persona-research.md](./openclaw-persona-research.md)

### ADR-003: Zustand Single Store

`useAppStore` 하나에 connection, characters, messages, stream, session, UI 상태 통합. 현재 708 LOC — slice 분리 필요. `Map`/`Set` 사용으로 불변성 유지.

### ADR-004: VN Layout

고정 레이어 구조: `SceneLayer`(배경 + 스프라이트) → `DialogueBox`(스트리밍 텍스트) → `PromptInput`. `CharacterSidebar`로 캐릭터 전환. 오버레이: Settings, ChatLog, SessionHistory, DebugInfo.

## Implementation Guides

- [character-sprite-overlays.md](./character-sprite-overlays.md) — 스프라이트 눈/입 overlay 자산 규칙 및 `spriteMeta` 작성 방법
- [gateway-device-auth.md](./gateway-device-auth.md) — 브라우저 device identity, pairing, device token 저장 방식

## File Map

```
src/
├── app/
│   ├── page.tsx              # 진입점, auto-connect
│   ├── layout.tsx            # 루트 레이아웃
│   ├── globals.css           # Tailwind 4 + 커스텀 스타일
│   └── api/
│       ├── characters/route.ts   # 캐릭터 목록 API
│       ├── bootstrap-agents/route.ts # 누락된 OpenClaw agent bootstrap
│       └── push-persona/route.ts # 페르소나 푸시 API (deprecated)
├── components/
│   ├── CharacterSidebar.tsx  # 캐릭터 선택 사이드바 (128 LOC)
│   ├── SceneLayer.tsx        # 배경 + 스프라이트 (97 LOC)
│   ├── DialogueBox.tsx       # 스트리밍 대화창 (213 LOC)
│   ├── PromptInput.tsx       # 메시지 입력 (132 LOC)
│   ├── ChatLog.tsx           # 전체 채팅 로그 (124 LOC)
│   ├── SettingsPanel.tsx     # Gateway 설정 (161 LOC)
│   ├── SessionHistoryPanel.tsx # 세션 목록 (195 LOC)
│   ├── SessionActions.tsx    # 세션 액션 버튼 (59 LOC)
│   ├── DebugInfo.tsx         # 디버그 정보 (30 LOC)
│   └── CharacterSprite.tsx   # 눈/입 overlay 스프라이트 렌더링
├── stores/
│   └── useAppStore.ts        # Zustand 단일 스토어 (708 LOC) ⚠️
├── lib/
│   ├── gateway-client.ts     # WebSocket RPC + device auth 클라이언트
│   ├── gateway-device-auth.ts # 브라우저 device key/token 저장 및 서명
│   ├── gateway-connection.ts # 연결 상태/에러 메시지 매핑
│   ├── character-config.ts   # 캐릭터 설정 로더 + 기본값 병합
│   └── characters.ts         # 기본 캐릭터 설정
├── types/
│   └── index.ts              # 공유 타입 정의
└── public/
    └── characters/parts/     # 눈/입 overlay 파츠 자산
```

## Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | 테스트 프레임워크 선택 (vitest vs jest) | TBD — vitest 추천 |
| 2 | useAppStore slice 분리 전략 | TBD — connection/character/message/session/ui |
| 3 | CI/CD 파이프라인 (GitHub Actions) | TBD |
| 4 | Sakura/Rin placeholder 페르소나 완성 | TBD |
| 5 | push-persona API route dead code 제거 | TBD |
| 6 | E2E 테스트 전략 (Playwright) | TBD |
| 7 | 반응형 레이아웃 (모바일) | TBD |
| 8 | device pairing 승인 UI를 WebUI에 넣을지 여부 | TBD — 현재는 CLI 안내 |
