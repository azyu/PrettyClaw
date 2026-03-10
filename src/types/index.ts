/** Character definition — maps a VN character to an OpenClaw agent/session */
export interface SpriteRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteOverlayPart {
  rect: SpriteRect;
  frames: string[];
}

export interface CharacterSpriteMeta {
  sourceWidth: number;
  sourceHeight: number;
  eyes?: SpriteOverlayPart;
  mouth?: SpriteOverlayPart;
}

export interface CharacterConfig {
  id: string;
  displayName: string;
  agentId: string;
  /** Session key used with the gateway. Auto-generated if not set. */
  sessionKey: string;
  avatar: string;
  sprite: string;
  background: string;
  theme: {
    accent: string;
    nameColor: string;
  };
  /** Sprite display scale (default: 1) */
  spriteScale?: number;
  /** Optional eye/mouth overlay metadata in source-image pixels */
  spriteMeta?: CharacterSpriteMeta;
  /** Short description shown in sidebar */
  description?: string;
  personaPrompt: string;
}

/** Gateway connection settings */
export interface GatewaySettings {
  url: string;
  token: string;
}

export interface GatewayErrorDetails {
  code?: string;
  [key: string]: unknown;
}

export interface GatewayErrorPayload {
  code?: string;
  message: string;
  details?: GatewayErrorDetails;
}

export interface GatewayConnectionIssue {
  code: string | null;
  message: string;
  details?: GatewayErrorDetails;
}

export interface GatewayConnectAuthPayload {
  deviceToken?: string;
  role?: string;
  scopes?: string[];
}

export interface GatewayConnectPayload {
  auth?: GatewayConnectAuthPayload;
  [key: string]: unknown;
}

export interface StoredDeviceIdentity {
  version: 1;
  deviceId: string;
  publicKey: string;
  privateKey: string;
  createdAtMs: number;
}

export interface StoredDeviceToken {
  token: string;
  role: string;
  scopes: string[];
  updatedAtMs: number;
}

export interface StoredDeviceAuth {
  version: 1;
  deviceId: string;
  tokens: Record<string, StoredDeviceToken>;
}

export type PairingState = "idle" | "required" | "approved";

/** A single chat message */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  characterId?: string;
}

/** Gateway WS request envelope */
export interface GatewayRequest {
  type: "req";
  id: string;
  method: string;
  params: Record<string, unknown>;
}

/** Gateway WS response envelope */
export interface GatewayResponse {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: GatewayErrorPayload;
}

/** Gateway WS event envelope */
export interface GatewayEvent {
  type: "event";
  event: string;
  payload?: unknown;
}

export type GatewayMessage = GatewayResponse | GatewayEvent | { type: string; [key: string]: unknown };

/** Connection state */
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
