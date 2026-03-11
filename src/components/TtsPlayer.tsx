"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/useAppStore";

export function TtsPlayer() {
  const pendingTts = useAppStore((s) => s.pendingTts);
  const ttsStopToken = useAppStore((s) => s.ttsStopToken);
  const lastRequestIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const stopCurrentPlayback = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => stopCurrentPlayback, []);

  useEffect(() => {
    if (ttsStopToken > 0) {
      stopCurrentPlayback();
    }
  }, [ttsStopToken]);

  useEffect(() => {
    if (!pendingTts || pendingTts.id === lastRequestIdRef.current) {
      return;
    }

    lastRequestIdRef.current = pendingTts.id;
    stopCurrentPlayback();

    const controller = new AbortController();
    controllerRef.current = controller;

    void (async () => {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            characterId: pendingTts.characterId,
            text: pendingTts.text,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.warn("TTS playback skipped:", response.status);
          return;
        }

        const blob = await response.blob();
        if (!blob.size || controller.signal.aborted) {
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;

        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        audio.onended = () => {
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          if (objectUrlRef.current === objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrlRef.current = null;
          }
        };

        await audio.play();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.warn("Failed to play TTS:", error);
      }
    })();
  }, [pendingTts]);

  return null;
}
