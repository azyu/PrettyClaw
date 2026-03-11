# TTS 통합 메모

검토일: 2026-03-11

## 현재 상태

2026-03-11 기준 현재 구현은 Typecast 단일 설계가 아니라 provider 공존형이다.

- `CharacterConfig.tts`는 nested provider 스키마를 사용한다.
- `tts.provider`가 활성 provider를 결정한다.
- `tts.typecast`와 `tts.edge`는 동시에 저장할 수 있다.
- `/api/tts`는 provider에 따라 Typecast API 또는 Edge TTS로 분기한다.
- Edge TTS는 `node-edge-tts`를 사용하며, Typecast는 `TYPECAST_API_KEY`가 있을 때만 호출된다.

예시:

```json
{
  "tts": {
    "enabled": true,
    "provider": "edge",
    "typecast": {
      "voiceId": "tc_example",
      "model": "ssfm-v30"
    },
    "edge": {
      "voice": "ko-KR-SunHiNeural",
      "outputFormat": "audio-24khz-48kbitrate-mono-mp3"
    }
  }
}
```

주의:

- 저장소 기본 캐릭터는 `config/characters.template.json`에 있고, `~/.config/prettyclaw/characters.json`이 있으면 그 파일이 실제 캐릭터 목록이 된다.
- 기존 flat TTS 스키마(`voiceId`, `model`을 `tts` 루트에 두는 형태)는 자동 호환하지 않는다.
- 로컬 설정 파일도 위 nested 스키마로 직접 바꿔야 한다.

## 목적

PrettyClaw에서 캐릭터 응답, 예를 들어 유키의 assistant 답변을 Typecast TTS로 읽어주게 할 수 있는지 검토한다.

## 초기 검토 결론

도입 가능하다.

- 현재 구조에서는 assistant 응답이 최종 확정되는 지점이 명확해서 "답변 1건당 TTS 1회 재생" 방식은 무리 없이 붙일 수 있다.
- 보안상 Typecast API 키는 브라우저에 두면 안 되므로, Next API route를 추가해 서버 경유로 호출하는 설계가 적합하다.
- 실시간 스트리밍 낭독보다는 "assistant 최종 응답 완료 후 재생"이 현재 구조와 Typecast API 형태에 더 잘 맞는다.

## 전제와 범위

- 검토 범위는 Typecast 공식 문서와 현재 PrettyClaw 코드 구조 기준이다.
- 여기서는 실제 구현까지 하지 않고, 도입 방식과 변경 범위를 정리한다.
- Typecast 문서는 현재 `ssfm-v30` + `GET /v2/voices` + `POST /v1/text-to-speech` 기준으로 읽는 것이 맞다.
- 일부 오래된 문서 페이지에는 `ssfm-v21` 또는 이전 voices 경로가 섞여 있으므로 최신 문서 기준으로 구현해야 한다.

## 현재 코드 기준 TTS 삽입 지점

### 1. assistant 텍스트가 생기는 위치

핵심 파일: `src/stores/useAppStore.ts`

- `handleChatEvent(..., state === "delta")`
  - Gateway delta 이벤트를 받을 때 누적 텍스트를 `streamStates[sessionKey].text`에 저장한다.
  - 이 값은 화면용 스트리밍 미리보기다.
- `handleChatEvent(..., state === "final")`
  - 최종 텍스트를 확정하고 `messages[sessionKey]`에 assistant 메시지를 추가한다.
  - 이 시점이 TTS 트리거 기본 위치로 가장 안전하다.
- `abortMessage()`
  - 중단 시 partial 텍스트를 `"[interrupted]"`와 함께 assistant 메시지로 저장한다.
  - 중단 응답까지 읽을지 여부는 별도 정책 결정이 필요하다.

### 2. 왜 store에서 트리거해야 하는가

- `src/components/DialogueBox.tsx`는 `streamStates`와 `messages`를 렌더링할 뿐이라 리렌더가 잦다.
- UI 레벨에서 "마지막 assistant 메시지"를 감지하면 이력 로드, 세션 전환, 재렌더 때 재생 중복이 생기기 쉽다.
- 반대로 `useAppStore.ts`의 `state === "final"` 분기는 "새 live 응답이 확정된 순간"을 정확히 잡을 수 있다.

## Typecast API 관점에서 본 적합성

공식 문서 기준:

- 개요: `ssfm-v30`가 최신 모델이며 한국어 포함 37개 언어와 7개 감정 프리셋을 지원
- Voices 조회: `GET /v2/voices`
- TTS 생성: `POST /v1/text-to-speech`
- JS/TS SDK: `@neosapience/typecast-js`, Node 18+ 및 modern browser 지원

PrettyClaw에 유리한 점:

- 한국어 지원이 명확하다.
- 감정 프리셋 또는 smart emotion이 있어서 캐릭터 톤을 맞추기 쉽다.
- 음성 목록 API가 있어 캐릭터별 `voice_id`를 미리 고정할 수 있다.

주의점:

