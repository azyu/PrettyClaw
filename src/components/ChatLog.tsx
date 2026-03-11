"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";

export function ChatLog() {
  const showLog = useAppStore((s) => s.showLog);
  const toggleLog = useAppStore((s) => s.toggleLog);
  const characters = useAppStore((s) => s.characters);
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const messages = useAppStore((s) => s.messages);
  const activeSessionKeys = useAppStore((s) => s.activeSessionKeys);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const sessionKey = activeCharacterId
    ? (activeSessionKeys.get(activeCharacterId) || activeChar?.sessionKey || null)
    : null;
  const charMessages = sessionKey ? messages.get(sessionKey) || [] : [];

  useEffect(() => {
    if (showLog && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [showLog, charMessages.length]);

  return (
    <AnimatePresence>
      {showLog && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleLog}
          />
          <motion.div
            className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl overflow-hidden"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid rgba(122,162,255,0.2)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <h2 className="text-sm font-bold" style={{ color: activeChar?.theme.nameColor || "var(--color-accent)" }}>
                  대화 로그 — {activeChar?.displayName || ""}
                </h2>
                <Button
                  onClick={toggleLog}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="대화 로그 닫기"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {charMessages.length === 0 ? (
                  <p className="text-center text-sm py-8" style={{ color: "var(--color-text-dim)" }}>
                    아직 대화가 없습니다.
                  </p>
                ) : (
                  charMessages.map((msg) => (
                    <div key={msg.id}>
                      {msg.role === "user" ? (
                        <div className="flex justify-end">
                          <div className="max-w-[80%]">
                            <span className="text-xs block text-right mb-0.5" style={{ color: "var(--color-text-dim)" }}>
                              나
                            </span>
                            <div
                              className="px-3 py-2 rounded-xl rounded-br-sm text-sm"
                              style={{ background: "rgba(122,162,255,0.12)", color: "var(--color-text)" }}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[85%]">
                          <span
                            className="text-xs font-bold mb-0.5 inline-block px-1.5 py-0.5 rounded"
                            style={{
                              color: activeChar?.theme.nameColor,
                              background: `${activeChar?.theme.accent}12`,
                            }}
                          >
                            {activeChar?.displayName}
                          </span>
                          <div
                            className="px-3 py-2 rounded-xl rounded-tl-sm text-sm leading-relaxed mt-0.5 prose prose-invert prose-sm max-w-none"
                            style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text)" }}
                          >
                            <Markdown>{msg.content}</Markdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-2 border-t border-white/10 text-xs text-center" style={{ color: "var(--color-text-dim)" }}>
                메시지 {charMessages.length}개
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
