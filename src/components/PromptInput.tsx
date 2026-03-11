"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollText, SendHorizontal, Square } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { getConnectionIssueCopy } from "@/lib/gateway-connection";
import { Button } from "@/components/ui/button";

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
        className="flex items-center gap-2 rounded-b-xl border border-white/5 px-4 py-3 transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:shadow-[0_0_0_2px_rgba(122,162,255,0.18)]"
        style={{
          background: "var(--color-dialogue-bg)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(122,162,255,0.08)",
        }}
      >
        <Button
          onClick={toggleLog}
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-lg bg-secondary/70 text-muted-foreground"
          title="채팅 로그"
          aria-label="채팅 로그"
        >
          <ScrollText aria-hidden="true" className="h-4 w-4" />
        </Button>

        <textarea
          ref={inputRef}
          aria-label={activeChar ? `${activeChar.displayName}에게 보낼 메시지` : "메시지 입력"}
          name="message"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            pairingState === "required"
              ? "기기 승인 후 다시 연결하세요…"
              : connectionStatus !== "connected"
              ? connectionCopy?.title || "Gateway에 먼저 연결하세요…"
              : activeChar
              ? `${activeChar.displayName}에게 말을 걸어보세요…`
              : "캐릭터를 선택하세요…"
          }
          disabled={connectionStatus !== "connected"}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ color: "var(--color-text)", maxHeight: "120px" }}
        />

        {isStreaming ? (
          <Button
            onClick={abortMessage}
            variant="destructive"
            size="icon"
            className="shrink-0 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30"
            title="중단"
            aria-label="중단"
          >
            <Square aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canSend}
            size="icon"
            className="shrink-0 rounded-lg"
            style={{
              background: canSend ? activeChar?.theme.accent || "var(--color-accent)" : undefined,
              color: canSend ? "#fff" : undefined,
            }}
            title="전송"
            aria-label="전송"
          >
            <SendHorizontal aria-hidden="true" className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
