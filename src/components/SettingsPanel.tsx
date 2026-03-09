"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";

export function SettingsPanel() {
  const showSettings = useAppStore((s) => s.showSettings);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const gatewaySettings = useAppStore((s) => s.gatewaySettings);
  const setGatewaySettings = useAppStore((s) => s.setGatewaySettings);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const connect = useAppStore((s) => s.connect);
  const disconnect = useAppStore((s) => s.disconnect);

  const [url, setUrl] = useState(gatewaySettings.url);
  const [token, setToken] = useState(gatewaySettings.token);

  useEffect(() => {
    setUrl(gatewaySettings.url);
    setToken(gatewaySettings.token);
  }, [gatewaySettings]);

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
                  Status: {connectionStatus}
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
                  Gateway Control UI Mode
                </p>
                <p>
                  Connects directly to the OpenClaw Gateway using WebSocket.
                  Requires <code>gateway.controlUi.allowInsecureAuth</code> in openclaw.json.
                </p>
                <p className="mt-1">
                  Characters: <code>~/.config/prettyclaw/characters.json</code>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
