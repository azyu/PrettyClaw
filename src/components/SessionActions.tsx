"use client";

import { useAppStore } from "@/stores/useAppStore";

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
      <button
        onClick={newChat}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-125"
        style={{
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          color: "var(--color-text)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        title="New conversation"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Chat
      </button>

      {/* Session History */}
      <button
        onClick={handleOpenHistory}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-125"
        style={{
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          color: "var(--color-text)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        title="Session history"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Sessions
      </button>
    </div>
  );
}