- `POST /v1/text-to-speech`는 최종 바이너리 오디오를 반환하는 형태다.
- 문서상 스트리밍 TTS 엔드포인트는 확인하지 못했다.
- 따라서 "답변 생성 완료 후 오디오 도착, 그다음 재생" 형태가 기본 전제가 된다.
- 이는 실시간 낭독보다는 완료 후 재생 UX에 더 적합하다.

추론:

- 현재 문서만 보면 재생 시작 전 합성 완료를 기다려야 하므로, 답변 직후 약간의 추가 지연이 생긴다.
- 다만 PrettyClaw의 대화 길이와 캐릭터 챗 UX를 감안하면 첫 도입안으로는 충분히 실용적이다.

## 초기 검토 아키텍처

### 1. 서버 경유 API route 추가

권장 파일:

- `src/app/api/tts/route.ts`

역할:

- 브라우저에서 assistant 텍스트와 캐릭터 ID를 받는다.
- 서버에서 Typecast API를 호출한다.
- 응답 오디오를 그대로 `audio/mpeg` 또는 `audio/wav`로 반환한다.

이유:

- Typecast API 키를 브라우저에 노출하지 않기 위해서다.
- 현재 프로젝트도 이미 `/api/characters`, `/api/bootstrap-agents` 같은 서버 경유 패턴을 사용한다.

권장 환경 변수:

- `TYPECAST_API_KEY`
- 선택: `TYPECAST_MODEL=ssfm-v30`

비권장:

- `NEXT_PUBLIC_TYPECAST_API_KEY`

### 2. 캐릭터별 음성 설정은 character config에 둔다

현재 저장소 기본 캐릭터는 `config/characters.template.json`이고, 로컬 `~/.config/prettyclaw/characters.json`이 있으면 그 파일을 그대로 읽는다.
기본값은 `config/characters.template.json`에서 seed된다.

따라서 음성 선택 정보는 `CharacterConfig`에 넣는 편이 맞다.

초기 검토 당시 예시:

```ts
tts?: {
  enabled: boolean;
  provider: "typecast" | "edge";
  typecast?: {
    voiceId: string;
    model?: string;
  };
  edge?: {
    voice: string;
    rate?: string;
    pitch?: string;
    volume?: string;
    outputFormat?: string;
  };
}
```

이 구조의 장점:

- 저장소 기본 캐릭터와 로컬 `characters.json` 오버라이드 캐릭터마다 다른 voice를 가질 수 있다.
- 사용자 오버라이드 파일에서도 캐릭터별 음성을 쉽게 수정할 수 있다.
- 저장소 기본값과 로컬 캐릭터 목록을 분리해도 캐릭터별 설정 변경 지점을 명확하게 유지할 수 있다.

### 3. 재생 제어는 클라이언트 전용 얇은 계층으로 둔다

권장 파일:

- `src/lib/tts-player.ts` 또는 `src/lib/tts-client.ts`

역할:

- `/api/tts` 호출
- 받은 오디오 Blob 재생
- 현재 재생 중 오디오 정지
- 동일 응답 중복 재생 방지

여기서는 복잡한 Web Audio API보다 `HTMLAudioElement` 또는 `new Audio(blobUrl)` 기반이 첫 구현으로 충분하다.

## 실제 반영 결과

- `src/types/index.ts`
  - TTS 타입이 provider 공존형 nested 스키마로 변경됨
- `src/lib/character-config.ts`
  - `tts.typecast`와 `tts.edge`를 각각 nested merge
- `src/lib/tts.ts`
  - 공통 normalize와 active provider resolution 담당
- `src/lib/tts-server.ts`
  - provider별 합성 분기 담당
- `src/lib/edge-tts.ts`
  - `node-edge-tts` wrapper 추가
- `src/app/api/tts/route.ts`
  - provider-aware 서버 라우트로 변경됨
- `config/characters.template.json`
  - Typecast와 Edge 설정을 함께 담는 기본 템플릿으로 변경됨

## 권장 변경 범위

최소 구현 기준 예상 파일:

- `src/types/index.ts`
  - `CharacterConfig`에 optional `tts` 필드 추가
- `config/characters.template.json`
  - 유키 등 기본 캐릭터에 Typecast voice 설정 추가
- `src/lib/character-config.ts`
  - 기존 merge 로직으로도 대부분 처리 가능하지만, `tts` nested merge가 필요하면 최소 수정
- `src/app/api/tts/route.ts`
  - Typecast 서버 호출 추가
- `src/stores/useAppStore.ts`
  - `state === "final"` 시점에 TTS 호출 트리거 추가
  - 세션 전환/중단 시 오디오 정지 정책 연결
- 선택: `src/components/SettingsPanel.tsx`
  - 전역 음소거 또는 자동재생 토글이 필요하면 UI 추가

## 권장 동작 정책

### 1. 첫 구현 정책

추천:

- assistant 최종 응답이 확정되면 자동 재생
- 유저가 다른 캐릭터로 전환하면 현재 재생 즉시 정지
- 새 assistant 응답이 오면 이전 재생 즉시 정지 후 새 응답 재생
- 세션 이력 로드 시 과거 메시지는 재생하지 않음
- `abortMessage()`로 저장된 interrupted 메시지는 기본적으로 재생하지 않음

