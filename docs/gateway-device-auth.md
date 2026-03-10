# PrettyClaw: OpenClaw Gateway Device Auth

## 개요

PrettyClaw는 이제 OpenClaw Gateway에 브라우저 `device identity`로 직접 연결한다.

- 첫 연결 시 브라우저별 device key를 생성
- Gateway가 `connect.challenge`를 보내면 브라우저가 nonce에 서명
- connect 성공 후 반환된 `deviceToken`을 저장
- 미승인 브라우저는 `PAIRING_REQUIRED` 상태가 되며, 사용자가 Gateway 호스트에서 승인해야 함

## 저장 위치

device auth 관련 상태는 브라우저 `localStorage`에 저장한다.

- `openclaw-device-identity-v1`
  - `deviceId`
  - `publicKey`
  - `privateKey`
  - `createdAtMs`
- `openclaw.device.auth.v1`
  - role별 `deviceToken`
  - `scopes`
  - `updatedAtMs`

`~/.config/prettyclaw/characters.json` 같은 로컬 설정 파일에는 device auth 비밀값을 저장하지 않는다.

## 연결 흐름

1. 브라우저가 Gateway WebSocket에 연결
2. `connect.challenge` 이벤트에서 `nonce` 수신
3. 브라우저가 `v2|deviceId|clientId|clientMode|role|scopes|signedAt|token|nonce` 형식 문자열에 서명
4. `connect` 요청에 `device.id`, `publicKey`, `signature`, `signedAt`, `nonce` 포함
5. 성공 시 반환된 `auth.deviceToken` 저장

## Pairing

새 브라우저나 새 브라우저 프로필은 pairing 승인이 필요할 수 있다.

PrettyClaw v1은 승인 UI를 직접 제공하지 않고, CLI 안내만 표시한다.

승인 예시:

```bash
openclaw devices list
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

승인 후 PrettyClaw에서 다시 연결하면 된다.

## 문제 해결

### `device identity required`

- `http://localhost:3000` 또는 `http://127.0.0.1:3000`에서 연다
- 브라우저가 secure context가 아니면 WebCrypto 기반 device identity를 만들 수 없다

### `pairing required`

- 브라우저 device는 생성됐지만 아직 Gateway 호스트에서 승인되지 않은 상태
- `openclaw devices approve`, `openclaw devices approve <requestId>`, `openclaw devices approve --latest` 중 하나로 승인

### `AUTH_DEVICE_TOKEN_MISMATCH`

- 저장된 device token이 더 이상 유효하지 않은 상태
- PrettyClaw는 저장된 role token을 지우고 다시 연결을 시도한다

## 관련 구현

- `src/lib/gateway-device-auth.ts`
- `src/lib/gateway-client.ts`
- `src/stores/useAppStore.ts`
- `src/components/SettingsPanel.tsx`
