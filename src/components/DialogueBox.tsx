"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import { useAppStore } from "@/stores/useAppStore";

function NameTag({ name, accent, nameColor }: { name: string; accent: string; nameColor: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
      <span className="text-xs font-bold tracking-wide" style={{ color: nameColor }}>
        {name}
      </span>
    </div>
  );
}

/** Hook to get the active session key for the current character */
function useActiveSessionKey() {
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const activeSessionKeys = useAppStore((s) => s.activeSessionKeys);
  const characters = useAppStore((s) => s.characters);

  if (!activeCharacterId) return null;
  const custom = activeSessionKeys.get(activeCharacterId);
  if (custom) return custom;
  const char = characters.find((c) => c.id === activeCharacterId);
  return char?.sessionKey || null;
}

export function DialogueBox() {
  const characters = useAppStore((s) => s.characters);
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const messages = useAppStore((s) => s.messages);
  const streamStates = useAppStore((s) => s.streamStates);

  const sessionKey = useActiveSessionKey();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const charMessages = sessionKey ? messages.get(sessionKey) || [] : [];
  const stream = sessionKey ? streamStates.get(sessionKey) : undefined;
  const isStreaming = stream?.streaming ?? false;
  const streamingText = stream?.text ?? "";
  const thinkingText = stream?.thinking ?? "";
  const toolName = stream?.toolName ?? "";
  const toolPhase = stream?.toolPhase ?? "idle";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [charMessages.length, streamingText]);

  const recentMessages = charMessages.slice(-30);

  return (
    <div className="relative z-10 w-full max-w-3xl mx-auto">
      <div
        ref={scrollRef}
        className="max-h-[280px] overflow-y-auto rounded-t-xl px-6 py-4"
        style={{
          background: "var(--color-dialogue-bg)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(122,162,255,0.15)",
          borderBottom: "none",
        }}
      >
        <AnimatePresence mode="sync">
          {recentMessages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i === recentMessages.length - 1 ? 0.05 : 0 }}
              className="mb-3"
            >
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm"
                    style={{
                      background: "rgba(122,162,255,0.12)",
                      color: "var(--color-text)",
                      border: "1px solid rgba(122,162,255,0.08)",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div>
                  {activeChar && (
                    <NameTag
                      name={activeChar.displayName}
                      accent={activeChar.theme.accent}
                      nameColor={activeChar.theme.nameColor}
                    />
                  )}
                  <div
                    className="max-w-[90%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--color-text)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {isStreaming && streamingText && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3"
            >
              {activeChar && (
                <NameTag
                  name={activeChar.displayName}
                  accent={activeChar.theme.accent}
                  nameColor={activeChar.theme.nameColor}
                />
              )}
              <div
                className="max-w-[90%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--color-text)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <Markdown>{streamingText}</Markdown>
                <span className="typing-cursor" />
              </div>
            </motion.div>
          )}

          {isStreaming && !streamingText && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3"
            >
              {activeChar && (
                <NameTag
                  name={activeChar.displayName}
                  accent={activeChar.theme.accent}
                  nameColor={activeChar.theme.nameColor}
                />
              )}
              <div
                className="max-w-[90%] px-4 py-3 rounded-2xl rounded-tl-sm"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {/* Tool call indicator */}
                {toolName && toolPhase !== "idle" && (
                  <div className="flex items-center gap-2 mb-1.5 text-[11px]" style={{ color: "var(--color-text-dim)" }}>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                      style={{ color: activeChar?.theme.accent }}
                    >
                      &#9881;
                    </motion.span>
                    <span>{toolName}</span>
                    {toolPhase === "done" && <span style={{ color: "#4ade80" }}>done</span>}
                  </div>
                )}
                {/* Thinking text */}
                {thinkingText ? (
                  <div className="text-xs leading-relaxed italic" style={{ color: "var(--color-text-dim)" }}>
                    {thinkingText.length > 200 ? thinkingText.slice(-200) + "..." : thinkingText}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: activeChar?.theme.accent || "var(--color-accent)" }}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {recentMessages.length === 0 && !isStreaming && activeChar && (
          <div className="text-center py-10" style={{ color: "var(--color-text-dim)" }}>
            <div className="text-2xl mb-2 opacity-30">
              {activeChar.displayName[0]}
            </div>
            <p className="text-sm">
              <span style={{ color: activeChar.theme.nameColor }}>{activeChar.displayName}</span>
              과(와) 대화를 시작하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
