"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { getConnectionIssueCopy } from "@/lib/gateway-connection";

function useActiveSessionKey() {
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const activeSessionKeys = useAppStore((s) => s.activeSessionKeys);
  const characters = useAppStore((s) => s.characters);

  if (!activeCharacterId) return null;
  const custom = activeSessionKeys.get(activeCharacterId);
  if (custom) return custom;
  return characters.find((c) => c.id === activeCharacterId)?.sessionKey || null;
}

export function PromptInput() {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const abortMessage = useAppStore((s) => s.abortMessage);
  const streamStates = useAppStore((s) => s.streamStates);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const connectionIssue = useAppStore((s) => s.connectionIssue);
  const pairingState = useAppStore((s) => s.pairingState);
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const characters = useAppStore((s) => s.characters);
  const toggleLog = useAppStore((s) => s.toggleLog);

  const sessionKey = useActiveSessionKey();
  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const isStreaming = sessionKey ? (streamStates.get(sessionKey)?.streaming ?? false) : false;
  const canSend = text.trim() && connectionStatus === "connected" && !isStreaming;
  const connectionCopy = getConnectionIssueCopy(connectionIssue);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeCharacterId]);

  const handleSubmit = () => {
    if (!canSend) return;
    sendMessage(text.trim());
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="relative z-10 w-full max-w-3xl mx-auto">
      <div
        className="flex items-end gap-2 px-4 py-3 rounded-b-xl"
        style={{
          background: "var(--color-dialogue-bg)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(122,162,255,0.15)",
          borderTop: "1px solid rgba(122,162,255,0.08)",
        }}
      >
        <button
          onClick={toggleLog}
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all"
          style={{ background: "rgba(122,162,255,0.08)", color: "var(--color-text-dim)" }}
          title="Chat log"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>

        <textarea
          ref={inputRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            pairingState === "required"
              ? "기기 승인 후 다시 연결하세요..."
              : connectionStatus !== "connected"
              ? connectionCopy?.title || "Gateway에 먼저 연결하세요..."
              : activeChar
              ? `${activeChar.displayName}에게 말을 걸어보세요...`
              : "캐릭터를 선택하세요..."
          }
          disabled={connectionStatus !== "connected"}
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-gray-500"
          style={{ color: "var(--color-text)", maxHeight: "120px" }}
        />

        {isStreaming ? (
          <button
            onClick={abortMessage}
            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer" }}
            title="Stop"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: canSend ? activeChar?.theme.accent || "var(--color-accent)" : "rgba(122,162,255,0.1)",
              color: canSend ? "#fff" : "var(--color-text-dim)",
              cursor: canSend ? "pointer" : "not-allowed",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
