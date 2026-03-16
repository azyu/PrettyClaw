"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, LoaderCircle, Volume2 } from "lucide-react";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { Button } from "@/components/ui/button";
import { getChatFontSizeStyle } from "@/lib/chat-font-size";
import { isPayloadOnlyHistoryMessage, shouldDisplayHistoryMessage } from "@/lib/chat-history";
import { canReplayTts } from "@/lib/tts";
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
  const activeTtsMessageId = useAppStore((s) => s.activeTtsMessageId);
  const requestTtsReplay = useAppStore((s) => s.requestTtsReplay);
  const streamStates = useAppStore((s) => s.streamStates);
  const ttsMessageStates = useAppStore((s) => s.ttsMessageStates);
  const chatFontSizePx = useAppStore((s) => s.chatFontSizePx);
  const isDialogueCollapsed = useAppStore((s) => s.isDialogueCollapsed);
  const toggleDialogueCollapsed = useAppStore((s) => s.toggleDialogueCollapsed);
  const developerMode = useAppStore((s) => s.developerMode);
  const t = useTranslations();

  const sessionKey = useActiveSessionKey();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const charMessages = sessionKey ? messages.get(sessionKey) || [] : [];
  const visibleMessages = charMessages.filter((msg) => shouldDisplayHistoryMessage(msg, developerMode));
  const stream = sessionKey ? streamStates.get(sessionKey) : undefined;
  const isStreaming = stream?.streaming ?? false;
  const streamingText = stream?.text ?? "";
  const thinkingText = stream?.thinking ?? "";
  const toolName = stream?.toolName ?? "";
  const toolPhase = stream?.toolPhase ?? "idle";
  const chatTextStyle = getChatFontSizeStyle(chatFontSizePx) as CSSProperties;
  const toggleLabel = isDialogueCollapsed ? t("dialogue.expand") : t("dialogue.collapse");
  const toggleButton = (
    <Button
      onClick={toggleDialogueCollapsed}
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full bg-white/8 text-muted-foreground shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-sm hover:bg-white/12 hover:text-foreground"
      title={toggleLabel}
      aria-label={toggleLabel}
      aria-expanded={!isDialogueCollapsed}
    >
      {isDialogueCollapsed ? (
        <ChevronUp aria-hidden="true" className="h-4 w-4" />
      ) : (
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      )}
    </Button>
  );

  useEffect(() => {
    if (!isDialogueCollapsed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages.length, isDialogueCollapsed, streamingText]);

  const recentMessages = visibleMessages.slice(-30);

  if (isDialogueCollapsed) {
    return (
      <div className="pointer-events-none relative z-20 mx-auto h-0 w-full max-w-3xl">
        <div className="pointer-events-auto absolute bottom-3 right-3">
          {toggleButton}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full max-w-3xl mx-auto">
      <div
        className="relative overflow-hidden rounded-t-xl"
        style={{
          background: "var(--color-dialogue-bg)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(122,162,255,0.15)",
          borderBottom: "none",
        }}
      >
        <div className="absolute right-3 top-3 z-10">
          {toggleButton}
        </div>

        <div ref={scrollRef} className="max-h-[280px] overflow-y-auto px-6 pb-4 pt-6">
          <AnimatePresence mode="sync">
            {recentMessages.map((msg, i) => {
              const ttsState = ttsMessageStates.get(msg.id);
              const isTtsActive = activeTtsMessageId === msg.id;
              const isPayloadOnly = isPayloadOnlyHistoryMessage(msg);
              const messageCharacter = msg.characterId
                ? characters.find((character) => character.id === msg.characterId)
                : activeChar;
              const showTtsButton = canReplayTts(messageCharacter) || ttsState === "loading" || isTtsActive;

              return (
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
                        className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5"
                        style={{
                          ...chatTextStyle,
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
                      {!isPayloadOnly && activeChar && (
                        <NameTag
                          name={activeChar.displayName}
                          accent={activeChar.theme.accent}
                          nameColor={activeChar.theme.nameColor}
                        />
                      )}
                      {!isPayloadOnly ? (
                        <div
                          className="relative max-w-[90%] rounded-2xl rounded-tl-sm px-4 py-2.5 pr-12"
                          style={{
                            ...chatTextStyle,
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--color-text)",
                            border: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <ChatMarkdown content={msg.content} fontSizePx={chatFontSizePx} />
                          {showTtsButton && (
                            <button
                              type="button"
                              onClick={() => requestTtsReplay(msg.id, msg.characterId, msg.content)}
                              disabled={ttsState === "loading"}
                              aria-label={t("dialogue.replayVoice")}
                              className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full transition"
                              style={{
                                background: isTtsActive ? `${activeChar?.theme.accent ?? "#7aa2ff"}22` : "rgba(255,255,255,0.06)",
                                color: isTtsActive ? activeChar?.theme.accent : "var(--color-text-dim)",
                                border: `1px solid ${isTtsActive ? `${activeChar?.theme.accent ?? "#7aa2ff"}55` : "rgba(255,255,255,0.08)"}`,
                              }}
                            >
                              {ttsState === "loading" ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : null}
                      {developerMode && msg.developerContent ? (
                        <pre
                          className={`${isPayloadOnly ? "max-w-[90%]" : "mt-2 max-w-[90%]"} overflow-x-auto rounded-xl border px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap break-all`}
                          style={{
                            background: "rgba(0,0,0,0.24)",
                            color: "var(--color-text-dim)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                        >
                          {msg.developerContent}
                        </pre>
                      ) : null}
                    </div>
                  )}
                </motion.div>
              );
            })}

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
                  className="max-w-[90%] rounded-2xl rounded-tl-sm px-4 py-2.5"
                  style={{
                    ...chatTextStyle,
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--color-text)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <ChatMarkdown content={streamingText} fontSizePx={chatFontSizePx} />
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
                      {toolPhase === "done" && <span style={{ color: "#4ade80" }}>{t("dialogue.toolDone")}</span>}
                    </div>
                  )}
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

            {recentMessages.length === 0 && !isStreaming && activeChar && (
              <div className="text-center py-10" style={{ color: "var(--color-text-dim)" }}>
                <div
                  className="relative mx-auto mb-3 h-12 w-12 overflow-hidden rounded-full"
                  style={{
                    border: `1px solid ${activeChar.theme.accent}55`,
                    boxShadow: `0 0 0 4px ${activeChar.theme.accent}12`,
                  }}
                >
                  <Image
                    src={activeChar.avatar}
                    alt={activeChar.displayName}
                    fill
                    sizes="48px"
                    className="object-cover opacity-80"
                  />
                </div>
                <p style={chatTextStyle}>
                  {t("dialogue.ready")}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
