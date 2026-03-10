import { create } from "zustand";
import type {
  CharacterConfig,
  ChatMessage,
  ConnectionStatus,
  GatewaySettings,
  GatewayEvent,
} from "@/types";
import { GatewayClient } from "@/lib/gateway-client";
import { DEFAULT_CHARACTERS } from "@/lib/characters";
import { v4 as uuidv4 } from "uuid";

/** Per-character streaming state */
interface StreamState {
  text: string;
  streaming: boolean;
  thinking: string;
  toolName: string;
  toolPhase: "idle" | "running" | "done";
}

/** Session entry from Gateway */
export interface SessionEntry {
  key: string;
  label?: string;
  displayName?: string;
  updatedAt?: number;
  sessionId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
}

interface AppState {
  // Connection
  gatewaySettings: GatewaySettings;
  connectionStatus: ConnectionStatus;
  gatewayClient: GatewayClient | null;

  // Characters
  characters: CharacterConfig[];
  activeCharacterId: string | null;

  // Sessions — maps characterId → current active session key
  activeSessionKeys: Map<string, string>;

  // Chat — keyed by sessionKey (not characterId) to support multiple sessions
  messages: Map<string, ChatMessage[]>;
  streamStates: Map<string, StreamState>;
  historyLoaded: Set<string>;
  personaSent: Set<string>;

  // Session history
  characterSessions: SessionEntry[];
  showSessionHistory: boolean;

  // Model info
  lastModel: string;

  // UI
  showSettings: boolean;
  showLog: boolean;

  // Actions
  setGatewaySettings: (settings: GatewaySettings) => void;
  connect: () => void;
  disconnect: () => void;
  selectCharacter: (characterId: string) => void;
  sendMessage: (text: string) => void;
  abortMessage: () => void;
  toggleSettings: () => void;
  toggleLog: () => void;
  toggleSessionHistory: () => void;
  setCharacters: (characters: CharacterConfig[]) => void;
  loadCharacters: () => Promise<void>;
  bootstrapAgents: () => Promise<void>;
  loadAgents: () => Promise<void>;
  loadHistory: (sessionKey: string, characterId: string) => Promise<void>;
  ensureSession: (characterId: string) => Promise<void>;
  newChat: () => Promise<void>;
  loadCharacterSessions: () => Promise<void>;
  switchToSession: (sessionKey: string) => Promise<void>;
  deleteCharacterSession: (sessionKey: string) => Promise<void>;
}

const LS_SESSION_PREFIX = "prettyclaw-session-";

function saveLastSession(characterId: string, sessionKey: string) {
  try { localStorage.setItem(`${LS_SESSION_PREFIX}${characterId}`, sessionKey); } catch {}
}

function loadLastSession(characterId: string): string | null {
  try { return localStorage.getItem(`${LS_SESSION_PREFIX}${characterId}`); } catch { return null; }
}

/** No-op: personas are now handled by dedicated Gateway agents with their own workspaces */
async function pushActivePersona(_get: () => AppState) {
  // Each character maps to a dedicated Gateway agent (e.g., prettyclaw-yuki)
  // with its own workspace containing IDENTITY.md, SOUL.md, USER.md.
  // The main workspace is kept minimal to avoid persona leaking.
}

/** Get the active session key for a character (local state key) */
function getActiveSessionKey(state: AppState, characterId: string): string {
  const custom = state.activeSessionKeys.get(characterId);
  if (custom) return custom;
  // Check localStorage for last used session
  const saved = loadLastSession(characterId);
  if (saved) return saved;
  const char = state.characters.find((c) => c.id === characterId);
  return char?.sessionKey || `prettyclaw-${characterId}`;
}

/** Convert a local session key to Gateway format: agent:<agentId>:<sessionKey> */
function toGatewaySessionKey(state: AppState, characterId: string, localKey: string): string {
  const char = state.characters.find((c) => c.id === characterId);
  const agentId = char?.agentId || "main";
  // If already prefixed, return as-is
  if (localKey.startsWith("agent:")) return localKey;
  return `agent:${agentId}:${localKey}`;
}

const EMPTY_STREAM: StreamState = { text: "", streaming: false, thinking: "", toolName: "", toolPhase: "idle" };

function getStream(states: Map<string, StreamState>, id: string): StreamState {
  return states.get(id) || EMPTY_STREAM;
}

function setStream(
  states: Map<string, StreamState>,
  id: string,
  patch: Partial<StreamState>,
): Map<string, StreamState> {
  const next = new Map(states);
  next.set(id, { ...getStream(states, id), ...patch });
  return next;
}

