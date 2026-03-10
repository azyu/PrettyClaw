"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import { getConnectionIssueCopy, getConnectionStatusLabel } from "@/lib/gateway-connection";

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

  const [url, setUrl] = useState(gatewaySettings.url);
  const [token, setToken] = useState(gatewaySettings.token);

  useEffect(() => {
    setUrl(gatewaySettings.url);
    setToken(gatewaySettings.token);
  }, [gatewaySettings]);

  const connectionCopy = getConnectionIssueCopy(connectionIssue);
  const connectionLabel = getConnectionStatusLabel(connectionStatus, pairingState);

  const handleSave = () => {
    setGatewaySettings({ url, token });
  };

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
                  Gateway Settings
                </h2>
                <button
                  onClick={toggleSettings}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--color-text-dim)" }}>
                    Gateway URL
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(122,162,255,0.2)",
                      color: "var(--color-text)",
                    }}
                    placeholder="ws://localhost:18789"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1.5" style={{ color: "var(--color-text-dim)" }}>
                    Token
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(122,162,255,0.2)",
                      color: "var(--color-text)",
                    }}
                    placeholder="Gateway token"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleConnect}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: connectionStatus === "connected"
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(122,162,255,0.2)",
                      color: connectionStatus === "connected" ? "#ef4444" : "var(--color-accent)",
                      border: `1px solid ${connectionStatus === "connected" ? "rgba(239,68,68,0.3)" : "rgba(122,162,255,0.3)"}`,
                    }}
                  >
                    {connectionStatus === "connected" ? "Disconnect" : "Connect"}
                  </button>
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
