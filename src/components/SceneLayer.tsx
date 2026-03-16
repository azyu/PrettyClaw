"use client";

import { useEffect, useRef, useState } from "react";
/* eslint-disable @next/next/no-img-element */
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { CharacterSprite } from "@/components/CharacterSprite";
import { useAppStore } from "@/stores/useAppStore";

export function SceneLayer({
  isTallLayout = false,
  isCenteredStageLayout = false,
  backgroundFocusOffsetPx = 0,
}: {
  isTallLayout?: boolean;
  isCenteredStageLayout?: boolean;
  backgroundFocusOffsetPx?: number;
}) {
  const characters = useAppStore((s) => s.characters);
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const streamStates = useAppStore((s) => s.streamStates);
  const activeSessionKeys = useAppStore((s) => s.activeSessionKeys);
  const spriteStageRef = useRef<HTMLDivElement>(null);
  const [spriteStageSize, setSpriteStageSize] = useState({ width: 0, height: 0 });
  const t = useTranslations();

  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const sessionKey = activeCharacterId
    ? (activeSessionKeys.get(activeCharacterId) || activeChar?.sessionKey || null)
    : null;
  const isStreaming = sessionKey ? (streamStates.get(sessionKey)?.streaming ?? false) : false;
  const backgroundShiftPx = Math.max(0, Math.round(backgroundFocusOffsetPx / 2));

  useEffect(() => {
    const element = spriteStageRef.current;
    if (!element) return;

    const update = () => {
      setSpriteStageSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background — crossfade transition */}
      <AnimatePresence mode="wait">
        {activeChar && (
          <motion.div
            key={`bg-${activeChar.id}`}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <img
              src={activeChar.background}
              alt={t("common.backgroundAlt")}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                objectPosition: isTallLayout
                  ? `center calc(0% - ${backgroundShiftPx}px)`
                  : `center calc(50% - ${backgroundShiftPx}px)`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.35) 100%),
                  linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6) 100%)
                `,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character sprite — entrance/idle animation */}
      <div
        ref={spriteStageRef}
        className={`absolute inset-x-0 top-0 overflow-hidden ${
          isCenteredStageLayout
            ? "bottom-0 px-10 py-10"
            : isTallLayout
            ? "bottom-[250px] px-8 pt-10 md:bottom-[280px] md:px-10"
            : "bottom-[160px] px-6 pt-6 md:bottom-[180px] md:px-8 lg:bottom-[200px]"
        }`}
      >
        <AnimatePresence mode="wait">
          {activeChar && (
            <motion.div
              key={`sprite-${activeChar.id}`}
              className={`flex h-full w-full justify-center ${isCenteredStageLayout ? "items-center" : "items-end"}`}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{
                opacity: { duration: 0.4 },
                y: { duration: 0.4, ease: "easeOut" },
              }}
            >
              <motion.div
                className="relative"
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
              >
                <motion.div
                  className="absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl"
                  style={{ background: `${activeChar.theme.accent}15` }}
                  animate={isStreaming ? {
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <CharacterSprite
                  character={activeChar}
                  isStreaming={isStreaming}
                  availableSize={spriteStageSize}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
