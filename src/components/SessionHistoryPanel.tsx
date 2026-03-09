"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function formatTokens(n?: number) {
  if (!n) return "";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function SessionHistoryPanel() {
  const showSessionHistory = useAppStore((s) => s.showSessionHistory);
  const toggleSessionHistory = useAppStore((s) => s.toggleSessionHistory);
  const characterSessions = useAppStore((s) => s.characterSessions);
  const switchToSession = useAppStore((s) => s.switchToSession);
  const deleteCharacterSession = useAppStore((s) => s.deleteCharacterSession);
  const characters = useAppStore((s) => s.characters);
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const activeSessionKeys = useAppStore((s) => s.activeSessionKeys);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const currentSessionKey = activeCharacterId
    ? (activeSessionKeys.get(activeCharacterId) || activeChar?.sessionKey || "")
    : "";

  const handleSwitch = (sessionKey: string) => {
    switchToSession(sessionKey);
  };

  const handleDelete = async (sessionKey: string) => {
    if (confirmDelete === sessionKey) {
      await deleteCharacterSession(sessionKey);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(sessionKey);
      // Auto-cancel after 3s
      setTimeout(() => setConfirmDelete((prev) => (prev === sessionKey ? null : prev)), 3000);
    }
  };

  return (
    <AnimatePresence>
      {showSessionHistory && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSessionHistory}
          />
          <motion.div
            className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-center justify-center p-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="w-full max-w-lg max-h-[70vh] flex flex-col rounded-xl overflow-hidden"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid rgba(122,162,255,0.2)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <h2 className="text-sm font-bold" style={{ color: activeChar?.theme.nameColor || "var(--color-accent)" }}>
                  Sessions — {activeChar?.displayName || ""}
                </h2>
                <button
                  onClick={toggleSessionHistory}
                  className="text-gray-400 hover:text-white transition-colors text-lg"
                >
                  &times;
                </button>
              </div>

              {/* Session list */}
              <div className="flex-1 overflow-y-auto">
                {characterSessions.length === 0 ? (
                  <p className="text-center text-sm py-8" style={{ color: "var(--color-text-dim)" }}>
                    No sessions found.
                  </p>
                ) : (
                  characterSessions.map((session) => {
                    // Check if this is the currently active session
                    const rawKey = session.key.split(":").slice(2).join(":");
                    const isCurrent = rawKey === currentSessionKey;

                    return (
                      <div
                        key={session.key}
                        className="flex items-center gap-3 px-5 py-3 border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                      >
                        {/* Session info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-medium truncate"
                              style={{ color: isCurrent ? activeChar?.theme.nameColor : "var(--color-text)" }}
                            >
                              {session.label || rawKey}
                            </span>
                            {isCurrent && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: `${activeChar?.theme.accent}20`,
                                  color: activeChar?.theme.accent,
                                }}
                              >
                                active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
                              {formatTime(session.updatedAt)}
                            </span>
                            {session.totalTokens ? (
                              <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
                                {formatTokens(session.totalTokens)} tokens
                              </span>
                            ) : null}
                            {session.model ? (
                              <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
                                {session.model}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isCurrent && (
                            <button
                              onClick={() => handleSwitch(session.key)}
                              className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                              style={{
                                background: "rgba(122,162,255,0.15)",
                                color: "var(--color-accent)",
                                border: "1px solid rgba(122,162,255,0.2)",
                              }}
                            >
                              Resume
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(session.key)}
                            className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                            style={{
                              background: confirmDelete === session.key ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.1)",
                              color: "#ef4444",
                              border: `1px solid ${confirmDelete === session.key ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.15)"}`,
                            }}
                          >
                            {confirmDelete === session.key ? "Confirm?" : "Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-2 border-t border-white/10 text-xs text-center" style={{ color: "var(--color-text-dim)" }}>
                {characterSessions.length} session{characterSessions.length !== 1 ? "s" : ""}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