export const useAppStore = create<AppState>((set, get) => ({
  gatewaySettings: {
    url: process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:18789",
    token: process.env.NEXT_PUBLIC_GATEWAY_TOKEN || "",
  },
  connectionStatus: "disconnected",
  gatewayClient: null,
  characters: DEFAULT_CHARACTERS,
  activeCharacterId: DEFAULT_CHARACTERS[0]?.id ?? null,
  activeSessionKeys: new Map(),
  messages: new Map(),
  streamStates: new Map(),
  historyLoaded: new Set(),
  personaSent: new Set(),
  lastModel: "",
  characterSessions: [],
  showSessionHistory: false,
  showSettings: false,
  showLog: false,

  setGatewaySettings: (settings) => {
    set({ gatewaySettings: settings });
    const client = get().gatewayClient;
    if (client) client.updateSettings(settings);
  },

  connect: () => {
    const { gatewaySettings, gatewayClient: existingClient } = get();
    if (existingClient) existingClient.disconnect();

    // Restore saved session keys from localStorage
    const restoredKeys = new Map(get().activeSessionKeys);
    for (const char of get().characters) {
      if (!restoredKeys.has(char.id)) {
        const saved = loadLastSession(char.id);
        if (saved) restoredKeys.set(char.id, saved);
      }
    }
    set({ activeSessionKeys: restoredKeys });

    const client = new GatewayClient(gatewaySettings);

    client.onConnection(async (connected) => {
      set({ connectionStatus: connected ? "connected" : "disconnected" });
      if (connected) {
        // Push active character's persona to Gateway agent
        try {
          await pushActivePersona(get);
        } catch (e) {
          console.warn("Failed to push persona:", e);
        }
        const activeId = get().activeCharacterId;
        if (activeId) {
          try {
            await get().ensureSession(activeId);
            const sk = getActiveSessionKey(get(), activeId);
            await get().loadHistory(sk, activeId);
            await get().loadCharacterSessions();
          } catch (e) {
            console.warn("Failed to init session:", e);
          }
        }
      }
    });

    client.onEvent((event: GatewayEvent) => {
      handleGatewayEvent(event, get, set);
    });

    set({ gatewayClient: client, connectionStatus: "connecting" });
    client.connect();
  },

  disconnect: () => {
    const { gatewayClient } = get();
    if (gatewayClient) gatewayClient.disconnect();
    set({ connectionStatus: "disconnected", gatewayClient: null, historyLoaded: new Set() });
  },

  selectCharacter: async (characterId) => {
    const prev = get().activeCharacterId;
    if (prev === characterId) return;

    set({ activeCharacterId: characterId });

    if (get().connectionStatus === "connected") {
      try {
        // Push new character's persona to Gateway agent
        await pushActivePersona(get);
        await get().ensureSession(characterId);
        const sk = getActiveSessionKey(get(), characterId);
        await get().loadHistory(sk, characterId);
      } catch (e) {
        console.warn("Failed to switch character session:", e);
      }
    }
  },

  sendMessage: async (text) => {
    const { gatewayClient, activeCharacterId, characters, messages, connectionStatus, personaSent, streamStates } = get();
    if (!gatewayClient || connectionStatus !== "connected" || !activeCharacterId) return;

    const character = characters.find((c) => c.id === activeCharacterId);
    if (!character) return;

    const sessionKey = getActiveSessionKey(get(), activeCharacterId);
    saveLastSession(activeCharacterId, sessionKey);

    if (getStream(streamStates, sessionKey).streaming) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: text,
      timestamp: Date.now(),
      characterId: activeCharacterId,
    };

    const charMessages = new Map(messages);
    const existing = charMessages.get(sessionKey) || [];
    charMessages.set(sessionKey, [...existing, userMsg]);
    set({
      messages: charMessages,
      streamStates: setStream(streamStates, sessionKey, { streaming: true, text: "" }),
    });

    try {
      const gwKey = toGatewaySessionKey(get(), activeCharacterId, sessionKey);
      await gatewayClient.sendMessage(gwKey, text);
    } catch (err) {
      console.error("Failed to send message:", err);
      set({ streamStates: setStream(get().streamStates, sessionKey, { streaming: false }) });
    }
  },

  abortMessage: async () => {
    const { gatewayClient, activeCharacterId, streamStates, messages } = get();
    if (!gatewayClient || !activeCharacterId) return;

    const sessionKey = getActiveSessionKey(get(), activeCharacterId);
    const stream = getStream(streamStates, sessionKey);
    if (!stream.streaming) return;

    try {
      const gwKey = toGatewaySessionKey(get(), activeCharacterId, sessionKey);
      await gatewayClient.abortChat(gwKey);
    } catch {}

    if (stream.text) {
      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: stream.text + " [interrupted]",
        timestamp: Date.now(),
        characterId: activeCharacterId,
      };
      const charMessages = new Map(messages);
      const existing = charMessages.get(sessionKey) || [];
      charMessages.set(sessionKey, [...existing, assistantMsg]);
      set({ messages: charMessages });
    }
    set({ streamStates: setStream(get().streamStates, sessionKey, { streaming: false, text: "" }) });
  },

  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  toggleLog: () => set((s) => ({ showLog: !s.showLog })),
  toggleSessionHistory: () => set((s) => ({ showSessionHistory: !s.showSessionHistory })),

  setCharacters: (characters) => set({ characters }),

  loadCharacters: async () => {
    try {
      const res = await fetch("/api/characters");
      if (!res.ok) return;
      const data = await res.json();
      if (data.characters && Array.isArray(data.characters)) {
        set({ characters: data.characters });
        const { activeCharacterId } = get();
        if (!activeCharacterId || !data.characters.find((c: CharacterConfig) => c.id === activeCharacterId)) {
          set({ activeCharacterId: data.characters[0]?.id ?? null });
        }
        console.log(`Loaded ${data.characters.length} characters from ${data.source}`);
      }
    } catch (e) {
      console.warn("Failed to load characters:", e);
    }
  },

  bootstrapAgents: async () => {
    try {
      const res = await fetch("/api/bootstrap-agents", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        console.warn("Failed to bootstrap OpenClaw agents:", data?.error || res.statusText);
        return;
      }
      if (typeof data?.waitMs === "number" && data.waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, data.waitMs));
      }
      if (Array.isArray(data?.created) && data.created.length > 0) {
        console.warn(`Bootstrapped ${data.created.length} OpenClaw agents`);
      }
    } catch (e) {
      console.warn("Failed to bootstrap OpenClaw agents:", e);
    }
  },

  loadAgents: async () => {
    const { gatewayClient, characters } = get();
    if (!gatewayClient) return;

    try {
      const result = await gatewayClient.listAgents() as { agents?: Array<{ id: string; name?: string }> } | undefined;
      const agents = result?.agents;
      if (!agents || !Array.isArray(agents)) return;

      const updated = characters.map((char, i) => {
        const matched = agents.find((a) => a.id === char.agentId) || agents[i];
        if (matched) return { ...char, agentId: matched.id };
        return char;
      });
      set({ characters: updated });
      console.log(`Loaded ${agents.length} agents from gateway`);
    } catch (e) {
      console.warn("agents.list failed:", e);
    }
  },

  loadHistory: async (sessionKey, characterId) => {
    const { gatewayClient, historyLoaded, messages } = get();
    if (!gatewayClient || historyLoaded.has(sessionKey)) return;

    try {
      const gwKey = toGatewaySessionKey(get(), characterId, sessionKey);
      const result = await gatewayClient.getChatHistory(gwKey, 50) as {
        messages?: Array<{ role: string; content: string; timestamp?: number }>;
      } | undefined;

      const history = result?.messages;
      if (!history || !Array.isArray(history)) {
        set({ historyLoaded: new Set([...historyLoaded, sessionKey]) });
        return;
      }

      const chatMessages: ChatMessage[] = history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: uuidv4(),
          role: m.role as "user" | "assistant",
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          timestamp: m.timestamp || Date.now(),
          characterId,
        }));

      const charMessages = new Map(messages);
      const existing = charMessages.get(sessionKey) || [];
      if (existing.length === 0 && chatMessages.length > 0) {
        charMessages.set(sessionKey, chatMessages);
        set({ messages: charMessages });
      }
      if (chatMessages.length > 0) {
        const { personaSent } = get();
        set({ personaSent: new Set([...personaSent, sessionKey]) });
      }
      set({ historyLoaded: new Set([...historyLoaded, sessionKey]) });
    } catch (e) {
      console.warn("chat.history failed:", e);
      set({ historyLoaded: new Set([...get().historyLoaded, sessionKey]) });
    }
  },

  ensureSession: async (characterId) => {
    const { gatewayClient, characters } = get();
    if (!gatewayClient) return;

    const character = characters.find((c) => c.id === characterId);
    if (!character) return;

    const sessionKey = getActiveSessionKey(get(), characterId);
    const gwKey = toGatewaySessionKey(get(), characterId, sessionKey);

    try {
      await gatewayClient.ensureSession(gwKey);
    } catch (e) {
      console.warn("sessions.patch failed:", e);
    }
  },

  newChat: async () => {
    const { gatewayClient, activeCharacterId, characters, connectionStatus } = get();
    if (!gatewayClient || connectionStatus !== "connected" || !activeCharacterId) return;

    const character = characters.find((c) => c.id === activeCharacterId);
    if (!character) return;

    // Generate a new session key with timestamp
    const newKey = `${character.sessionKey}-${Math.floor(Date.now() / 1000)}`;

    // Update active session key for this character
    const keys = new Map(get().activeSessionKeys);
    keys.set(activeCharacterId, newKey);
    saveLastSession(activeCharacterId, newKey);
    set({ activeSessionKeys: keys });

    // Ensure the new session exists on Gateway
    try {
      const gwKey = toGatewaySessionKey(get(), activeCharacterId, newKey);
      await gatewayClient.ensureSession(gwKey);
    } catch (e) {
      console.warn("Failed to create new session:", e);
    }
  },

  loadCharacterSessions: async () => {
    const { gatewayClient, activeCharacterId, characters, connectionStatus } = get();
    if (!gatewayClient || connectionStatus !== "connected" || !activeCharacterId) return;

    const character = characters.find((c) => c.id === activeCharacterId);
    if (!character) return;

    try {
      const result = await gatewayClient.listSessions() as { sessions?: SessionEntry[] } | undefined;
      const allSessions = result?.sessions;
      if (!allSessions || !Array.isArray(allSessions)) {
        set({ characterSessions: [] });
        return;
      }

      // Filter sessions that belong to this character
      // Gateway keys look like: agent:{agentId}:{sessionKey}
      // Match by the base sessionKey prefix
      const baseKey = character.sessionKey;
      const filtered = allSessions.filter((s) => {
        const key = s.key || "";
        // Match: ends with the base key or base key + suffix
        return key.includes(baseKey);
      }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      // Also extract model from the most recent session
      const model = filtered.find((s) => s.model)?.model;
      set({ characterSessions: filtered, ...(model ? { lastModel: model } : {}) });
    } catch (e) {
      console.warn("Failed to load sessions:", e);
      set({ characterSessions: [] });
    }
  },

  switchToSession: async (sessionKey: string) => {
    const { activeCharacterId } = get();
    if (!activeCharacterId) return;

    // Extract the raw session key from the gateway key format
    // Gateway format: agent:{agentId}:{rawKey}
    const parts = sessionKey.split(":");
    const rawKey = parts.length >= 3 ? parts.slice(2).join(":") : sessionKey;

    const keys = new Map(get().activeSessionKeys);
    keys.set(activeCharacterId, rawKey);
    saveLastSession(activeCharacterId, rawKey);
    set({ activeSessionKeys: keys, showSessionHistory: false });

    // Load history for this session
    await get().loadHistory(rawKey, activeCharacterId);
  },

  deleteCharacterSession: async (sessionKey: string) => {
    const { gatewayClient, activeCharacterId } = get();
    if (!gatewayClient || !activeCharacterId) return;

    // Send the key as-is to Gateway (it comes from sessions.list already in gateway format)
    try {
      await gatewayClient.deleteSession(sessionKey);
    } catch (e) {
      console.warn("Failed to delete session:", e);
    }

    // Extract raw key for local state cleanup
    const parts = sessionKey.split(":");
    const rawKey = parts.length >= 3 ? parts.slice(2).join(":") : sessionKey;

    // Clean up local state
    const { messages, historyLoaded, streamStates } = get();
    const newMessages = new Map(messages);
    newMessages.delete(rawKey);
    const newLoaded = new Set(historyLoaded);
    newLoaded.delete(rawKey);
    const newStreams = new Map(streamStates);
    newStreams.delete(rawKey);
    set({ messages: newMessages, historyLoaded: newLoaded, streamStates: newStreams });

    // If the deleted session was active, switch to base session
    const currentKey = getActiveSessionKey(get(), activeCharacterId);
    if (currentKey === rawKey) {
      const character = get().characters.find((c) => c.id === activeCharacterId);
      if (character) {
        const keys = new Map(get().activeSessionKeys);
        keys.delete(activeCharacterId);
        set({ activeSessionKeys: keys });
      }
    }

    // Refresh session list
    await get().loadCharacterSessions();
  },
}));

