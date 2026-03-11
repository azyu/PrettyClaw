"use client";

import Image from "next/image";
import { Settings2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import { getConnectionIssueCopy, getConnectionStatusLabel } from "@/lib/gateway-connection";
import { Button } from "@/components/ui/button";

export function CharacterSidebar() {
  const characters = useAppStore((s) => s.characters);
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const selectCharacter = useAppStore((s) => s.selectCharacter);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const connectionIssue = useAppStore((s) => s.connectionIssue);
  const pairingState = useAppStore((s) => s.pairingState);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const streamStates = useAppStore((s) => s.streamStates);
  const activeSessionKeys = useAppStore((s) => s.activeSessionKeys);
  const prefersReducedMotion = useReducedMotion();
  const connectionCopy = getConnectionIssueCopy(connectionIssue);
  const connectionLabel = getConnectionStatusLabel(connectionStatus, pairingState);

  return (
    <div className="flex flex-col h-full w-[200px] min-w-[200px]"
      style={{ background: "var(--color-sidebar-bg)", borderRight: "1px solid rgba(122,162,255,0.15)" }}>

      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <h1 className="text-sm font-bold tracking-wider" style={{ color: "var(--color-accent)" }}>
          PrettyClaw
        </h1>
        <div className="flex items-center gap-1.5 mt-1">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === "connected" ? "bg-green-400" :
            connectionStatus === "connecting" ? "bg-yellow-400 animate-pulse" :
            "bg-red-400"
          }`} />
          <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
            {connectionLabel}
          </span>
        </div>
        {connectionCopy && (
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.52)" }}>
            {connectionCopy.title}
          </p>
        )}
      </div>

      {/* Character list */}
      <div className="flex-1 overflow-y-auto py-2">
        {characters.map((char) => {
          const isActive = char.id === activeCharacterId;
          const sk = activeSessionKeys.get(char.id) || char.sessionKey;
          const charStream = streamStates.get(sk);
          const isThinking = charStream?.streaming ?? false;
          return (
            <motion.button
              key={char.id}
              onClick={() => selectCharacter(char.id)}
              className="group w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
              style={{
                background: isActive ? "rgba(122,162,255,0.12)" : "transparent",
                borderLeft: isActive ? `3px solid ${char.theme.accent}` : "3px solid transparent",
              }}
              whileHover={prefersReducedMotion ? undefined : { backgroundColor: "rgba(122,162,255,0.08)" }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden"
                  style={{
                    border: `2px solid ${isActive ? char.theme.accent : "transparent"}`,
                  }}
                >
                  <Image
                    src={char.avatar}
                    alt={char.displayName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Thinking ring around avatar */}
                {isThinking && (
                  <motion.div
                    className="absolute inset-[-3px] rounded-full"
                    style={{
                      border: `2px solid ${char.theme.accent}`,
                      borderTopColor: "transparent",
                    }}
                    animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                    transition={prefersReducedMotion ? undefined : { duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate" style={{ color: isActive ? char.theme.nameColor : "var(--color-text)" }}>
                    {char.displayName}
                  </span>
                  {isThinking && (
                    <motion.span
                      className="shrink-0 text-[10px]"
                      style={{ color: char.theme.accent }}
                      animate={prefersReducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
                      transition={prefersReducedMotion ? undefined : { duration: 1.5, repeat: Infinity }}
                    >
                      생성 중…
                    </motion.span>
                  )}
                </div>
                <div
                  className="text-xs truncate pr-1 group-hover:overflow-visible group-hover:whitespace-normal group-hover:text-clip"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  {char.description || char.displayName}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Settings button */}
      <div className="px-4 py-3 border-t border-white/10">
        <Button
          onClick={toggleSettings}
          variant="secondary"
          className="w-full justify-center text-xs text-muted-foreground"
        >
          <Settings2 aria-hidden="true" className="h-3.5 w-3.5" />
          설정
        </Button>
      </div>
    </div>
  );
}
