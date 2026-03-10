/**
 * OpenClaw Gateway WebSocket client for Control UI mode.
 *
 * Uses browser-scoped device identity + challenge signing.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  GatewayRequest,
  GatewayResponse,
  GatewayEvent,
  GatewayMessage,
  GatewaySettings,
  GatewayConnectPayload,
  GatewayConnectionIssue,
} from "@/types";
import {
  canUseDeviceIdentity,
  clearStoredDeviceToken,
  createConnectSignaturePayload,
  getStoredDeviceToken,
  loadOrCreateDeviceIdentity,
  setStoredDeviceToken,
  signConnectPayload,
} from "@/lib/gateway-device-auth";

const PROTOCOL_VERSION = 3;
const CLIENT_ID = "openclaw-control-ui";
const CLIENT_MODE = "webchat";
const CLIENT_VERSION = "1.0.0";
const CONNECT_TIMEOUT_MS = 10000;
const CONNECT_DELAY_MS = 750;
const CONNECT_CLOSE_CODE = 4008;
const RECONNECT_DELAY_MS = 3000;
const OPERATOR_ROLE = "operator";
const OPERATOR_SCOPES = ["operator.admin", "operator.approvals", "operator.pairing"];
const FATAL_CONNECT_ERROR_CODES = new Set([
  "AUTH_DEVICE_TOKEN_MISMATCH",
  "AUTH_RATE_LIMITED",
  "AUTH_TOKEN_MISMATCH",
  "AUTH_UNAUTHORIZED",
  "CONTROL_UI_DEVICE_IDENTITY_REQUIRED",
  "DEVICE_IDENTITY_REQUIRED",
  "PAIRING_REQUIRED",
]);

type EventHandler = (event: GatewayEvent) => void;
type ConnectionHandler = (connected: boolean) => void;
type ConnectionErrorHandler = (issue: GatewayConnectionIssue) => void;

interface PendingRequest {
  resolve: (payload: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private settings: GatewaySettings;
  private pendingRequests = new Map<string, PendingRequest>();
  private eventHandlers = new Set<EventHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private connectionErrorHandlers = new Set<ConnectionErrorHandler>();
  private _connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private connectNonce: string | null = null;
  private connectSent = false;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingConnectError: GatewayConnectionIssue | null = null;

  constructor(settings: GatewaySettings) {
    this.settings = settings;
  }

  get connected() {
    return this._connected;
  }

  updateSettings(settings: GatewaySettings) {
    this.settings = settings;
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onConnectionError(handler: ConnectionErrorHandler): () => void {
    this.connectionErrorHandlers.add(handler);
    return () => this.connectionErrorHandlers.delete(handler);
  }

  connect(): void {
    this.shouldReconnect = true;
    this._connect();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingConnectError = null;
    this.connectNonce = null;
    this.connectSent = false;
    this._setConnected(false);
  }

  /** Send an RPC request and await the response payload. */
  async call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to gateway");
    }

    const id = uuidv4();
    const request: GatewayRequest = { type: "req", id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Gateway request timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.ws!.send(JSON.stringify(request));
    });
  }

  /** Send a chat message to a session. */
  async sendMessage(sessionKey: string, message: string): Promise<unknown> {
    return this.call("chat.send", {
      sessionKey,
      message,
      deliver: false,
      idempotencyKey: uuidv4(),
    });
  }

  /** Get chat history for a session. */
  async getChatHistory(sessionKey: string, limit?: number): Promise<unknown> {
    const params: Record<string, unknown> = { sessionKey };
    if (limit !== undefined) params.limit = limit;
    return this.call("chat.history", params);
  }

  /** List available agents. */
  async listAgents(): Promise<unknown> {
    return this.call("agents.list");
  }

  /** List sessions. */
  async listSessions(): Promise<unknown> {
    return this.call("sessions.list");
  }

  /** Ensure a session exists. */
  async ensureSession(sessionKey: string, label?: string): Promise<unknown> {
    const params: Record<string, unknown> = { key: sessionKey };
    if (label) params.label = label;
    return this.call("sessions.patch", params);
  }

  /** Abort an in-progress chat. */
  async abortChat(sessionKey: string): Promise<unknown> {
    return this.call("chat.abort", { sessionKey });
  }

  /** Reset a session (creates a new conversation). */
  async resetSession(sessionKey: string, reason: string = "new"): Promise<unknown> {
    return this.call("sessions.reset", { key: sessionKey, reason });
  }

  /** Delete a session. */
  async deleteSession(sessionKey: string): Promise<unknown> {
    return this.call("sessions.delete", { key: sessionKey, deleteTranscript: true });
  }

  /** Set a file on an agent (overwrites workspace file via API). */
  async setAgentFile(agentId: string, name: string, content: string): Promise<unknown> {
    return this.call("agents.files.set", { agentId, name, content });
  }

  // --- Private ---

  private _connect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    this.pendingConnectError = null;
    this.connectNonce = null;
    this.connectSent = false;

    const url = this.settings.token
      ? `${this.settings.url}?token=${encodeURIComponent(this.settings.token)}`
      : this.settings.url;

    this.ws = new WebSocket(url);
    this._setConnected(false);

    this.ws.onopen = () => {
      this._queueConnect();
    };

    this.ws.onmessage = (event) => {
      this._handleMessage(event.data);
    };

    this.ws.onclose = () => {
      if (this.connectTimer) {
        clearTimeout(this.connectTimer);
        this.connectTimer = null;
      }
      this._setConnected(false);
      this._rejectAllPending("Connection closed");
      if (this.shouldReconnect && this._shouldReconnect()) {
        this.reconnectTimer = setTimeout(() => this._connect(), RECONNECT_DELAY_MS);
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  private _handleMessage(raw: string): void {
    let data: GatewayMessage;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    // Handle connect challenge
    if (data.type === "event" && (data as GatewayEvent).event === "connect.challenge") {
      const nonce = ((data as GatewayEvent).payload as { nonce?: string })?.nonce ?? null;
      this.connectNonce = nonce;
      void this._sendConnect();
      return;
    }

    // Handle response
    if (data.type === "res") {
      const res = data as GatewayResponse;
      const pending = this.pendingRequests.get(res.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(res.id);
        if (res.ok) {
          pending.resolve(res.payload);
        } else {
          pending.reject(this._toGatewayError(res));
        }
      }
      return;
    }

    // Handle events
    if (data.type === "event") {
      const evt = data as GatewayEvent;
      for (const handler of this.eventHandlers) {
        try {
          handler(evt);
        } catch (e) {
          console.error("Event handler error:", e);
        }
      }
    }
  }

  private async _sendConnect(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.connectSent) return;

    this.connectSent = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    const connectId = uuidv4();
    const explicitToken = this.settings.token.trim() || undefined;
    const canUseDevice = canUseDeviceIdentity();
    let identity: Awaited<ReturnType<typeof loadOrCreateDeviceIdentity>> | null = null;
    let authToken = explicitToken;
    let usedStoredDeviceToken = false;

    let params: Record<string, unknown>;
    try {
      if (canUseDevice) {
        identity = await loadOrCreateDeviceIdentity();
        if (!authToken) {
          const storedToken = getStoredDeviceToken(identity.deviceId, OPERATOR_ROLE);
          if (storedToken?.token) {
            authToken = storedToken.token;
            usedStoredDeviceToken = true;
          }
        }
      }

      params = {
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        role: OPERATOR_ROLE,
        scopes: OPERATOR_SCOPES,
        client: {
          id: CLIENT_ID,
          version: CLIENT_VERSION,
          platform: navigator.platform || "web",
          mode: CLIENT_MODE,
        },
        caps: ["tool-events"],
        userAgent: navigator.userAgent,
        locale: navigator.language,
      };

      if (authToken) {
        params.auth = { token: authToken };
      }

      if (canUseDevice && identity) {
        const signedAt = Date.now();
        const nonce = this.connectNonce ?? "";
        const signaturePayload = createConnectSignaturePayload({
          deviceId: identity.deviceId,
          clientId: CLIENT_ID,
          clientMode: CLIENT_MODE,
          role: OPERATOR_ROLE,
          scopes: OPERATOR_SCOPES,
          signedAtMs: signedAt,
          token: authToken ?? null,
          nonce,
        });
        const signature = await signConnectPayload(identity.privateKey, signaturePayload);
        params.device = {
          id: identity.deviceId,
          publicKey: identity.publicKey,
          signature,
          signedAt,
          nonce,
        };
      }
    } catch (error) {
      const issue = this._toConnectionIssue(error, "DEVICE_IDENTITY_INIT_FAILED");
      this.pendingConnectError = issue;
      this._emitConnectionError(issue);
      this.ws.close(CONNECT_CLOSE_CODE, "connect failed");
      return;
    }

    const request: GatewayRequest = {
      type: "req",
      id: connectId,
      method: "connect",
      params,
    };

    // Set up the connect response handler
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(connectId);
      const issue: GatewayConnectionIssue = {
        code: "GATEWAY_CONNECT_TIMEOUT",
        message: "Gateway connect timeout",
      };
      this.pendingConnectError = issue;
      this._emitConnectionError(issue);
      this.ws?.close(CONNECT_CLOSE_CODE, "connect timeout");
    }, CONNECT_TIMEOUT_MS);

    this.pendingRequests.set(connectId, {
      resolve: (payload) => {
        const connectPayload = payload as GatewayConnectPayload | undefined;
        if (identity && connectPayload?.auth?.deviceToken) {
          setStoredDeviceToken(
            identity.deviceId,
            connectPayload.auth.role ?? OPERATOR_ROLE,
            connectPayload.auth.deviceToken,
            connectPayload.auth.scopes ?? OPERATOR_SCOPES,
          );
        }
        this.pendingConnectError = null;
        this._setConnected(true);
      },
      reject: (err) => {
        if (usedStoredDeviceToken && identity) {
          clearStoredDeviceToken(identity.deviceId, OPERATOR_ROLE);
        }
        const issue = this._toConnectionIssue(err);
        this.pendingConnectError = issue;
        this._emitConnectionError(issue);
        this._setConnected(false);
        this.ws?.close(CONNECT_CLOSE_CODE, "connect failed");
      },
      timeout,
    });

    this.ws.send(JSON.stringify(request));
  }

  private _queueConnect(): void {
    this.connectNonce = null;
    this.connectSent = false;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
    }
    this.connectTimer = setTimeout(() => {
      void this._sendConnect();
    }, CONNECT_DELAY_MS);
  }

  private _setConnected(connected: boolean): void {
    if (this._connected === connected) return;
    this._connected = connected;
    for (const handler of this.connectionHandlers) {
      handler(connected);
    }
  }

  private _emitConnectionError(issue: GatewayConnectionIssue): void {
    for (const handler of this.connectionErrorHandlers) {
      handler(issue);
    }
  }

  private _toGatewayError(response: GatewayResponse): Error {
    const error = new Error(response.error?.message || "Gateway error") as Error & {
      code?: string;
      details?: GatewayConnectionIssue["details"];
    };
    error.code = response.error?.details?.code || response.error?.code;
    error.details = response.error?.details;
    return error;
  }

  private _toConnectionIssue(error: unknown, fallbackCode?: string): GatewayConnectionIssue {
    if (error instanceof Error) {
      const gatewayError = error as Error & { code?: string; details?: GatewayConnectionIssue["details"] };
      return {
        code: gatewayError.details?.code || gatewayError.code || fallbackCode || null,
        message: gatewayError.message,
        details: gatewayError.details,
      };
    }

    return {
      code: fallbackCode || null,
      message: String(error),
    };
  }

  private _shouldReconnect(): boolean {
    if (!this.pendingConnectError?.code) return true;
    return !FATAL_CONNECT_ERROR_CODES.has(this.pendingConnectError.code);
  }

  private _rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
      this.pendingRequests.delete(id);
    }
  }
}
