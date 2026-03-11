"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import { getConnectionIssueCopy, getConnectionStatusLabel } from "@/lib/gateway-connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function SettingsPanel() {
  const showSettings = useAppStore((s) => s.showSettings);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const gatewaySettings = useAppStore((s) => s.gatewaySettings);
  const setGatewaySettings = useAppStore((s) => s.setGatewaySettings);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const connectionIssue = useAppStore((s) => s.connectionIssue);
  const pairingState = useAppStore((s) => s.pairingState);
  const connect = useAppStore((s) => s.connect);
  const disconnect = useAppStore((s) => s.disconnect);
  const ttsAutoplay = useAppStore((s) => s.ttsAutoplay);
  const setTtsAutoplay = useAppStore((s) => s.setTtsAutoplay);

  const [url, setUrl] = useState(gatewaySettings.url);
  const [token, setToken] = useState(gatewaySettings.token);

  useEffect(() => {
    setUrl(gatewaySettings.url);
    setToken(gatewaySettings.token);
  }, [gatewaySettings]);

  const connectionCopy = getConnectionIssueCopy(connectionIssue);
  const connectionLabel = getConnectionStatusLabel(connectionStatus, pairingState);

  const handleConnect = () => {
    setGatewaySettings({ url, token });
    if (connectionStatus === "connected") {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <AnimatePresence>
      {showSettings && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSettings}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 w-[360px] z-50 overflow-y-auto"
            style={{
              background: "var(--color-bg-secondary)",
              borderLeft: "1px solid rgba(122,162,255,0.15)",
            }}
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                  Gateway 설정
                </h2>
                <Button
                  onClick={toggleSettings}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="설정 닫기"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--color-text-dim)" }}>
                    Gateway URL
                  </label>
                  <Input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="border-border/80 bg-background/60"
                    placeholder="ws://localhost:18789"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--color-text-dim)" }}>
                    토큰
                  </label>
                  <Input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="border-border/80 bg-background/60"
                    placeholder="Gateway 토큰"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleConnect}
                    variant={connectionStatus === "connected" ? "destructive" : "default"}
                    className="flex-1"
                    style={{
                      background:
                        connectionStatus === "connected"
                          ? "rgba(239,68,68,0.18)"
                          : undefined,
                      color:
                        connectionStatus === "connected"
                          ? "#f87171"
                          : undefined,
                      border:
                        connectionStatus === "connected"
                          ? "1px solid rgba(239,68,68,0.3)"
                          : undefined,
                    }}
                  >
                    {connectionStatus === "connected" ? "연결 해제" : "연결"}
                  </Button>
                </div>

                {/* Connection status */}
                <div className="pt-2 text-xs" style={{ color: "var(--color-text-dim)" }}>
                  상태: {connectionLabel}
                </div>

                {connectionCopy && (
                  <div
                    className="rounded-lg p-4 text-xs leading-relaxed"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.18)",
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    <p className="font-medium mb-2" style={{ color: "#fca5a5" }}>
                      {connectionCopy.title}
                    </p>
                    <p>{connectionCopy.description}</p>
                    {connectionCopy.commands.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {connectionCopy.commands.map((command) => (
                          <p key={command}>
                            <code>{command}</code>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className="rounded-lg p-4"
                  style={{
                    background: "rgba(122,162,255,0.05)",
                    border: "1px solid rgba(122,162,255,0.1)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        TTS 자동 재생
                      </p>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
                        캐릭터 응답이 완료되면 Typecast 음성을 자동으로 재생합니다.
                      </p>
                    </div>
                    <Switch checked={ttsAutoplay} onCheckedChange={setTtsAutoplay} aria-label="TTS 자동 재생" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div
                className="mt-8 p-4 rounded-lg text-xs leading-relaxed"
                style={{
                  background: "rgba(122,162,255,0.05)",
                  border: "1px solid rgba(122,162,255,0.1)",
                  color: "var(--color-text-dim)",
                }}
              >
                <p className="mb-2 font-medium" style={{ color: "var(--color-text)" }}>
                  Gateway Device Auth
                </p>
                <p>
                  브라우저 device identity로 OpenClaw Gateway에 직접 연결합니다.
                  첫 연결 후 pairing이 필요하면 Gateway 호스트에서 승인해야 합니다.
                </p>
                <p className="mt-1">
                  캐릭터 설정: <code>~/.config/prettyclaw/characters.json</code>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
