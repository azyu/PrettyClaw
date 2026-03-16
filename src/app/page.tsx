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
import { TtsPlayer } from "@/components/TtsPlayer";
import { useCurrentAppLocale } from "@/i18n/client";
import { resolveBackgroundFocusOffsetPx } from "@/lib/dialogue-layout";
import { useAppStore } from "@/stores/useAppStore";

export default function Home() {
  const loadCharacters = useAppStore((s) => s.loadCharacters);
  const connect = useAppStore((s) => s.connect);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const isDialogueCollapsed = useAppStore((s) => s.isDialogueCollapsed);
  const locale = useCurrentAppLocale();
  const [readyToConnect, setReadyToConnect] = useState(false);
  const [isTallLayout, setIsTallLayout] = useState(false);
  const [isCenteredStageLayout, setIsCenteredStageLayout] = useState(false);
  const [dialogueDockHeight, setDialogueDockHeight] = useState(0);
  const [lastExpandedDialogueDockHeight, setLastExpandedDialogueDockHeight] = useState(0);
  const didLoadCharacters = useRef(false);
  const dialogueDockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      await loadCharacters(locale);
      if (!cancelled) {
        didLoadCharacters.current = true;
        setReadyToConnect(true);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadCharacters, locale]);

  useEffect(() => {
    if (didLoadCharacters.current && readyToConnect && connectionStatus === "disconnected") {
      connect();
    }
  }, [connect, connectionStatus, readyToConnect]);

  useEffect(() => {
    const update = () => {
      const viewportRatio = window.innerHeight / Math.max(window.innerWidth, 1);

      setIsTallLayout(viewportRatio >= 1.15);
      setIsCenteredStageLayout(viewportRatio >= 1.02 && window.innerHeight >= 1500 && window.innerWidth >= 1400);
    };

    update();
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const element = dialogueDockRef.current;
    if (!element) {
      return;
    }

    const update = () => {
      setDialogueDockHeight(element.clientHeight);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isDialogueCollapsed && dialogueDockHeight > 0) {
      setLastExpandedDialogueDockHeight(dialogueDockHeight);
    }
  }, [dialogueDockHeight, isDialogueCollapsed]);

  const dialogueBottomPaddingPx = isTallLayout ? 40 : 24;
  const backgroundFocusOffsetPx = resolveBackgroundFocusOffsetPx(
    dialogueDockHeight,
    lastExpandedDialogueDockHeight,
    isDialogueCollapsed,
    dialogueBottomPaddingPx,
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left sidebar - character selection */}
      <CharacterSidebar />

      {/* Main scene area */}
      <div className="flex-1 relative flex flex-col">
        {/* Scene background + character sprite */}
        <SceneLayer
          isTallLayout={isTallLayout}
          isCenteredStageLayout={isCenteredStageLayout}
          backgroundFocusOffsetPx={backgroundFocusOffsetPx}
        />

        {/* Session action buttons (top-right) */}
        <SessionActions />

        {/* Spacer to push dialogue to bottom */}
        <div className="flex-1" />

        {/* Dialogue box + input at bottom */}
        <div className={`relative z-10 px-6 ${isTallLayout ? "pb-10 pt-10" : "pb-6"}`}>
          <div ref={dialogueDockRef}>
            <DialogueBox />
            <PromptInput />
          </div>
        </div>
      </div>

      {/* Overlays */}
      <SettingsPanel />
      <ChatLog />
      <SessionHistoryPanel />
      <DebugInfo />
      <TtsPlayer />
    </div>
  );
}
