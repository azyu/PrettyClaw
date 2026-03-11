import type { ConnectionStatus, GatewayConnectionIssue, PairingState } from "@/types";

export function getConnectionStatusLabel(status: ConnectionStatus, pairingState: PairingState) {
  if (pairingState === "required") return "승인 필요";
  if (status === "connected") return "연결됨";
  if (status === "connecting") return "연결 중…";
  if (status === "error") return "연결 오류";
  return "연결 안 됨";
}

export function getConnectionIssueCopy(issue: GatewayConnectionIssue | null) {
  if (!issue) return null;

  switch (issue.code) {
    case "PAIRING_REQUIRED":
      return {
        title: "브라우저 기기 승인이 필요합니다",
        description: "Gateway 호스트에서 이 브라우저를 승인한 뒤 다시 연결하세요.",
        commands: [
          "openclaw devices list",
          "openclaw devices approve",
          "openclaw devices approve <requestId>",
          "openclaw devices approve --latest",
        ],
      };
    case "CONTROL_UI_DEVICE_IDENTITY_REQUIRED":
    case "DEVICE_IDENTITY_REQUIRED":
      return {
        title: "브라우저 기기 인증을 만들 수 없습니다",
        description: "`http://localhost:3000` 또는 `http://127.0.0.1:3000`에서 열고 다시 연결하세요.",
        commands: [],
      };
    case "AUTH_TOKEN_MISMATCH":
    case "AUTH_UNAUTHORIZED":
      return {
        title: "Gateway 인증에 실패했습니다",
        description: "Gateway URL과 token 값을 다시 확인하세요.",
        commands: [],
      };
    case "AUTH_DEVICE_TOKEN_MISMATCH":
      return {
        title: "저장된 기기 토큰이 유효하지 않습니다",
        description: "저장된 device token을 비우고 다시 연결합니다. 같은 에러가 반복되면 Gateway token을 다시 입력하세요.",
        commands: [],
      };
    default:
      return {
        title: "Gateway 연결 오류",
        description: issue.message,
        commands: [],
      };
  }
}
