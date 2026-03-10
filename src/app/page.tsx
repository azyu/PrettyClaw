"use client";

import { useEffect, useRef, useState } from "react";
import { CharacterSidebar } from "@/components/CharacterSidebar";
import { SceneLayer } from "@/components/SceneLayer";
import { DialogueBox } from "@/components/DialogueBox";
import { PromptInput } from "@/components/PromptInput";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ChatLog } from "@/components/ChatLog";
import { SessionActions } from "@/components/SessionActions";
import { SessionHistoryPanel } from "@/components/SessionHistoryPanel";
import { DebugInfo } from "@/components/DebugInfo";
import { useAppStore } from "@/stores/useAppStore";

export default function Home() {
  const loadCharacters = useAppStore((s) => s.loadCharacters);
  const bootstrapAgents = useAppStore((s) => s.bootstrapAgents);
  const connect = useAppStore((s) => s.connect);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const [readyToConnect, setReadyToConnect] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    let cancelled = false;

    const initialize = async () => {
      await loadCharacters();
      await bootstrapAgents();
      if (!cancelled) {
        setReadyToConnect(true);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [bootstrapAgents, loadCharacters]);

  useEffect(() => {
    if (readyToConnect && connectionStatus === "disconnected") {
      connect();
    }
  }, [connect, connectionStatus, readyToConnect]);
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left sidebar - character selection */}
      <CharacterSidebar />

      {/* Main scene area */}
      <div className="flex-1 relative flex flex-col">
        {/* Scene background + character sprite */}
        <SceneLayer />

        {/* Session action buttons (top-right) */}
        <SessionActions />

        {/* Spacer to push dialogue to bottom */}
        <div className="flex-1" />

        {/* Dialogue box + input at bottom */}
        <div className="relative z-10 pb-6 px-6">
          <DialogueBox />
          <PromptInput />
        </div>
      </div>

      {/* Overlays */}
      <SettingsPanel />
      <ChatLog />
      <SessionHistoryPanel />
      <DebugInfo />
    </div>
  );
}
