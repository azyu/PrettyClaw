"use client";

import { useTranslations } from "next-intl";
import { useAppStore } from "@/stores/useAppStore";

export function DebugInfo() {
  const characters = useAppStore((s) => s.characters);
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const activeSessionKeys = useAppStore((s) => s.activeSessionKeys);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const streamStates = useAppStore((s) => s.streamStates);
  const lastModel = useAppStore((s) => s.lastModel);
  const t = useTranslations();

  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const sessionKey = activeCharacterId
    ? (activeSessionKeys.get(activeCharacterId) || activeChar?.sessionKey || "—")
    : "—";
  const stream = streamStates.get(sessionKey);
  const tts = activeChar?.tts;
  const ttsLabel = !tts
    ? "off"
    : !tts.enabled
    ? `${tts.provider} disabled`
    : tts.provider === "typecast"
    ? `typecast ${tts.typecast?.voiceId || "—"}`
    : `edge ${tts.edge?.voice || "—"}`;

  return (
    <div
      className="fixed bottom-2 right-2 z-30 text-[10px] leading-tight font-mono pointer-events-none select-none"
      style={{ color: "rgba(255,255,255,0.3)" }}
    >
      <div>{`session: ${sessionKey}`}</div>
      <div>{`agent: ${activeChar?.agentId || "—"}`}</div>
      <div>{`model: ${lastModel || "—"}`}</div>
      <div>{`tts: ${ttsLabel}`}</div>
      <div>{`status: ${connectionStatus}${stream?.streaming ? ` | ${t("sidebar.thinking")}` : ""}`}</div>
    </div>
  );
}
