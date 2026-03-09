/**
 * OpenClaw Gateway WebSocket client for Control UI mode.
 *
 * Protocol reference: gateway_rpc.py from openclaw-mission-control.
 * Uses Control UI mode (disable_device_pairing) — no device keys needed.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  GatewayRequest,
  GatewayResponse,
  GatewayEvent,
  GatewayMessage,
  GatewaySettings,
} from "@/types";

const PROTOCOL_VERSION = 3;
const CLIENT_ID = "openclaw-control-ui";
const CLIENT_MODE = "ui";
const CLIENT_VERSION = "1.0.0";

type EventHandler = (event: GatewayEvent) => void;
type ConnectionHandler = (connected: boolean) => void;

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
  private _connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
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

    const url = this.settings.token
      ? `${this.settings.url}?token=${encodeURIComponent(this.settings.token)}`
      : this.settings.url;

    this.ws = new WebSocket(url);
    this._setConnected(false);

    this.ws.onopen = () => {
      // Wait for connect.challenge event or send connect directly
    };

    this.ws.onmessage = (event) => {
      this._handleMessage(event.data);
    };

    this.ws.onclose = () => {
      this._setConnected(false);
      this._rejectAllPending("Connection closed");
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this._connect(), 3000);
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };

    // If no challenge arrives within 2s, send connect anyway
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && !this._connected) {
        this._sendConnect(null);
      }
    }, 2000);
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
      this._sendConnect(nonce);
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
          pending.reject(new Error(res.error?.message || "Gateway error"));
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

  private _sendConnect(nonce: string | null): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const connectId = uuidv4();
    const params: Record<string, unknown> = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      role: "operator",
      scopes: ["operator.read", "operator.admin", "operator.approvals", "operator.pairing"],
      client: {
        id: CLIENT_ID,
        version: CLIENT_VERSION,
        platform: "browser",
        mode: CLIENT_MODE,
      },
    };

    if (this.settings.token) {
      params.auth = { token: this.settings.token };
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
      console.error("Gateway connect timeout");
    }, 10000);

    this.pendingRequests.set(connectId, {
      resolve: () => {
        this._setConnected(true);
      },
      reject: (err) => {
        console.error("Gateway connect failed:", err);
        this._setConnected(false);
      },
      timeout,
    });

    this.ws.send(JSON.stringify(request));
  }

  private _setConnected(connected: boolean): void {
    if (this._connected === connected) return;
    this._connected = connected;
    for (const handler of this.connectionHandlers) {
      handler(connected);
    }
  }

  private _rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
      this.pendingRequests.delete(id);
    }
  }
}
