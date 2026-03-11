"use client";

import { History, Plus } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";

export function SessionActions() {
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const newChat = useAppStore((s) => s.newChat);
  const toggleSessionHistory = useAppStore((s) => s.toggleSessionHistory);
  const loadCharacterSessions = useAppStore((s) => s.loadCharacterSessions);

  if (connectionStatus !== "connected") return null;

  const handleOpenHistory = () => {
    loadCharacterSessions();
    toggleSessionHistory();
  };

  return (
    <div className="absolute top-4 right-4 z-20 flex gap-2">
      {/* New Chat */}
      <Button
        onClick={newChat}
        variant="secondary"
        size="sm"
        className="bg-black/50 text-foreground backdrop-blur-sm"
        title="새 채팅"
      >
        <Plus className="h-3.5 w-3.5" />
        새 채팅
      </Button>

      {/* Session History */}
      <Button
        onClick={handleOpenHistory}
        variant="secondary"
        size="sm"
        className="bg-black/50 text-foreground backdrop-blur-sm"
        title="세션 기록"
      >
        <History className="h-3.5 w-3.5" />
        세션
      </Button>
    </div>
  );
}
