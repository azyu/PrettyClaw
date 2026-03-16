import type { ConnectionStatus, GatewayConnectionIssue, PairingState } from "@/types";

type Translate = (key: string) => string;

export function getConnectionStatusLabel(
  status: ConnectionStatus,
  pairingState: PairingState,
  t: Translate,
) {
  if (pairingState === "required") return t("gateway.status.pairingRequired");
  if (status === "connected") return t("gateway.status.connected");
  if (status === "connecting") return t("gateway.status.connecting");
  if (status === "error") return t("gateway.status.error");
  return t("gateway.status.disconnected");
}

export function getConnectionIssueCopy(issue: GatewayConnectionIssue | null, t: Translate) {
  if (!issue) return null;

  switch (issue.code) {
    case "PAIRING_REQUIRED":
      return {
        title: t("gateway.issues.pairingRequiredTitle"),
        description: t("gateway.issues.pairingRequiredDescription"),
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
        title: t("gateway.issues.deviceIdentityTitle"),
        description: t("gateway.issues.deviceIdentityDescription"),
        commands: [],
      };
    case "AUTH_TOKEN_MISMATCH":
    case "AUTH_UNAUTHORIZED":
      return {
        title: t("gateway.issues.authTitle"),
        description: t("gateway.issues.authDescription"),
        commands: [],
      };
    case "AUTH_DEVICE_TOKEN_MISMATCH":
      return {
        title: t("gateway.issues.deviceTokenTitle"),
        description: t("gateway.issues.deviceTokenDescription"),
        commands: [],
      };
    default:
      return {
        title: t("gateway.issues.genericTitle"),
        description: issue.message,
        commands: [],
      };
  }
}