/** Resolve event sessionKey to local targetSessionKey + characterId */
function resolveEventTarget(
  eventSessionKey: string | undefined,
  get: () => AppState,
): { targetSessionKey: string; targetCharId: string } | null {
  if (eventSessionKey) {
    // Try active session keys first
    for (const [charId, sk] of get().activeSessionKeys) {
      if (eventSessionKey === sk || eventSessionKey.endsWith(`:${sk}`)) {
        return { targetSessionKey: sk, targetCharId: charId };
      }
    }
    // Try default character session keys
    for (const char of get().characters) {
      if (eventSessionKey === char.sessionKey || eventSessionKey.endsWith(`:${char.sessionKey}`)) {
        return { targetSessionKey: getActiveSessionKey(get(), char.id), targetCharId: char.id };
      }
    }
  }
  // Fallback to active character
  const charId = get().activeCharacterId;
  if (charId) {
    return { targetSessionKey: getActiveSessionKey(get(), charId), targetCharId: charId };
  }
  return null;
}

/** Handle incoming gateway events */
function handleGatewayEvent(
  event: GatewayEvent,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
) {
  const payload = event.payload as Record<string, unknown> | undefined;
  if (!payload) return;

  const target = resolveEventTarget(payload.sessionKey as string | undefined, get);
  if (!target) return;
  const { targetSessionKey, targetCharId } = target;

  console.log("[GW event]", event.event, JSON.stringify(payload).slice(0, 500));

  if (event.event === "chat") {
    handleChatEvent(payload, targetSessionKey, targetCharId, get, set);
  } else if (event.event === "agent") {
    handleAgentEvent(payload, targetSessionKey, get, set);
  }
}

