"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  MAX_CHAT_FONT_SIZE_PX,
  MIN_CHAT_FONT_SIZE_PX,
  resolveChatFontSizeCommit,
} from "@/lib/chat-font-size";
import { APP_LOCALES } from "@/i18n/config";
import { useAppLocale } from "@/i18n/client";
import { useAppStore } from "@/stores/useAppStore";
import { getConnectionIssueCopy, getConnectionStatusLabel } from "@/lib/gateway-connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const SETTINGS_TABS = ["general", "gateway"] as const;
type SettingsTabId = (typeof SETTINGS_TABS)[number];

export function SettingsPanel() {
  const showSettings = useAppStore((s) => s.showSettings);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const gatewaySettings = useAppStore((s) => s.gatewaySettings);
  const setGatewaySettings = useAppStore((s) => s.setGatewaySettings);
  const chatFontSizePx = useAppStore((s) => s.chatFontSizePx);
  const setChatFontSizePx = useAppStore((s) => s.setChatFontSizePx);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const connectionIssue = useAppStore((s) => s.connectionIssue);
  const pairingState = useAppStore((s) => s.pairingState);
  const connect = useAppStore((s) => s.connect);
  const disconnect = useAppStore((s) => s.disconnect);
  const ttsAutoplay = useAppStore((s) => s.ttsAutoplay);
  const setTtsAutoplay = useAppStore((s) => s.setTtsAutoplay);
  const { locale, setLocale, isChangingLocale } = useAppLocale();
  const t = useTranslations();

  const [url, setUrl] = useState(gatewaySettings.url);
  const [token, setToken] = useState(gatewaySettings.token);
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const [chatFontSizeInput, setChatFontSizeInput] = useState(String(chatFontSizePx));
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setUrl(gatewaySettings.url);
    setToken(gatewaySettings.token);
  }, [gatewaySettings]);

  useEffect(() => {
    setChatFontSizeInput(String(chatFontSizePx));
  }, [chatFontSizePx]);

  useEffect(() => {
    if (showSettings) {
      setActiveTab("general");
    }
  }, [showSettings]);

  const prefersReducedMotion = useReducedMotion();
  const connectionCopy = getConnectionIssueCopy(connectionIssue, t);
  const connectionLabel = getConnectionStatusLabel(connectionStatus, pairingState, t);
  const panelTitleId = "settings-panel-title";
  const gatewayUrlId = "gateway-url";
  const gatewayTokenId = "gateway-token";
  const chatFontSizeId = "chat-font-size-px";
  const chatFontSizeHelpId = "chat-font-size-help";
  const activeTabId = `settings-tab-${activeTab}`;
  const activePanelId = `settings-tabpanel-${activeTab}`;
  const connectionStatusTone =
    pairingState === "required"
      ? "border-amber-400/30 bg-amber-400/12 text-amber-200"
      : connectionStatus === "connected"
      ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
      : connectionStatus === "connecting"
      ? "border-sky-400/30 bg-sky-400/12 text-sky-200"
      : "border-white/12 bg-white/6 text-muted-foreground";

  const handleConnect = () => {
    setGatewaySettings({ url, token });
    if (connectionStatus === "connected") {
      disconnect();
    } else {
      connect();
    }
  };

  const commitChatFontSize = (rawValue: string) => {
    const { nextInput, nextSize } = resolveChatFontSizeCommit(rawValue, chatFontSizePx);
    setChatFontSizeInput(nextInput);
    if (nextSize !== null) {
      setChatFontSizePx(nextSize);
    }
  };

  const focusTabAtIndex = (index: number) => {
    const nextTab = SETTINGS_TABS[index];
    if (!nextTab) {
      return;
    }

    setActiveTab(nextTab);
    tabRefs.current[index]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTabAtIndex((index + 1) % SETTINGS_TABS.length);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTabAtIndex((index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusTabAtIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusTabAtIndex(SETTINGS_TABS.length - 1);
    }
  };

  return (
    <AnimatePresence>
      {showSettings && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            onClick={toggleSettings}
          />

          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 w-[360px] overflow-y-auto overscroll-contain"
            style={{
              background: "var(--color-bg-secondary)",
              borderLeft: "1px solid rgba(122,162,255,0.15)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={panelTitleId}
            initial={prefersReducedMotion ? { opacity: 1 } : { x: 360 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { x: 360 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { type: "spring", damping: 25, stiffness: 300 }
            }
          >
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="space-y-2">
                  <h2 id={panelTitleId} className="text-lg font-bold" style={{ color: "var(--color-accent)" }}>
                    {t("settingsPanel.title")}
                  </h2>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
                    {t("settingsPanel.description")}
                  </p>
                </div>
                <Button
                  onClick={toggleSettings}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t("settingsPanel.close")}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>

              <div
                className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-background/35 p-1"
                role="tablist"
                aria-label={t("settingsPanel.sections")}
              >
                {SETTINGS_TABS.map((tab, index) => {
                  const isActive = activeTab === tab;

                  return (
                    <Button
                      key={tab}
                      ref={(node) => {
                        tabRefs.current[index] = node;
                      }}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      role="tab"
                      id={`settings-tab-${tab}`}
                      aria-selected={isActive}
                      aria-controls={`settings-tabpanel-${tab}`}
                      tabIndex={isActive ? 0 : -1}
                      className={isActive ? "justify-center" : "justify-center text-muted-foreground hover:text-foreground"}
                      onClick={() => setActiveTab(tab)}
                      onKeyDown={(event) => handleTabKeyDown(event, index)}
                    >
                      {t(`settingsPanel.${tab}`)}
                    </Button>
                  );
                })}
              </div>

              {activeTab === "general" && (
                <div role="tabpanel" id={activePanelId} aria-labelledby={activeTabId} className="space-y-5">
                  <section
                    className="rounded-xl border border-border/80 bg-card/55 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
                    aria-labelledby="language-title"
                  >
                    <div className="mb-4">
                      <p id="language-title" className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                        {t("language.label")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
                        {t("language.description")}
                      </p>
                    </div>

                    <label className="block">
                      <span className="sr-only">{t("language.label")}</span>
                      <select
                        value={locale}
                        onChange={(event) => {
                          const nextLocale = event.target.value;
                          if (APP_LOCALES.includes(nextLocale as (typeof APP_LOCALES)[number])) {
                            setLocale(nextLocale as (typeof APP_LOCALES)[number]);
                          }
                        }}
                        disabled={isChangingLocale}
                        className="w-full rounded-lg border border-border/80 bg-background/70 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-white/30"
                        style={{ color: "var(--color-text)" }}
                      >
                        {APP_LOCALES.map((candidate) => (
                          <option key={candidate} value={candidate}>
                            {t(`language.${candidate}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>

                  <section
                    className="rounded-xl border border-border/80 bg-card/55 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
                    aria-labelledby="chat-font-size-title"
                  >
                    <div className="mb-4">
                      <p id="chat-font-size-title" className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                        {t("settingsPanel.chatFontTitle")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
                        {t("settingsPanel.chatFontDescription")}
                      </p>
                    </div>

                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label
                          htmlFor={chatFontSizeId}
                          className="mb-1.5 block text-xs"
                          style={{ color: "var(--color-text-dim)" }}
                        >
                          {t("settingsPanel.chatFontLabel")}
                        </label>
                        <Input
                          id={chatFontSizeId}
                          name="chatFontSizePx"
                          autoComplete="off"
                          spellCheck={false}
                          type="number"
                          inputMode="numeric"
                          min={MIN_CHAT_FONT_SIZE_PX}
                          max={MAX_CHAT_FONT_SIZE_PX}
                          step={1}
                          value={chatFontSizeInput}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            if (/^\d*$/.test(nextValue)) {
                              setChatFontSizeInput(nextValue);
                            }
                          }}
                          onBlur={(event) => commitChatFontSize(event.currentTarget.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              commitChatFontSize(event.currentTarget.value);
                            }
                          }}
                          aria-describedby={chatFontSizeHelpId}
                          className="border-border bg-background/70 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="14…"
                        />
                      </div>
                      <span className="pb-3 text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        px
                      </span>
                    </div>

                    <p id={chatFontSizeHelpId} className="mt-2 text-xs" style={{ color: "var(--color-text-dim)" }}>
                      {t("settingsPanel.chatFontHelp", { min: MIN_CHAT_FONT_SIZE_PX, max: MAX_CHAT_FONT_SIZE_PX })}
                    </p>
                  </section>

                  <section
                    className="rounded-xl border border-border/70 bg-secondary/20 p-4"
                    aria-labelledby="tts-settings-title"
                  >
                    <label htmlFor="tts-autoplay" className="flex cursor-pointer items-start justify-between gap-4">
                      <div>
                        <p id="tts-settings-title" className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                          {t("settingsPanel.ttsAutoplayTitle")}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
                          {t("settingsPanel.ttsAutoplayDescription")}
                        </p>
                      </div>
                      <Switch
                        id="tts-autoplay"
                        checked={ttsAutoplay}
                        onCheckedChange={setTtsAutoplay}
                        aria-label={t("settingsPanel.ttsAutoplayAria")}
                      />
                    </label>
                  </section>
                </div>
              )}

              {activeTab === "gateway" && (
                <div role="tabpanel" id={activePanelId} aria-labelledby={activeTabId} className="space-y-5">
                  <section
                    className="rounded-xl border border-border/80 bg-card/55 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
                    aria-labelledby="gateway-connection-section-title"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p
                          id="gateway-connection-section-title"
                          className="text-sm font-semibold"
                          style={{ color: "var(--color-text)" }}
                        >
                          {t("settingsPanel.gatewayTitle")}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
                          {t("settingsPanel.gatewayDescription")}
                        </p>
                      </div>
                      <div
                        className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${connectionStatusTone}`}
                      >
                        {connectionLabel}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor={gatewayUrlId}
                          className="mb-1.5 block text-xs"
                          style={{ color: "var(--color-text-dim)" }}
                        >
                          {t("settingsPanel.gatewayUrl")}
                        </label>
                        <Input
                          id={gatewayUrlId}
                          name="gatewayUrl"
                          autoComplete="off"
                          type="url"
                          inputMode="url"
                          value={url}
                          onChange={(event) => setUrl(event.target.value)}
                          className="border-border bg-background/70"
                          placeholder="ws://localhost:18789…"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={gatewayTokenId}
                          className="mb-1.5 block text-xs"
                          style={{ color: "var(--color-text-dim)" }}
                        >
                          {t("settingsPanel.gatewayToken")}
                        </label>
                        <Input
                          id={gatewayTokenId}
                          name="gatewayToken"
                          autoComplete="off"
                          type="password"
                          value={token}
                          onChange={(event) => setToken(event.target.value)}
                          className="border-border bg-background/70"
                          placeholder={t("settingsPanel.gatewayTokenPlaceholder")}
                        />
                      </div>

                      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                              {t("settingsPanel.gatewayStatus")}
                            </p>
                            <p className="mt-1 text-xs" style={{ color: "var(--color-text-dim)" }}>
                              {connectionLabel}
                            </p>
                          </div>
                          <Button
                            onClick={handleConnect}
                            variant={connectionStatus === "connected" ? "destructiveSubtle" : "default"}
                            className="min-w-32"
                          >
                            {connectionStatus === "connected" ? t("settingsPanel.disconnect") : t("settingsPanel.connect")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {connectionCopy && (
                    <section
                      className="rounded-xl border border-destructive/25 bg-destructive/8 p-4"
                      aria-labelledby="gateway-issue-title"
                    >
                      <p id="gateway-issue-title" className="mb-2 text-sm font-semibold text-red-200">
                        {connectionCopy.title}
                      </p>
                      <p className="text-xs leading-relaxed text-white/82">{connectionCopy.description}</p>
                      {connectionCopy.commands.length > 0 && (
                        <div className="mt-3 space-y-1 text-xs text-white/76">
                          {connectionCopy.commands.map((command) => (
                            <p key={command}>
                              <code>{command}</code>
                            </p>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  <section
                    className="rounded-xl border border-border/70 bg-secondary/14 p-4 text-xs leading-relaxed"
                    style={{ color: "var(--color-text-dim)" }}
                    aria-labelledby="device-auth-title"
                  >
                    <p id="device-auth-title" className="mb-2 text-sm font-medium" style={{ color: "var(--color-text)" }}>
                      {t("settingsPanel.deviceAuthTitle")}
                    </p>
                    <p>
                      {t("settingsPanel.deviceAuthDescription")}
                    </p>
                    <p className="mt-1">
                      {t("settingsPanel.characterConfigPath")}: <code>~/.config/prettyclaw/characters.json</code>
                    </p>
                  </section>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
