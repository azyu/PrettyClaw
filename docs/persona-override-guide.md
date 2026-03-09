# PrettyClaw: OpenClaw 페르소나 오버라이드 가이드

## 문제

OpenClaw Gateway의 에이전트는 workspace 디렉토리의 MD 파일(IDENTITY.md, SOUL.md, USER.md 등)을 시스템 프롬프트로 사용한다. 기본 workspace(`~/.openclaw/workspace/`)에 "클로(Claw)" 페르소나가 설정되어 있으면, 별도 에이전트를 만들어도 부모 workspace의 파일이 상속되어 클로 페르소나가 우선 적용된다.

## 시도한 방법들

### 1. 별도 에이전트 + 자체 workspace (실패)
- `prettyclaw-yuki` 에이전트를 `openclaw.json`에 등록
- `workspace: ~/.openclaw/workspace/agents/prettyclaw-yuki/` 지정
- IDENTITY.md, SOUL.md, USER.md 작성
- **결과**: 부모 workspace의 클로 페르소나가 상속되어 여전히 클로로 응답

### 2. `agents.files.set` API (실패)
- Gateway WS API로 `agents.files.set` 호출 → `ok: true` 반환
- 파일이 디스크에 기록되긴 하지만, 실제 LLM 시스템 프롬프트에 반영되지 않음
- 새 세션(`sessions.reset`)을 해도 동일

### 3. 메시지에 페르소나 인라인 주입 (실패)
- 첫 메시지에 `[System: 페르소나 프롬프트]\n\n사용자 메시지` 형태로 주입
- 에이전트의 기본 시스템 프롬프트(클로)가 너무 강해서 오버라이드 안 됨

### 4. main workspace 비우기 + 에이전트별 workspace 분리 (성공)
- **핵심**: 부모 workspace에 페르소나가 없으면 상속할 것도 없다
- main workspace의 IDENTITY.md, SOUL.md, USER.md를 최소화 (빈 내용)
- 기존 클로 페르소나를 별도 `claw` 에이전트 workspace로 이동
- 각 캐릭터 에이전트가 자체 workspace에서 페르소나를 정의
- **결과**: 유키가 유키로 응답! 클로 페르소나 간섭 없음

## 최종 아키텍처

```
~/.openclaw/
├── openclaw.json
│   agents.list:
│     - id: main          (default 제거, 빈 workspace)
│     - id: claw          (default: true, 기존 클로 페르소나)
│     - id: prettyclaw-yuki (유키 페르소나)
│
└── workspace/                          ← defaults workspace (최소한)
    ├── IDENTITY.md                       "에이전트별 workspace에서 정의됩니다"
    ├── SOUL.md                           (최소한)
    ├── USER.md                           (최소한)
    ├── BOOT.md, HEARTBEAT.md, ...        (공용 설정 유지)
    └── agents/
        ├── claw/                       ← 기존 클로 페르소나
        │   ├── IDENTITY.md               "클로(Claw) 🐾 디지털 집사"
        │   ├── SOUL.md                   "Be genuinely helpful..."
        │   └── USER.md                   "주인님, Asia/Seoul"
        └── prettyclaw-yuki/            ← 유키 페르소나
            ├── IDENTITY.md               "유키(ユキ) 17세 고등학생"
            ├── SOUL.md                   "You are not a chatbot. You are 유키."
            └── USER.md                   "대화 상대는 친구"
```

## 참고 프로젝트

| 프로젝트 | 방식 | URL |
|---------|------|-----|
| clawpal | main workspace 직접 덮어쓰기 | https://github.com/smartchainark/clawpal |
| openclaw-agents | install.sh로 SOUL.md/IDENTITY.md 복사 | https://github.com/will-assistant/openclaw-agents |
| openclaw-identities | 페르소나 컬렉션 | https://github.com/emily-flambe/openclaw-identities |

## 캐릭터 추가 방법

1. `~/.openclaw/workspace/agents/prettyclaw-{id}/` 디렉토리 생성
2. IDENTITY.md, SOUL.md, USER.md 작성
3. `openclaw.json`의 `agents.list`에 등록:
   ```json
   {"id": "prettyclaw-{id}", "workspace": "/Users/azyu/.openclaw/workspace/agents/prettyclaw-{id}"}
   ```
4. `src/lib/characters.ts`에 캐릭터 설정 추가 (`agentId: "prettyclaw-{id}"`)
5. Gateway 재시작

## 주의사항

- main workspace의 IDENTITY.md, SOUL.md, USER.md는 반드시 비워둬야 함 (페르소나 상속 방지)
- BOOT.md, HEARTBEAT.md 등 공용 설정은 main workspace에 유지 가능
- `claw` 에이전트를 `default: true`로 설정해야 기존 OpenClaw 기능(CLI 등)이 클로로 동작
- 캐릭터 전환 시 Gateway 재시작 불필요 — 세션이 에이전트에 바인딩됨
- `agents.files.set` API는 파일 기록은 되지만 시스템 프롬프트에 즉시 반영되지 않음 (사용하지 말 것)
