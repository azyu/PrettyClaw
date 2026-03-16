"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";

function formatTime(ts: number | undefined, locale: string, justNowLabel: string) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60_000) return justNowLabel;

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff < 3600_000) return formatter.format(-Math.floor(diff / 60_000), "minute");
  if (diff < 86400_000) return formatter.format(-Math.floor(diff / 3600_000), "hour");
  if (diff < 604800_000) return formatter.format(-Math.floor(diff / 86400_000), "day");

  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d);
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

  const prefersReducedMotion = useReducedMotion();
  const locale = useLocale();
  const t = useTranslations();
  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const currentSessionKey = activeCharacterId
    ? (activeSessionKeys.get(activeCharacterId) || activeChar?.sessionKey || "")
    : "";
  const dialogTitleId = "session-history-title";

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
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            onClick={toggleSessionHistory}
          />
          <motion.div
            className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-center justify-center p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          >
            <div
              className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl overscroll-contain"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid rgba(122,162,255,0.2)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <h2
                  id={dialogTitleId}
                  className="text-sm font-bold"
                  style={{ color: activeChar?.theme.nameColor || "var(--color-accent)" }}
                >
                  {t("session.title", { name: activeChar?.displayName || "" })}
                </h2>
                <Button
                  onClick={toggleSessionHistory}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t("session.close")}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>

              {/* Session list */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {characterSessions.length === 0 ? (
                  <p className="text-center text-sm py-8" style={{ color: "var(--color-text-dim)" }}>
                    {t("session.empty")}
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
                                {t("session.current")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
                              {formatTime(session.updatedAt, locale, t("session.justNow"))}
                            </span>
                            {session.totalTokens ? (
                              <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
                                {t("session.tokens", { count: formatTokens(session.totalTokens) })}
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
                            <Button
                              onClick={() => handleSwitch(session.key)}
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                            >
                              {t("common.continue")}
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDelete(session.key)}
                            variant={confirmDelete === session.key ? "destructive" : "destructiveSubtle"}
                            size="sm"
                            className="text-xs"
                          >
                            {confirmDelete === session.key ? t("common.confirmDelete") : t("common.delete")}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-2 border-t border-white/10 text-xs text-center" style={{ color: "var(--color-text-dim)" }}>
                {t("common.sessionsCount", { count: characterSessions.length })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
