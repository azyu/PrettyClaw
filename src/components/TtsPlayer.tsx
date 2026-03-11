"use client";

import { useEffect, useRef } from "react";
import { createTtsAudioCache } from "@/lib/tts-audio-cache";
import { useAppStore } from "@/stores/useAppStore";

export function TtsPlayer() {
  const pendingTts = useAppStore((s) => s.pendingTts);
  const setActiveTtsMessageId = useAppStore((s) => s.setActiveTtsMessageId);
  const setTtsMessagePlaybackState = useAppStore((s) => s.setTtsMessagePlaybackState);
  const ttsStopToken = useAppStore((s) => s.ttsStopToken);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef(createTtsAudioCache());
  const controllerRef = useRef<AbortController | null>(null);
  const latestPlaybackTokenRef = useRef(0);

  const stopCurrentPlayback = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setActiveTtsMessageId(null);
  };

  const playAudio = async (messageId: string, objectUrl: string, playbackToken: number) => {
    if (latestPlaybackTokenRef.current !== playbackToken) {
      return;
    }

    stopCurrentPlayback();
    if (latestPlaybackTokenRef.current !== playbackToken) {
      return;
    }

    const audio = new Audio(objectUrl);
    audioRef.current = audio;
    setActiveTtsMessageId(messageId);
    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      setActiveTtsMessageId(null);
    };

    try {
      await audio.play();
    } catch (error) {
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      setActiveTtsMessageId(null);
      throw error;
    }
  };

  useEffect(() => () => {
    stopCurrentPlayback();
    cacheRef.current.clear();
  }, []);

  useEffect(() => {
    if (ttsStopToken > 0) {
      stopCurrentPlayback();
    }
  }, [ttsStopToken]);

  useEffect(() => {
    if (!pendingTts) {
      return;
    }

    const request = pendingTts;
    latestPlaybackTokenRef.current = request.playbackToken;
    controllerRef.current?.abort();
    stopCurrentPlayback();

    const isCurrentRequest = () =>
      latestPlaybackTokenRef.current === request.playbackToken;

    const cachedEntry = cacheRef.current.get(request.id);
    if (cachedEntry) {
      void playAudio(request.id, cachedEntry.objectUrl, request.playbackToken).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.warn("Failed to replay cached TTS:", error);
      });
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setTtsMessagePlaybackState(request.id, "loading");

    void (async () => {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            characterId: request.characterId,
            text: request.text,
          }),
          signal: controller.signal,
        });

        if (!isCurrentRequest() || controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          setTtsMessagePlaybackState(request.id, "error");
          console.warn("TTS playback skipped:", response.status);
          return;
        }

        const blob = await response.blob();
        if (!blob.size || controller.signal.aborted || !isCurrentRequest()) {
          if (isCurrentRequest()) {
            setTtsMessagePlaybackState(request.id, null);
          }
          return;
        }

        const { objectUrl } = cacheRef.current.store(request.id, blob);
        if (!isCurrentRequest()) {
          return;
        }

        setTtsMessagePlaybackState(request.id, "ready");
        await playAudio(request.id, objectUrl, request.playbackToken);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (isCurrentRequest()) {
            setTtsMessagePlaybackState(request.id, cacheRef.current.get(request.id) ? "ready" : null);
          }
          return;
        }
        if (!isCurrentRequest()) {
          return;
        }

        setTtsMessagePlaybackState(request.id, "error");
        console.warn("Failed to play TTS:", error);
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    })();

    return () => {
      controller.abort();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [pendingTts, setActiveTtsMessageId, setTtsMessagePlaybackState]);

  return null;
}