이 정책이 가장 단순하고 예측 가능하다.

### 2. 추후 확장 가능 항목

- 전역 자동재생 on/off
- 캐릭터별 음량
- 재생 버튼 수동 클릭
- smart emotion 사용
- 문맥 기반 `previous_text` / `next_text` 제공

하지만 첫 도입에서 한 번에 넣으면 복잡해지므로 보류가 적절하다.

## 주의해야 할 엣지 케이스

### 1. 세션 전환 시 과거 메시지 재생

`switchToSession()`는 이력을 다시 로드한다.

따라서 아래 방식은 피해야 한다.

- "마지막 assistant 메시지가 바뀌면 재생"

이 방식은 과거 대화 로드 때도 오디오가 재생될 수 있다.

반드시 아래 조건을 만족해야 한다.

- "live 응답이 새로 final 확정된 경우만 재생"

### 2. 이벤트 sessionKey 매칭 실패

`resolveEventTarget()`는 sessionKey 매칭이 실패하면 active character로 fallback한다.

추론:

- Gateway 이벤트에 sessionKey가 불완전하게 오면 잘못된 캐릭터 음성을 재생할 가능성이 있다.
- 구현 시 TTS 트리거는 가능하면 `charId`가 분명한 final 이벤트에서만 동작시키는 편이 안전하다.

### 3. interrupted 응답 처리

`abortMessage()`는 partial assistant 메시지를 남긴다.

정책이 필요하다.

- 읽지 않음: 가장 단순
- 읽음: partial 텍스트가 어색할 수 있음

초기 버전에서는 읽지 않는 것을 권장한다.

### 4. 새 채팅, 세션 삭제, disconnect

오디오 정지가 필요하다.

- `newChat()`
- `deleteCharacterSession()`
- `disconnect()`
- `selectCharacter()`

이 시점에 재생 중 오디오를 멈추지 않으면 이전 세션 음성이 남아 UX가 어색해진다.

## 구현 방향 제안

### 옵션 A. 최소 구현

구성:

- 캐릭터별 `voiceId`
- `/api/tts` 서버 라우트
- final assistant 응답 완료 후 자동 재생
- 전역 음소거 정도만 지원

장점:

- 변경 범위가 작다
- 현재 구조와 가장 잘 맞는다
- 이력 재생 중복 문제를 피하기 쉽다

권장 여부:

- 가장 권장

### 옵션 B. 실시간 스트리밍 낭독

구성:

- delta 중간 텍스트를 chunking
- 중복 텍스트 제거
- 긴 응답 분할 합성
- 오디오 큐잉

문제:

- 현재 Gateway delta는 증분 토큰이 아니라 누적 전체 텍스트다
- Typecast 문서상 스트리밍 TTS 엔드포인트를 확인하지 못했다
- 첫 구현 비용 대비 복잡도가 높다

권장 여부:

- 현재 단계에서는 비권장

## 검증 계획

구현 시 검증 순서:

1. `npx tsc --noEmit`
2. `node --test src/lib/*.test.ts`
3. `npm run build`
4. 수동 확인

수동 확인 항목:

- 유키에게 메시지 전송 후 assistant 최종 응답 1회만 재생되는지
- 같은 응답이 이력 로드 시 다시 재생되지 않는지
- 캐릭터 전환 시 이전 캐릭터 음성이 즉시 멈추는지
- 중단한 응답은 재생되지 않는지
- Typecast 크레딧 부족, 401, 429일 때 UI가 망가지지 않는지

추가 테스트 후보:

- `useAppStore`의 `handleChatEvent(... state === "final")` 경로에서 TTS 트리거 조건을 검증하는 unit test
- 이력 로드와 live final 이벤트를 구분하는 로직 테스트

## 추천 구현 순서

1. `CharacterConfig`에 provider 공존형 `tts` 필드 정의
2. 템플릿과 로컬 config를 nested TTS 스키마로 정리
3. `/api/tts`를 provider-aware 서버 라우트로 유지
4. 클라이언트 재생 유틸 추가
5. `useAppStore.ts` final 이벤트에서만 재생 트리거
6. 정지 시점 연결
7. `tsc + node:test + build + 수동 확인`

## 도입 판단

판단: 진행해도 된다.

이유:

- 현재 구조와 충돌하지 않는다.
- 캐릭터별 voice 매핑이 자연스럽다.
- 서버 경유로 키 노출 문제를 피할 수 있다.
- 초기 버전을 "최종 답변 완료 후 자동 재생"으로 제한하면 구현 복잡도가 낮다.

반대로 지금 당장 보류해야 할 정도의 막힘은 보지 못했다.

## 외부 참고 문서

- Typecast 개요: https://typecast.ai/docs/ko/overview
- Typecast 빠른 시작: https://typecast.ai/docs/ko/quickstart
- Typecast TTS API: https://typecast.ai/docs/api-reference/text-to-speech/text-to-speech
- Typecast Voices V2: https://typecast.ai/docs/api-reference/endpoint/voices/voice
- node-edge-tts: https://github.com/SchneeHertz/node-edge-tts
