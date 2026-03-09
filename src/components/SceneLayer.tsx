"use client";

/* eslint-disable @next/next/no-img-element */
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";

export function SceneLayer() {
  const characters = useAppStore((s) => s.characters);
  const activeCharacterId = useAppStore((s) => s.activeCharacterId);
  const streamStates = useAppStore((s) => s.streamStates);
  const activeSessionKeys = useAppStore((s) => s.activeSessionKeys);

  const activeChar = characters.find((c) => c.id === activeCharacterId);
  const sessionKey = activeCharacterId
    ? (activeSessionKeys.get(activeCharacterId) || activeChar?.sessionKey || null)
    : null;
  const isStreaming = sessionKey ? (streamStates.get(sessionKey)?.streaming ?? false) : false;

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
              alt="background"
              className="absolute inset-0 w-full h-full object-cover"
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
      <AnimatePresence mode="wait">
        {activeChar && (
          <motion.div
            key={`sprite-${activeChar.id}`}
            className="absolute bottom-[200px] left-1/2"
            initial={{ opacity: 0, x: "-50%", y: 60 }}
            animate={{
              opacity: 1,
              x: "-50%",
              y: [0, -4, 0],
            }}
            exit={{ opacity: 0, x: "-50%", y: -30 }}
            transition={{
              opacity: { duration: 0.4 },
              x: { duration: 0 },
              y: {
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              },
            }}
          >
            <div className="relative" style={{ transform: `scale(${activeChar.spriteScale ?? 1})`, transformOrigin: "bottom center" }}>
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl"
                style={{ background: `${activeChar.theme.accent}15` }}
                animate={isStreaming ? {
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <img
                src={activeChar.sprite}
                alt={activeChar.displayName}
                style={{
                  filter: `drop-shadow(0 0 25px ${activeChar.theme.accent}25)`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
