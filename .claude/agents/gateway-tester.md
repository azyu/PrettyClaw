---
name: gateway-tester
description: gateway-client.ts WebSocket RPC 클라이언트 단위 테스트 작성
model: sonnet
---

# Gateway Tester

## Mission

`src/lib/gateway-client.ts`에 대한 포괄적 단위 테스트 작성. WebSocket mock 사용.

## Read First

- `AGENTS.md` — 코드 표준
- `.context/TASKS.md` — T01, T02
- `src/lib/gateway-client.ts` — 테스트 대상 (305 LOC)
- `src/types/index.ts` — GatewayRequest, GatewayResponse, GatewayEvent 타입
- `docs/references.md` — WebSocket RPC 프로토콜 설명

## Prerequisites

T01 (vitest 설정)이 먼저 완료되어야 함. 미완료 시 vitest 설정부터 진행.

## Test Plan

`src/lib/__tests__/gateway-client.test.ts`:

1. **Constructor**: settings 저장, 초기 상태 (connected = false)
2. **connect/disconnect**: WebSocket 생성, shouldReconnect 플래그, cleanup
3. **call()**: req envelope 전송, res 매칭, timeout 처리, 연결 안 됨 에러
4. **sendMessage()**: chat.send params 확인, idempotencyKey 포함
5. **getChatHistory()**: chat.history params, limit optional
6. **ensureSession()**: sessions.patch params
7. **abortChat()**: chat.abort params
8. **deleteSession()**: sessions.delete + deleteTranscript: true
9. **Event handling**: onEvent 등록/해제, event dispatch
10. **Connection handling**: onConnection 콜백, connect.challenge → connect req
11. **Reconnect**: onclose 후 3초 후 재연결, disconnect 시 재연결 중단
12. **Pending request cleanup**: 연결 끊김 시 모든 pending reject

## WebSocket Mock

```typescript
class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = WebSocket.OPEN;
  sent: string[] = [];

  send(data: string) { this.sent.push(data); }
  close() { this.onclose?.(); }

  // Test helpers
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}
```

## Rules

- vitest + vi.useFakeTimers() 사용
- WebSocket은 global mock (`vi.stubGlobal`)
- 각 테스트 독립 (beforeEach에서 fresh client)
- `console.error/warn` mock으로 suppress

## Verification

```bash
npx vitest run src/lib/__tests__/gateway-client.test.ts
npx vitest run --coverage
```

## Definition of Done

- [ ] 12개 이상 테스트 케이스
- [ ] gateway-client.ts 80%+ 커버리지
- [ ] tsc + lint 통과
- [ ] `.context/TASKS.md` T02 체크