/** Handle "chat" events — Gateway sends state: "delta" | "final" | "error" */
function handleChatEvent(
  payload: Record<string, unknown>,
  sessionKey: string,
  charId: string,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
) {
  const state = payload.state as string | undefined;
  const message = payload.message as { role?: string; content?: Array<{ type: string; text?: string }> } | undefined;

  if (state === "delta") {
    // Gateway sends full accumulated text on each delta, not incremental tokens
    let text = "";
    if (message?.content && Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === "text" && block.text) {
          text += block.text;
        }
      }
    }
    set({
      streamStates: setStream(get().streamStates, sessionKey, {
        text,
        streaming: true,
      }),
    });
  } else if (state === "final") {
    // Extract final text
    let finalText = "";
    if (message?.content && Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === "text" && block.text) {
          finalText += block.text;
        }
      }
    }
    // Fallback to whatever we accumulated
    if (!finalText) {
      finalText = getStream(get().streamStates, sessionKey).text;
    }

    if (finalText) {
      const { messages } = get();
      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: finalText,
        timestamp: Date.now(),
        characterId: charId,
      };
      const charMessages = new Map(messages);
      const existing = charMessages.get(sessionKey) || [];
      charMessages.set(sessionKey, [...existing, assistantMsg]);
      set({
        messages: charMessages,
        streamStates: setStream(get().streamStates, sessionKey, EMPTY_STREAM),
      });
    } else {
      set({ streamStates: setStream(get().streamStates, sessionKey, EMPTY_STREAM) });
    }

    // Try to fetch model info from session data
    const client = get().gatewayClient;
    if (client) {
      client.listSessions().then((result) => {
        const sessions = (result as { sessions?: SessionEntry[] })?.sessions;
        if (!sessions) return;
        // Find any session with a model field
        for (const s of sessions) {
          if (s.model) {
            set({ lastModel: s.model });
            break;
          }
        }
      }).catch(() => {});
    }
  } else if (state === "error") {
    console.error("Chat error:", payload);
    set({ streamStates: setStream(get().streamStates, sessionKey, EMPTY_STREAM) });
  }
}

/** Handle "agent" events — thinking, tool calls, lifecycle */
function handleAgentEvent(
  payload: Record<string, unknown>,
  sessionKey: string,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
) {
  const stream = payload.stream as string | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return;

  const { streamStates } = get();

  if (stream === "thinking") {
    // Thinking/reasoning text
    const text = (data.text || data.delta || "") as string;
    if (text) {
      set({
        streamStates: setStream(streamStates, sessionKey, {
          thinking: text,
          streaming: true,
        }),
      });
    }
  } else if (stream === "tool") {
    // Tool call info
    const name = (data.name || "") as string;
    const phase = (data.phase || "running") as string;
    set({
      streamStates: setStream(streamStates, sessionKey, {
        toolName: name || getStream(streamStates, sessionKey).toolName,
        toolPhase: phase === "done" ? "done" : "running",
        streaming: true,
      }),
    });
  } else if (stream === "lifecycle") {
    const phase = data.phase as string | undefined;
    if (phase === "start") {
      set({
        streamStates: setStream(streamStates, sessionKey, {
          streaming: true,
          thinking: "",
          toolName: "",
          toolPhase: "idle",
        }),
      });
    }
    // "end" lifecycle is handled by chat final event
  }
}
